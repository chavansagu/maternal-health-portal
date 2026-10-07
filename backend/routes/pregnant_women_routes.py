from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, timedelta
import pandas as pd
import io
import logging
import traceback

logger = logging.getLogger(__name__)

from database import get_db
from models import PregnantWoman, User, BulkUpload, Notification, WardSubcentreMapping, BlockSubcentreMapping, District, Block, Ward, SubCentre
from schemas import (
    PregnantWomanCreate, PregnantWomanResponse, PregnantWomanUpdate,
    PaginatedResponse
)
from auth import get_current_active_user
# from auth import hash_aadhaar, verify_aadhaar, mask_aadhaar
from sms_service import sms_service
from sms_templates import get_sms_template
from audit_utils import (
    get_client_info,
    get_entity_snapshot,
    log_create,
    log_update,
    log_bulk_action
)
from services.notification_service import NotificationService
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

router = APIRouter(prefix="/pregnant-women", tags=["Pregnant Women Management"])

def _auto_link_unmapped_ward(db: Session, ward_id: int, sub_centre_id: int) -> None:
    """Link a brand-new ward to the sub-centre when the ward has no mapping at all
    (neither ward_subcentre_mapping nor user_ward_mapping) and shares its block."""
    from models import UserWardMapping, Ward
    if not ward_id or not sub_centre_id:
        return
    ward = db.query(Ward).filter(Ward.id == ward_id).first()
    sub_centre = db.query(SubCentre).filter(SubCentre.id == sub_centre_id).first()
    if not ward or not sub_centre or ward.block_id != sub_centre.block_id:
        return
    if db.query(WardSubcentreMapping.id).filter(WardSubcentreMapping.ward_id == ward_id).first():
        return
    if db.query(UserWardMapping.id).filter(UserWardMapping.ward_id == ward_id).first():
        return
    db.add(WardSubcentreMapping(ward_id=ward_id, sub_centre_id=sub_centre_id))
    db.flush()


def _ward_belongs_to_sub_centre(db: Session, ward_id: int, sub_centre_id: int) -> bool:
    """True if the ward is served by the sub-centre.

    A ward can reach a sub-centre two ways:
      1. ward_subcentre_mapping (admin ward<->sub-centre setup), or
      2. user_ward_mapping of a sub-centre user of that sub-centre (wards assigned
         when creating/updating the ANM user).
    Wards added later through the user-update flow only exist in (2), and a ward may
    map to several sub-centres, so we must check for ANY matching row rather than
    only the first ward_subcentre_mapping row.
    """
    from models import UserWardMapping
    if not ward_id or not sub_centre_id:
        return False
    if db.query(WardSubcentreMapping.id).filter(
        WardSubcentreMapping.ward_id == ward_id,
        WardSubcentreMapping.sub_centre_id == sub_centre_id,
    ).first():
        return True
    return db.query(UserWardMapping.id).join(
        User, User.id == UserWardMapping.user_id
    ).filter(
        UserWardMapping.ward_id == ward_id,
        User.sub_centre_id == sub_centre_id,
        User.role == "sub_centre",
    ).first() is not None


@router.post("/", response_model=PregnantWomanResponse, status_code=status.HTTP_201_CREATED)
async def register_pregnant_woman(
    pw_data: PregnantWomanCreate,
    background_tasks: BackgroundTasks,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Register a new pregnant woman (by District/Block admin staff or Sub-centre ANM)
    """
    if current_user.role not in ("district", "block", "sub_centre"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only District, Block, or Sub-Centre (ANM) users can register a pregnant woman"
        )

    # Scope the location fields to what the logged-in user is actually allowed
    # to register under. We never trust the client's district/block/sub-centre
    # values blindly — each role is confined to its own jurisdiction so one
    # user can't attach a record to a different district/block/sub-centre.
    if current_user.role == "sub_centre":
        # A Sub-Centre (ANM) user can only register under their own assigned
        # district/block/sub-centre — force it, ignore whatever was sent.
        if not current_user.sub_centre_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Your account is not assigned to a Sub-Centre. Contact your administrator."
            )
        pw_data.district_id = current_user.district_id
        pw_data.block_id = current_user.block_id
        pw_data.sub_centre_id = current_user.sub_centre_id

    elif current_user.role == "block":
        # A Block user can only register under their own assigned district/
        # block, but may pick any sub-centre that belongs to that block.
        if not current_user.block_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Your account is not assigned to a Block. Contact your administrator."
            )
        pw_data.district_id = current_user.district_id
        pw_data.block_id = current_user.block_id
        if not pw_data.sub_centre_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sub-Centre is required"
            )
        sub_centre = db.query(SubCentre).filter(SubCentre.id == pw_data.sub_centre_id).first()
        if not sub_centre or sub_centre.block_id != current_user.block_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected Sub-Centre does not belong to your Block"
            )

    elif current_user.role == "district":
        # A District user can only register under their own assigned district,
        # but may pick any block/sub-centre that belongs to that district.
        if not current_user.district_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Your account is not assigned to a District. Contact your administrator."
            )
        pw_data.district_id = current_user.district_id
        if not pw_data.block_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Block is required"
            )
        block = db.query(Block).filter(Block.id == pw_data.block_id).first()
        if not block or block.district_id != current_user.district_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected Block does not belong to your District"
            )
        if not pw_data.sub_centre_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sub-Centre is required"
            )
        sub_centre = db.query(SubCentre).filter(SubCentre.id == pw_data.sub_centre_id).first()
        if not sub_centre or sub_centre.block_id != pw_data.block_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected Sub-Centre does not belong to the selected Block"
            )

    if pw_data.ward_id:
        if not _ward_belongs_to_sub_centre(db, pw_data.ward_id, pw_data.sub_centre_id):
            # A newly created ward has no sub-centre link yet (ward creation only stores
            # block_id). If the ward is in the same block as the sub-centre and is not
            # served by ANY sub-centre yet, link it now instead of rejecting.
            _auto_link_unmapped_ward(db, pw_data.ward_id, pw_data.sub_centre_id)
        if not _ward_belongs_to_sub_centre(db, pw_data.ward_id, pw_data.sub_centre_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected Village/Ward does not belong to the selected Sub-Centre"
            )

    # Check for duplicates using ABHA ID or Mobile Number
    if pw_data.abha_id:
        existing_pw = db.query(PregnantWoman).filter(
            PregnantWoman.abha_id == pw_data.abha_id
        ).first()
        if existing_pw:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Pregnant woman with this ABHA ID already exists"
            )
    
    # Aadhaar check disabled for current release
    # if pw_data.aadhaar_number:
    #     existing_pw = db.query(PregnantWoman).filter(
    #         PregnantWoman.aadhaar_number == hash_aadhaar(pw_data.aadhaar_number)
    #     ).first()
    #     if existing_pw:
    #         raise HTTPException(
    #             status_code=status.HTTP_400_BAD_REQUEST,
    #             detail="Pregnant woman with this Aadhaar number already exists"
    #         )
    
    existing_mobile = db.query(PregnantWoman).filter(
        PregnantWoman.mobile_number == pw_data.mobile_number
    ).first()
    if existing_mobile and existing_mobile.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pregnant woman with this mobile number already exists"
        )

    # Age validation — must be at least 15
    age_to_check = None
    if pw_data.date_of_birth:
        from datetime import date
        today = date.today()
        b = pw_data.date_of_birth
        age_to_check = today.year - b.year - ((today.month, today.day) < (b.month, b.day))
    elif pw_data.age:
        age_to_check = pw_data.age
    if age_to_check is not None and age_to_check < 15:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pregnant woman must be at least 15 years old"
        )
    
    # Aadhaar data is currently disabled; keep any provided values out of storage
    data_dict = pw_data.dict()
    # if data_dict.get('aadhaar_number'):
    #     raw_aadhaar = data_dict['aadhaar_number']
    #     data_dict['aadhaar_number'] = hash_aadhaar(raw_aadhaar)
    #     data_dict['aadhaar_masked'] = mask_aadhaar(raw_aadhaar)
    # data_dict['aadhaar_number'] = None
    # data_dict['aadhaar_masked'] = None
    # Convert ward_id = 0 to None
    if data_dict.get('ward_id') == 0:
        data_dict['ward_id'] = None
    
    if not pw_data.sub_centre_id:
        # Priority 1: If ward_id provided, use ward-to-subcentre mapping
        if data_dict.get('ward_id'):
            ward_mapping = db.query(WardSubcentreMapping).filter(
                WardSubcentreMapping.ward_id == data_dict['ward_id']
            ).first()
            
            if ward_mapping:
                data_dict['sub_centre_id'] = ward_mapping.sub_centre_id
        
        # Priority 2: If no ward but block_id provided, use block-to-subcentre mapping
        elif pw_data.block_id:
            block_mapping = db.query(BlockSubcentreMapping).filter(
                BlockSubcentreMapping.block_id == pw_data.block_id
            ).first()
            
            if block_mapping:
                data_dict['sub_centre_id'] = block_mapping.sub_centre_id
    
    # Create new pregnant woman record
    new_pw = PregnantWoman(
        **data_dict,
        registered_by=current_user.id,
        registration_approved=True  # Auto-approved when registered by staff
    )
    
    db.add(new_pw)
    db.commit()
    db.refresh(new_pw)

    # Append EDD history if EDD was set at registration
    if new_pw.edd_date:
        from models import EDDHistory
        db.add(EDDHistory(
            pregnant_woman_id=new_pw.id,
            previous_edd=None,
            new_edd=new_pw.edd_date,
            source="LMP",
            changed_by=current_user.id,
        ))
        db.commit()

    ip_address, user_agent = get_client_info(request)
    log_create(
        db,
        current_user.id,
        "PregnantWoman",
        new_pw.id,
        get_entity_snapshot(new_pw),
        ip_address,
        user_agent
    )
    
    # Send registration confirmation SMS
    _sms = get_sms_template("pregnancy_registration")
    background_tasks.add_task(
        sms_service.send_sms,
        mobile_number=new_pw.mobile_number,
        message=_sms["message"],
        message_type="pregnancy_registration",
        pregnant_woman_id=new_pw.id,
        db=db,
        template_id=_sms["template_id"]
    )
    
    return new_pw

@router.get("/", response_model=dict)
async def get_pregnant_women(
    skip: int = 0,
    limit: int = 25,
    district_id: Optional[int] = None,
    block_id: Optional[int] = None,
    sub_centre_id: Optional[int] = None,
    is_high_risk: Optional[bool] = None,
    is_active: Optional[bool] = True,
    is_self_registered: Optional[bool] = None,
    registration_approved: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get list of pregnant women with filters + search + total count.
    Returns: { data: [...], total: int }
    """
    from sqlalchemy import or_
    query = db.query(PregnantWoman)

    # Role-based filters
    if current_user.role == "district":
        query = query.filter(PregnantWoman.district_id == current_user.district_id)
    elif current_user.role == "block":
        query = query.filter(PregnantWoman.block_id == current_user.block_id)
    elif current_user.role == "pmsma":
        # PMSMA staff only ever act on women within their own block (matches
        # the block-level scoping already used by /pmsma-sessions/queue etc.)
        query = query.filter(PregnantWoman.block_id == current_user.block_id)
    elif current_user.role == "usg_centre":
        # USG-Centre staff should only see women who already have a USG
        # appointment booked at their own centre — never the full statewide
        # list of beneficiaries.
        from models import USGAppointment
        centre_pw_ids = db.query(USGAppointment.pregnant_woman_id).filter(
            USGAppointment.usg_centre_id == current_user.usg_centre_id
        ).distinct().subquery()
        query = query.filter(PregnantWoman.id.in_(centre_pw_ids))
    elif current_user.role == "sub_centre":
        from models import UserWardMapping
        user_wards = db.query(UserWardMapping.ward_id).filter(
            UserWardMapping.user_id == current_user.id
        ).all()
        if user_wards:
            ward_ids = [w.ward_id for w in user_wards]
            query = query.filter(PregnantWoman.ward_id.in_(ward_ids))
        else:
            from models import WardSubcentreMapping
            mapped_ward_ids = db.query(WardSubcentreMapping.ward_id).filter(
                WardSubcentreMapping.sub_centre_id == current_user.sub_centre_id
            ).subquery()
            query = query.filter(
                (PregnantWoman.ward_id.in_(mapped_ward_ids)) |
                (PregnantWoman.sub_centre_id == current_user.sub_centre_id)
            )

    # Additional filters
    if district_id:
        query = query.filter(PregnantWoman.district_id == district_id)
    if block_id:
        query = query.filter(PregnantWoman.block_id == block_id)
    if sub_centre_id:
        query = query.filter(PregnantWoman.sub_centre_id == sub_centre_id)
    if is_high_risk is not None:
        query = query.filter(PregnantWoman.is_high_risk == is_high_risk)
    if is_active is not None:
        query = query.filter(PregnantWoman.is_active == is_active)
    if is_self_registered is not None:
        query = query.filter(PregnantWoman.is_self_registered == is_self_registered)
    if registration_approved is not None:
        query = query.filter(PregnantWoman.registration_approved == registration_approved)

    # Backend search — name, mobile, rch_id, abha_id
    if search and search.strip():
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                PregnantWoman.full_name.ilike(s),
                PregnantWoman.mobile_number.ilike(s),
                PregnantWoman.rch_id.ilike(s),
                PregnantWoman.abha_id.ilike(s),
            )
        )

    total = query.count()
    data = query.order_by(PregnantWoman.created_at.desc()).offset(skip).limit(limit).all()

    return {"data": [dict(
        id=pw.id,
        full_name=pw.full_name,
        mobile_number=pw.mobile_number,
        abha_id=pw.abha_id,
        rch_id=pw.rch_id,
        husband_name=pw.husband_name,
        date_of_birth=pw.date_of_birth,
        age=pw.age,
        address=pw.address,
        ward_id=pw.ward_id,
        block_id=pw.block_id,
        district_id=pw.district_id,
        sub_centre_id=pw.sub_centre_id,
        lmp_date=pw.lmp_date,
        edd_date=pw.edd_date,
        gravida=pw.gravida,
        para=pw.para,
        hpr_id=pw.hpr_id,
        blood_group=pw.blood_group,
        is_high_risk=pw.is_high_risk,
        risk_factors=pw.risk_factors,
        is_self_registered=pw.is_self_registered,
        registration_approved=pw.registration_approved,
        is_active=pw.is_active,
        pregnancy_outcome=pw.pregnancy_outcome,
        outcome_date=pw.outcome_date,
        pregnancy_registration_date=pw.pregnancy_registration_date,
        created_at=pw.created_at,
        updated_at=pw.updated_at,
    ) for pw in data], "total": total}

@router.get("/pending-approval", response_model=dict)
async def get_pending_approvals(
    skip: int = 0,
    limit: int = 25,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get self-registered pregnant women pending approval
    """
    from sqlalchemy import or_
    query = db.query(PregnantWoman).filter(
        PregnantWoman.is_self_registered == True,
        PregnantWoman.registration_approved == False
    )

    if current_user.role == "district":
        query = query.filter(PregnantWoman.district_id == current_user.district_id)
    elif current_user.role == "block":
        query = query.filter(PregnantWoman.block_id == current_user.block_id)
    elif current_user.role == "pmsma":
        query = query.filter(PregnantWoman.block_id == current_user.block_id)
    elif current_user.role == "usg_centre":
        from models import USGAppointment
        centre_pw_ids = db.query(USGAppointment.pregnant_woman_id).filter(
            USGAppointment.usg_centre_id == current_user.usg_centre_id
        ).distinct().subquery()
        query = query.filter(PregnantWoman.id.in_(centre_pw_ids))
    elif current_user.role == "sub_centre":
        from models import UserWardMapping
        user_wards = db.query(UserWardMapping.ward_id).filter(
            UserWardMapping.user_id == current_user.id
        ).all()
        if user_wards:
            ward_ids = [w.ward_id for w in user_wards]
            query = query.filter(PregnantWoman.ward_id.in_(ward_ids))
        else:
            from models import WardSubcentreMapping
            mapped_ward_ids = db.query(WardSubcentreMapping.ward_id).filter(
                WardSubcentreMapping.sub_centre_id == current_user.sub_centre_id
            ).subquery()
            query = query.filter(
                (PregnantWoman.ward_id.in_(mapped_ward_ids)) |
                (PregnantWoman.sub_centre_id == current_user.sub_centre_id)
            )

    if search and search.strip():
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                PregnantWoman.full_name.ilike(s),
                PregnantWoman.mobile_number.ilike(s),
                PregnantWoman.rch_id.ilike(s),
                PregnantWoman.abha_id.ilike(s),
            )
        )

    total = query.count()
    data = query.order_by(PregnantWoman.created_at.desc()).offset(skip).limit(limit).all()
    return {"data": [dict(
        id=pw.id,
        full_name=pw.full_name,
        mobile_number=pw.mobile_number,
        abha_id=pw.abha_id,
        rch_id=pw.rch_id,
        husband_name=pw.husband_name,
        date_of_birth=pw.date_of_birth,
        age=pw.age,
        address=pw.address,
        ward_id=pw.ward_id,
        block_id=pw.block_id,
        district_id=pw.district_id,
        sub_centre_id=pw.sub_centre_id,
        lmp_date=pw.lmp_date,
        edd_date=pw.edd_date,
        gravida=pw.gravida,
        para=pw.para,
        hpr_id=pw.hpr_id,
        blood_group=pw.blood_group,
        is_high_risk=pw.is_high_risk,
        risk_factors=pw.risk_factors,
        is_self_registered=pw.is_self_registered,
        registration_approved=pw.registration_approved,
        is_active=pw.is_active,
        pregnancy_outcome=pw.pregnancy_outcome,
        outcome_date=pw.outcome_date,
        pregnancy_registration_date=pw.pregnancy_registration_date,
        created_at=pw.created_at,
        updated_at=pw.updated_at,
    ) for pw in data], "total": total}

@router.get("/{pw_id}", response_model=PregnantWomanResponse)
async def get_pregnant_woman(
    pw_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get pregnant woman details by ID
    """
    pw = db.query(PregnantWoman).filter(PregnantWoman.id == pw_id).first()
    if not pw:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pregnant woman not found"
        )
    
    return pw

@router.put("/{pw_id}", response_model=PregnantWomanResponse)
async def update_pregnant_woman(
    pw_id: int,
    pw_update: PregnantWomanUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update pregnant woman information
    """
    pw = db.query(PregnantWoman).filter(PregnantWoman.id == pw_id).first()
    if not pw:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pregnant woman not found"
        )
    
    # Update fields
    old_values = get_entity_snapshot(pw)
    update_data = pw_update.dict(exclude_unset=True)
    # EDD is not writable via this endpoint — only via registration (LMP) or USG complete
    update_data.pop("edd_date", None)
    
    # Capture high-risk flag before applying updates
    was_high_risk = pw.is_high_risk
    
    for field, value in update_data.items():
        setattr(pw, field, value)
    
    pw.updated_at = datetime.now()
    
    # Check if marked as high-risk and send SMS
    if pw_update.is_high_risk and not was_high_risk:
        # Send high-risk alert notification
        recipients = NotificationService.get_recipients_for_event(
            db,
            "high_risk_alert",
            {
                "district_id": pw.district_id,
                "block_id": pw.block_id,
                "sub_centre_id": pw.sub_centre_id
            }
        )
        
        if recipients:
            NotificationService.create_notification(
                db=db,
                user_ids=recipients,
                title="⚠️ High-Risk Case Identified",
                message=f"{pw.full_name} has been marked as high-risk. Immediate attention required.",
                notification_type="high_risk_alert",
                category="registration",
                priority="high",
                reference_id=pw.id,
                reference_type="pregnant_woman",
                action_url=f"/pregnant-women/{pw.id}",
                metadata={"pregnant_woman_name": pw.full_name, "risk_factors": pw.risk_factors}
            )
        
        _sms = get_sms_template("high_risk_alert")
        # Use background task if available, otherwise send directly
        try:
            await sms_service.send_sms(
                mobile_number=pw.mobile_number,
                message=_sms["message"],
                message_type="high_risk_alert",
                pregnant_woman_id=pw.id,
                db=db,
                template_id=_sms["template_id"]
            )
        except:
            pass  # SMS sending is optional
    
    db.commit()
    db.refresh(pw)

    ip_address, user_agent = get_client_info(request)
    log_update(
        db,
        current_user.id,
        "PregnantWoman",
        pw.id,
        old_values,
        get_entity_snapshot(pw),
        ip_address,
        user_agent
    )
    
    return pw

@router.post("/{pw_id}/approve")
async def approve_registration(
    pw_id: int,
    background_tasks: BackgroundTasks,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Approve self-registered pregnant woman.
    Idempotent: calling again on an already-approved PW returns success without
    repeating side effects (SMS, notification, audit log).
    """
    pw = db.query(PregnantWoman).filter(PregnantWoman.id == pw_id).first()
    if not pw:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pregnant woman not found"
        )

    if not pw.is_self_registered:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This record was not self-registered"
        )

    # Idempotency guard — already approved, return success without side effects
    if pw.registration_approved:
        return {"message": "Registration already approved", "already_approved": True}

    # Rejected PW cannot be approved — must be re-activated first
    if not pw.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot approve an inactive (rejected) registration. Please re-activate the record first."
        )

    old_values = get_entity_snapshot(pw)
    pw.registration_approved = True
    pw.registered_by = current_user.id
    db.commit()

    ip_address, user_agent = get_client_info(request)
    log_update(
        db,
        current_user.id,
        "PregnantWoman",
        pw.id,
        old_values,
        get_entity_snapshot(pw),
        ip_address,
        user_agent
    )

    NotificationService.create_notification(
        db=db,
        user_ids=[current_user.id],
        title="Registration Approved",
        message=f"Registration for {pw.full_name} has been approved",
        notification_type="registration_approved",
        category="registration",
        priority="normal",
        reference_id=pw.id,
        reference_type="pregnant_woman",
        action_url=f"/pregnant-women/{pw.id}",
        metadata={"pregnant_woman_name": pw.full_name}
    )

    _sms = get_sms_template("pregnancy_registration")
    background_tasks.add_task(
        sms_service.send_sms,
        mobile_number=pw.mobile_number,
        message=_sms["message"],
        message_type="pregnancy_registration",
        pregnant_woman_id=pw.id,
        db=db,
        template_id=_sms["template_id"]
    )

    return {"message": "Registration approved successfully", "already_approved": False}

@router.post("/{pw_id}/reject")
async def reject_registration(
    pw_id: int,
    rejection_reason: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Reject self-registered pregnant woman
    """
    pw = db.query(PregnantWoman).filter(PregnantWoman.id == pw_id).first()
    if not pw:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pregnant woman not found"
        )
    
    if not pw.is_self_registered:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This record was not self-registered"
        )
    
    old_values = get_entity_snapshot(pw)
    pw.is_active = False  # Deactivate rejected registration
    db.commit()

    ip_address, user_agent = get_client_info(request)
    log_update(
        db,
        current_user.id,
        "PregnantWoman",
        pw.id,
        old_values,
        get_entity_snapshot(pw),
        ip_address,
        user_agent
    )
    
    # Send rejection notification
    NotificationService.create_notification(
        db=db,
        user_ids=[current_user.id],  # Notify the rejector
        title="Registration Rejected",
        message=f"Registration for {pw.full_name} has been rejected. Reason: {rejection_reason}",
        notification_type="registration_rejected",
        category="registration",
        priority="normal",
        reference_id=pw.id,
        reference_type="pregnant_woman",
        action_url=f"/pregnant-women/{pw.id}",
        metadata={"pregnant_woman_name": pw.full_name, "rejection_reason": rejection_reason}
    )
    
    return {"message": "Registration rejected successfully"}

# ==================== HELPER FUNCTIONS FOR BULK UPLOAD ====================

BULK_MAX_FILE_BYTES = 10 * 1024 * 1024   # 10 MB
BULK_MAX_ROWS = 5000
BULK_VALID_BLOOD_GROUPS = {"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"}

# Human-readable template header (and DB field name) -> internal field name.
# Matching is case-insensitive and ignores extra spaces / underscores.
BULK_COLUMN_MAP = {
    "Full Name": "full_name",
    "Mobile Number": "mobile_number",
    "ABHA ID": "abha_id",
    "RCH ID": "rch_id",
    "Husband Name": "husband_name",
    "Age": "age",
    "District Name": "district_name",
    "Block Name": "block_name",
    "Ward Name": "ward_name",
    "Sub Centre Name": "sub_centre_name",
    "Date of Birth": "date_of_birth",
    "LMP Date": "lmp_date",
    "EDD Date": "edd_date",
    "Gravida": "gravida",
    "Para": "para",
    "Blood Group": "blood_group",
    "Address": "address",
    "HPR ID": "hpr_id",
    # optional legacy ID columns (validated against the user's jurisdiction)
    "District ID": "district_id",
    "Block ID": "block_id",
    "Ward ID": "ward_id",
    "Sub Centre ID": "sub_centre_id",
}
BULK_REQUIRED_COLUMNS = ["full_name", "mobile_number"]


def _norm_header(h) -> str:
    return "".join(ch for ch in str(h).lower() if ch.isalnum())


_BULK_HEADER_LOOKUP = {}
for _human, _field in BULK_COLUMN_MAP.items():
    _BULK_HEADER_LOOKUP[_norm_header(_human)] = _field
    _BULK_HEADER_LOOKUP[_norm_header(_field)] = _field


class _RowFailed(Exception):
    """Row rejected with a user-facing reason."""


class _RowDuplicate(Exception):
    """Row already exists in the system."""


def _clean_str(value):
    """Return stripped string, or None for empty / NaN values."""
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    s = str(value).strip()
    if not s or s.lower() in ("nan", "nat", "none"):
        return None
    return s


def _clean_id(value):
    """Clean an identifier read from Excel (removes a trailing '.0' from numeric cells)."""
    s = _clean_str(value)
    if s and s.endswith(".0") and s[:-2].isdigit():
        s = s[:-2]
    return s


def _normalize_mobile(value):
    """Return a 10-digit mobile number or raise ValueError."""
    s = _clean_id(value)
    if not s:
        raise ValueError("Mobile number is required")
    digits = "".join(ch for ch in s if ch.isdigit())
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    if len(digits) != 10:
        raise ValueError(f"Invalid mobile number '{s}'. Must be 10 digits")
    return digits


def _parse_date_field(value):
    """
    Safely convert an Excel date value to a Python date.
    Accepts datetime/date objects or strings (YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, ...).
    Returns None if empty. Raises ValueError if present but unparseable.
    """
    from datetime import date as _date

    s = _clean_str(value)
    if s is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, _date):
        return value
    for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y', '%Y/%m/%d', '%d.%m.%Y'):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Invalid date format: '{s}'. Expected YYYY-MM-DD or DD-MM-YYYY.")


def _parse_int_field(value, field_name):
    """Safely convert an Excel numeric value to int. Returns None if empty."""
    s = _clean_str(value)
    if s is None:
        return None
    try:
        f = float(s)
    except (ValueError, TypeError):
        raise ValueError(f"Invalid value for '{field_name}': '{s}'. Must be a whole number.")
    if not f.is_integer():
        raise ValueError(f"'{field_name}' must be a whole number, got: '{s}'")
    return int(f)


def _mask_mobile(m) -> str:
    m = str(m or "")
    return ("*" * max(len(m) - 4, 0)) + m[-4:]


def lookup_entity_by_name(db: Session, entity_model, name: str, filter_conditions: dict = None, cache: dict = None):
    """Case-insensitive lookup of an entity by name (optionally cached per upload)."""
    name = _clean_str(name)
    if not name:
        return None

    key = None
    if cache is not None:
        key = (entity_model.__name__, name.lower(), tuple(sorted((filter_conditions or {}).items())))
        if key in cache:
            return cache[key]

    query = db.query(entity_model).filter(func.lower(entity_model.name) == name.lower())
    for field, value in (filter_conditions or {}).items():
        query = query.filter(getattr(entity_model, field) == value)
    entity = query.first()

    if cache is not None:
        cache[key] = entity
    return entity


def _get_by_id(db: Session, entity_model, entity_id, cache: dict = None):
    if cache is not None:
        key = (entity_model.__name__, "id", entity_id)
        if key not in cache:
            cache[key] = db.query(entity_model).filter(entity_model.id == entity_id).first()
        return cache[key]
    return db.query(entity_model).filter(entity_model.id == entity_id).first()


def _get_user_scope(db: Session, current_user: User) -> dict:
    """The district / block the logged-in user is allowed to upload into."""
    district_id = current_user.district_id
    block_id = current_user.block_id if current_user.role == "block" else None
    if block_id and not district_id:
        blk = db.query(Block).filter(Block.id == block_id).first()
        district_id = blk.district_id if blk else None
    return {"district_id": district_id, "block_id": block_id}


def resolve_administrative_ids(db: Session, row: pd.Series, current_user: User, scope: dict = None, cache: dict = None):
    """
    Resolve district / block / ward / sub-centre (by name, or by ID for legacy sheets)
    and make sure everything lies inside the uploader's jurisdiction and is consistent
    (ward and sub-centre must belong to the resolved block, block to the district).
    Returns a dict with resolved IDs and a list of errors.
    """
    scope = scope or _get_user_scope(db, current_user)
    result = {"district_id": None, "block_id": None, "ward_id": None, "sub_centre_id": None, "errors": []}

    # ---------- 1. DISTRICT ----------
    district_name = _clean_str(row.get('district_name'))
    try:
        district_id_in = _parse_int_field(row.get('district_id'), 'district_id')
    except ValueError as e:
        result["errors"].append(str(e))
        return result

    if district_name:
        district = lookup_entity_by_name(db, District, district_name, cache=cache)
        if not district:
            result["errors"].append(f"District '{district_name}' not found in system")
            return result
        result["district_id"] = district.id
    elif district_id_in:
        if not _get_by_id(db, District, district_id_in, cache):
            result["errors"].append(f"District ID {district_id_in} not found in system")
            return result
        result["district_id"] = district_id_in
    else:
        result["district_id"] = scope["district_id"]

    if scope["district_id"] and result["district_id"] and result["district_id"] != scope["district_id"]:
        result["errors"].append("District does not match your assigned district")
        return result

    # ---------- 2. BLOCK ----------
    block_name = _clean_str(row.get('block_name'))
    try:
        block_id_in = _parse_int_field(row.get('block_id'), 'block_id')
    except ValueError as e:
        result["errors"].append(str(e))
        return result

    if block_name:
        block = lookup_entity_by_name(
            db, Block, block_name,
            {"district_id": result["district_id"]} if result["district_id"] else None,
            cache=cache,
        )
        if not block:
            result["errors"].append(f"Block '{block_name}' not found in district")
            return result
        result["block_id"] = block.id
    elif block_id_in:
        block = _get_by_id(db, Block, block_id_in, cache)
        if not block or (result["district_id"] and block.district_id != result["district_id"]):
            result["errors"].append(f"Block ID {block_id_in} not found in district")
            return result
        result["block_id"] = block.id
    elif scope["block_id"]:
        result["block_id"] = scope["block_id"]

    if scope["block_id"] and result["block_id"] and result["block_id"] != scope["block_id"]:
        result["errors"].append("Block does not match your assigned block")
        return result

    # ---------- 3. WARD ----------
    ward_name = _clean_str(row.get('ward_name'))
    try:
        ward_id_in = _parse_int_field(row.get('ward_id'), 'ward_id')
    except ValueError as e:
        result["errors"].append(str(e))
        return result

    if ward_name:
        ward = lookup_entity_by_name(
            db, Ward, ward_name,
            {"block_id": result["block_id"]} if result["block_id"] else None,
            cache=cache,
        )
        if not ward:
            result["errors"].append(f"Ward '{ward_name}' not found in block")
            return result
        result["ward_id"] = ward.id
    elif ward_id_in:  # 0 / empty means no ward
        ward = _get_by_id(db, Ward, ward_id_in, cache)
        if not ward or (result["block_id"] and ward.block_id != result["block_id"]):
            result["errors"].append(f"Ward ID {ward_id_in} not found in block")
            return result
        result["ward_id"] = ward.id

    # ---------- 4. SUB-CENTRE (optional here, auto-assigned by caller if missing) ----------
    sc_name = _clean_str(row.get('sub_centre_name'))
    try:
        sc_id_in = _parse_int_field(row.get('sub_centre_id'), 'sub_centre_id')
    except ValueError as e:
        result["errors"].append(str(e))
        return result

    if sc_name:
        sc = lookup_entity_by_name(
            db, SubCentre, sc_name,
            {"block_id": result["block_id"]} if result["block_id"] else None,
            cache=cache,
        )
        if not sc:
            result["errors"].append(f"Sub-Centre '{sc_name}' not found in block")
            return result
        result["sub_centre_id"] = sc.id
    elif sc_id_in:
        sc = _get_by_id(db, SubCentre, sc_id_in, cache)
        if not sc or (result["block_id"] and sc.block_id != result["block_id"]):
            result["errors"].append(f"Sub-Centre ID {sc_id_in} not found in block")
            return result
        result["sub_centre_id"] = sc.id

    return result

# ==================== END HELPER FUNCTIONS ====================


def _process_bulk_row(db, row, current_user, scope, cache):
    """
    Validate one row and insert it inside a SAVEPOINT.
    Raises _RowFailed / _RowDuplicate on rejection. Returns nothing on success.
    """
    from models import EDDHistory

    # ---- Basic fields ----
    full_name = _clean_str(row.get('full_name'))
    if not full_name:
        raise _RowFailed("Full Name is required")
    if len(full_name) > 255:
        raise _RowFailed("Full Name is too long (max 255 characters)")

    try:
        mobile = _normalize_mobile(row.get('mobile_number'))
    except ValueError as e:
        raise _RowFailed(str(e))

    abha_id = _clean_id(row.get('abha_id'))
    rch_id = _clean_id(row.get('rch_id'))
    hpr_id = _clean_id(row.get('hpr_id'))
    for label, val in (("ABHA ID", abha_id), ("RCH ID", rch_id)):
        if val and len(val) > 50:
            raise _RowFailed(f"{label} is too long (max 50 characters)")

    blood_group = _clean_str(row.get('blood_group'))
    if blood_group:
        blood_group = blood_group.upper().replace(" ", "")
        if blood_group not in BULK_VALID_BLOOD_GROUPS:
            raise _RowFailed(f"Invalid blood group '{blood_group}'")

    # ---- Dates / numbers (parsed BEFORE any validation that uses them) ----
    try:
        dob = _parse_date_field(row.get('date_of_birth'))
        lmp = _parse_date_field(row.get('lmp_date'))
        edd = _parse_date_field(row.get('edd_date'))
        gravida_val = _parse_int_field(row.get('gravida'), 'gravida')
        para_val = _parse_int_field(row.get('para'), 'para')
        age_in = _parse_int_field(row.get('age'), 'age')
    except ValueError as e:
        raise _RowFailed(str(e))

    today = date.today()
    if dob and dob > today:
        raise _RowFailed("Date of Birth cannot be in the future")
    if lmp and lmp > today:
        raise _RowFailed("LMP Date cannot be in the future")
    if lmp and not edd:
        edd = lmp + timedelta(days=280)   # Naegele's rule
    if lmp and edd and edd <= lmp:
        raise _RowFailed("EDD Date must be after LMP Date")
    if gravida_val is not None and gravida_val < 0:
        raise _RowFailed("Gravida cannot be negative")
    if para_val is not None and para_val < 0:
        raise _RowFailed("Para cannot be negative")
    if gravida_val is not None and para_val is not None and para_val > gravida_val:
        raise _RowFailed(f"Para ({para_val}) cannot be greater than Gravida ({gravida_val})")

    # ---- Age (DOB wins over the Age column) ----
    if dob:
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    else:
        age = age_in
    if age is not None and age < 15:
        raise _RowFailed(f"Age must be at least 15 years (found: {age})")
    if age is not None and age > 60:
        raise _RowFailed(f"Age {age} looks invalid (max 60)")

    # ---- Duplicate check (ABHA / RCH / mobile) ----
    if abha_id and db.query(PregnantWoman.id).filter(PregnantWoman.abha_id == abha_id).first():
        raise _RowDuplicate("Already registered (duplicate ABHA ID)")
    if rch_id and db.query(PregnantWoman.id).filter(PregnantWoman.rch_id == rch_id).first():
        raise _RowDuplicate("Already registered (duplicate RCH ID)")
    if db.query(PregnantWoman.id).filter(PregnantWoman.mobile_number == mobile).first():
        raise _RowDuplicate("Already registered (duplicate Mobile)")

    # ---- Administrative resolution + jurisdiction checks ----
    resolved = resolve_administrative_ids(db, row, current_user, scope, cache)
    if resolved["errors"]:
        raise _RowFailed(", ".join(resolved["errors"]))
    if not resolved["district_id"]:
        raise _RowFailed("District is required but not provided or not found")
    if not resolved["block_id"]:
        raise _RowFailed("Block is required but not provided or not found")
    if not resolved["ward_id"]:
        raise _RowFailed("Ward Name is required but not provided or not found")

    # ---- Sub-centre auto-assignment (ward mapping, then block mapping) ----
    sub_centre_id = resolved["sub_centre_id"]
    if not sub_centre_id:
        wm = db.query(WardSubcentreMapping).filter(WardSubcentreMapping.ward_id == resolved["ward_id"]).first()
        if wm:
            sub_centre_id = wm.sub_centre_id
        else:
            bm = db.query(BlockSubcentreMapping).filter(BlockSubcentreMapping.block_id == resolved["block_id"]).first()
            if bm:
                sub_centre_id = bm.sub_centre_id
    if not sub_centre_id:
        raise _RowFailed("Sub Centre Name is required but not provided or not found")

    # ---- Insert inside a savepoint so one bad row can't poison the batch ----
    with db.begin_nested():
        new_pw = PregnantWoman(
            full_name=full_name,
            mobile_number=mobile,
            abha_id=abha_id,
            rch_id=rch_id,
            husband_name=_clean_str(row.get('husband_name')),
            age=age,
            date_of_birth=dob,
            lmp_date=lmp,
            edd_date=edd,
            gravida=gravida_val,
            para=para_val,
            address=_clean_str(row.get('address')),
            ward_id=resolved["ward_id"],
            sub_centre_id=sub_centre_id,
            block_id=resolved["block_id"],
            district_id=resolved["district_id"],
            hpr_id=hpr_id,
            blood_group=blood_group,
            registered_by=current_user.id,
            registration_approved=True,
        )
        db.add(new_pw)
        db.flush()   # populates new_pw.id so EDDHistory gets a valid FK
        if edd:
            db.add(EDDHistory(
                pregnant_woman_id=new_pw.id,
                previous_edd=None,
                new_edd=edd,
                source="LMP",
                changed_by=current_user.id,
            ))
            db.flush()


@router.post("/bulk-upload")
def bulk_upload_pregnant_women(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Bulk upload pregnant women data from an Excel file (Block or District users).
    Sync endpoint on purpose: FastAPI runs it in a worker thread so a big file
    does not block the event loop.
    """
    if current_user.role not in ["block", "district"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Block or District users can perform bulk upload"
        )

    if not (file.filename or "").lower().endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only Excel files (.xlsx / .xls) are allowed")

    bulk_upload = None
    try:
        contents = file.file.read()
        if len(contents) > BULK_MAX_FILE_BYTES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"File too large (max {BULK_MAX_FILE_BYTES // (1024 * 1024)} MB)")

        # dtype=str keeps mobile/ABHA/RCH exactly as typed (no 9876543210.0, no lost zeros)
        try:
            df = pd.read_excel(io.BytesIO(contents), dtype=str)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Could not read Excel file: {e}")

        # Normalise headers (case / spacing / underscore insensitive)
        df = df.rename(columns={c: _BULK_HEADER_LOOKUP.get(_norm_header(c), c) for c in df.columns})
        df = df.dropna(how="all")

        missing = [c for c in BULK_REQUIRED_COLUMNS if c not in df.columns]
        if missing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Missing required column(s): {', '.join(missing)}. Please use the downloaded template.")
        if df.empty:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The file has no data rows")
        if len(df) > BULK_MAX_ROWS:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Too many rows ({len(df)}). Maximum allowed is {BULK_MAX_ROWS} per upload")

        bulk_upload = BulkUpload(
            file_name=file.filename,
            uploaded_by=current_user.id,
            total_records=len(df),
            processing_status="processing"
        )
        db.add(bulk_upload)
        db.commit()
        db.refresh(bulk_upload)

        logger.info(f"[BULK UPLOAD] Started | file='{file.filename}' | total_rows={len(df)} | uploaded_by=user_id:{current_user.id}")

        scope = _get_user_scope(db, current_user)
        cache = {}
        successful = failed = duplicate = 0
        errors = []
        failed_rows = []

        for index, row in df.iterrows():
            excel_row = index + 2  # header is row 1
            name = _clean_str(row.get('full_name')) or ''
            mobile_raw = _clean_id(row.get('mobile_number')) or ''
            try:
                _process_bulk_row(db, row, current_user, scope, cache)
                successful += 1
            except _RowDuplicate as e:
                duplicate += 1
                reason = str(e)
                errors.append(f"Row {excel_row} | Name: {name} | Mobile: {_mask_mobile(mobile_raw)} | Reason: {reason}")
                failed_rows.append({"row_number": excel_row, "full_name": name, "mobile_number": mobile_raw, "error_reason": reason})
                logger.warning(f"[BULK UPLOAD] Row {excel_row} DUPLICATE | {reason}")
            except _RowFailed as e:
                failed += 1
                reason = str(e)
                errors.append(f"Row {excel_row} | Name: {name} | Mobile: {_mask_mobile(mobile_raw)} | Reason: {reason}")
                failed_rows.append({"row_number": excel_row, "full_name": name, "mobile_number": mobile_raw, "error_reason": reason})
                logger.warning(f"[BULK UPLOAD] Row {excel_row} FAILED | {reason}")
            except IntegrityError as e:
                # savepoint already rolled back; only this row is lost
                failed += 1
                reason = "Duplicate or invalid data (ABHA / RCH / Mobile already exists or a field violates a constraint)"
                errors.append(f"Row {excel_row} | Name: {name} | Mobile: {_mask_mobile(mobile_raw)} | Reason: {reason}")
                failed_rows.append({"row_number": excel_row, "full_name": name, "mobile_number": mobile_raw, "error_reason": reason})
                logger.error(f"[BULK UPLOAD] Row {excel_row} INTEGRITY ERROR | {type(e).__name__}: {str(e.orig)[:200] if getattr(e, 'orig', None) else ''}")
            except Exception as e:
                failed += 1
                reason = "Unexpected error while processing this row"
                errors.append(f"Row {excel_row} | Name: {name} | Mobile: {_mask_mobile(mobile_raw)} | Error: {type(e).__name__}")
                failed_rows.append({"row_number": excel_row, "full_name": name, "mobile_number": mobile_raw, "error_reason": reason})
                logger.error(f"[BULK UPLOAD] Row {excel_row} EXCEPTION | {type(e).__name__}: {e} | {traceback.format_exc()}")

        # One commit for the rows that succeeded (failed rows were rolled back via savepoints)
        db.commit()

        logger.info(
            f"[BULK UPLOAD] Completed | file='{file.filename}' | total={len(df)} | "
            f"successful={successful} | failed={failed} | duplicate={duplicate}"
        )

        bulk_upload.successful_records = successful
        bulk_upload.failed_records = failed
        bulk_upload.duplicate_records = duplicate
        bulk_upload.processing_status = "completed"
        bulk_upload.error_log = "\n".join(errors) if errors else None
        bulk_upload.completed_at = datetime.now()
        db.commit()

        NotificationService.create_notification(
            db=db,
            user_ids=[current_user.id],
            title="Bulk Upload Completed",
            message=f"Bulk upload completed: {successful} successful, {failed} failed, {duplicate} duplicates",
            notification_type="bulk_upload_completed",
            category="admin",
            priority="normal",
            reference_id=bulk_upload.id,
            reference_type="bulk_upload",
            action_url=f"/bulk-uploads/{bulk_upload.id}",
            metadata={"total": len(df), "successful": successful, "failed": failed, "duplicate": duplicate}
        )

        ip_address, user_agent = get_client_info(request)
        log_bulk_action(
            db,
            current_user.id,
            "BULK_UPLOAD",
            "PregnantWoman",
            successful,
            {
                "total_records": len(df),
                "successful": successful,
                "failed": failed,
                "duplicate": duplicate,
                "bulk_upload_id": bulk_upload.id
            },
            ip_address,
            user_agent
        )

        return {
            "message": "Bulk upload completed",
            "total_records": len(df),
            "successful": successful,
            "failed": failed,
            "duplicate": duplicate,
            "bulk_upload_id": bulk_upload.id,
            "failed_rows": failed_rows
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[BULK UPLOAD] FILE-LEVEL ERROR | file='{file.filename}' | error_type={type(e).__name__} | error='{str(e)}' | traceback={traceback.format_exc()}")
        # Don't leave the audit record stuck in "processing"
        if bulk_upload is not None:
            try:
                bulk_upload.processing_status = "failed"
                bulk_upload.error_log = f"{type(e).__name__}: {str(e)[:500]}"
                bulk_upload.completed_at = datetime.now()
                db.commit()
            except Exception:
                db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing file: {str(e)}"
        )


@router.get("/search/by-mobile/{mobile_number}", response_model=PregnantWomanResponse)
async def search_by_mobile(
    mobile_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Search pregnant woman by mobile number
    """
    pw = db.query(PregnantWoman).filter(
        PregnantWoman.mobile_number == mobile_number
    ).first()
    
    if not pw:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pregnant woman not found"
        )
    
    return pw