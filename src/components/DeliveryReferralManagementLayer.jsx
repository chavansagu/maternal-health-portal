import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react/dist/iconify.js';
import { deliveryReferralAPI, pregnantWomenAPI, deliveryPointAPI, authAPI } from '../services/api';
import { getUserRole } from '../services/auth';
import { formatDate, formatDateTime } from '../utils/dateFormatter';
import {
    ListTabs, ListTab, ListToolbar, ToolbarLeft, ToolbarRight, EntriesSelect, SearchBox, AddButton, TableFooter,
} from './common/ListControls';

const DeliveryReferralManagementLayer = () => {
    const [referrals, setReferrals] = useState([]);
    const [activeTab, setActiveTab] = useState('pending');
    const [searchParams] = useSearchParams();

    // Optional outcome filter coming from dashboard cards: maternal_death | infant_death
    const [outcomeFilter, setOutcomeFilter] = useState(null);

    useEffect(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam && ['pending', 'accepted', 'completed'].includes(tabParam)) {
            setActiveTab(tabParam);
        }
        const outcomeParam = searchParams.get('outcome');
        setOutcomeFilter(['maternal_death', 'infant_death'].includes(outcomeParam) ? outcomeParam : null);
    }, [searchParams]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showViewModal, setShowViewModal] = useState(false);
    const [showReReferModal, setShowReReferModal] = useState(false);
    const [showOutcomeModal, setShowOutcomeModal] = useState(false);
    const [showDischargeModal, setShowDischargeModal] = useState(false);
    const [showAdmissionModal, setShowAdmissionModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedReferral, setSelectedReferral] = useState(null);
    const [deliveryPoints, setDeliveryPoints] = useState([]);
    const [pregnantWomen, setPregnantWomen] = useState([]);
    const [ancVisits, setAncVisits] = useState([]);
    const [referralChain, setReferralChain] = useState([]);
    const [deliveryTypes, setDeliveryTypes] = useState([]);
    const userRole = getUserRole();
    const [currentUserInfo, setCurrentUserInfo] = useState(null);
    const [otherDPId, setOtherDPId] = useState(null);
    const [availableDeliveryPoints, setAvailableDeliveryPoints] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    const [createData, setCreateData] = useState({
        pregnant_woman_id: '',
        dp_id: '',
        observation_notes: ''
    });
    const [pwSearch, setPwSearch] = useState('');
    const [showPwDropdown, setShowPwDropdown] = useState(false);

    const [reReferData, setReReferData] = useState({
        referred_to_dp_id: '',
        re_refer_reason: '',
        re_refer_note: '',
        treatment_given: '',
        attachment_files: []
    });

    const [outcomeData, setOutcomeData] = useState({
        delivery_type: '',
        delivery_date: '',
        babies: [{ gender: '', status: '' }],
        maternal_outcome: 'healthy',
        maternal_outcome_notes: '',
        remarks: ''
    });

    const [dischargeData, setDischargeData] = useState({
        discharge_date: '',
        discharge_facility: '',
        discharging_doctor: '',
        condition_at_discharge: '',
        discharge_notes: ''
    });
    const [dischargeSubmitting, setDischargeSubmitting] = useState(false);
    const [dischargeError, setDischargeError] = useState('');

    const [admissionData, setAdmissionData] = useState({
        admission_date: '',
        treating_doctor: '',
        condition_at_admission: ''
    });
    const [isEditingAdmission, setIsEditingAdmission] = useState(false);
    const [admissionSubmitting, setAdmissionSubmitting] = useState(false);
    const [admissionError, setAdmissionError] = useState('');

    const REQUIRES_BABIES = ['safe_delivery', 'live_birth', 'still_birth', 'infant_death'];
    const requiresBabies = REQUIRES_BABIES.includes(outcomeData.delivery_type);
    const MATERNAL_OUTCOME_OPTIONS = [
        { value: 'healthy', label: 'Healthy — no complications' },
        { value: 'complications', label: 'Complications (non-fatal)' },
        { value: 'referred_higher_facility', label: 'Referred to higher facility' },
        { value: 'maternal_death', label: 'Maternal Death' },
    ];
    const maternalOutcomeNeedsNotes = outcomeData.maternal_outcome && outcomeData.maternal_outcome !== 'healthy';

    useEffect(() => {
        fetchReferrals();
        fetchDeliveryPoints();
        fetchDeliveryTypes();
        fetchCurrentUser();
        if (userRole === 'sub_centre' || userRole === 'dp' || userRole === 'pmsma') fetchPregnantWomen();
    }, []);

    // Fetch the risk-filtered, ACTIVE-only DP list whenever the create modal opens or a
    // pregnant woman is picked. Re-fetching on open means a DP deactivated in the meantime
    // disappears, and a previously selected DP that is no longer offered is cleared.
    useEffect(() => {
        if (!showCreateModal || !createData.pregnant_woman_id) {
            setAvailableDeliveryPoints([]);
            return undefined;
        }
        let cancelled = false;
        deliveryPointAPI.getAvailableDeliveryPoints(createData.pregnant_woman_id)
            .then(data => {
                if (cancelled) return;
                const active = Array.isArray(data) ? data.filter(dp => dp.is_active !== false) : [];
                setAvailableDeliveryPoints(active);
                setCreateData(prev => (
                    prev.dp_id && !active.some(dp => String(dp.id) === String(prev.dp_id))
                        ? { ...prev, dp_id: '' }
                        : prev
                ));
            })
            .catch(() => { if (!cancelled) setAvailableDeliveryPoints([]); });
        return () => { cancelled = true; };
    }, [createData.pregnant_woman_id, showCreateModal]);

    // Re-refer dropdown: refresh the active DP list each time that modal opens
    useEffect(() => {
        if (showReReferModal) fetchDeliveryPoints();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showReReferModal]);

    const fetchPregnantWomen = async () => {
        try {
            const res = await pregnantWomenAPI.getPregnantWomen(0, 200, null, null, null, null, true, true);
            setPregnantWomen(res.data || []);
        } catch (error) {
            console.error('Error fetching pregnant women:', error);
        }
    };

    const fetchCurrentUser = async () => {
        try {
            const data = await authAPI.getCurrentUser();
            setCurrentUserInfo(data);
        } catch (error) {
            console.error('Error fetching current user:', error);
        }
    };

    const fetchReferrals = async () => {
        try {
            setLoading(true);
            const data = await deliveryReferralAPI.getReferrals();
            setReferrals(data);
        } catch (error) {
            console.error('Error fetching referrals:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDeliveryPoints = async () => {
        try {
            const data = await deliveryPointAPI.getDeliveryPoints(null, null, true);
            setDeliveryPoints(Array.isArray(data) ? data.filter(dp => dp.is_active !== false) : []);
        } catch (error) {
            console.error('Error fetching delivery points:', error);
        }
    };

    const fetchDeliveryTypes = async () => {
        try {
            const data = await authAPI.getDeliveryTypes();
            setDeliveryTypes(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching delivery types:', error);
        }
    };

    const fetchReferralDetails = async (referralId) => {
        try {
            const details = await deliveryReferralAPI.getReferralById(referralId);
            setSelectedReferral(details);
            setReferralChain(details.referral_chain || []);
            setAncVisits(details.anc_visits || []);
        } catch (error) {
            console.error('Error fetching referral details:', error);
        }
    };

    const handleAccept = async (referralId) => {
        if (window.confirm('Accept this referral and proceed to delivery?')) {
            try {
                await deliveryReferralAPI.acceptReferral(referralId);
                alert('Referral accepted successfully');
                fetchReferrals();
            } catch (error) {
                console.error('Error accepting referral:', error);
                alert('Failed to accept referral');
            }
        }
    };

    const handleReRefer = async () => {
        if (!reReferData.referred_to_dp_id || !reReferData.re_refer_reason || !reReferData.re_refer_note) {
            alert('Please fill all required fields');
            return;
        }
        try {
            const formData = new FormData();
            formData.append('new_dp_id', parseInt(reReferData.referred_to_dp_id));
            formData.append('re_refer_reason', `${reReferData.re_refer_reason} - ${reReferData.re_refer_note}`.trim());
            if (reReferData.treatment_given && reReferData.treatment_given.trim()) {
                formData.append('treatment_given', reReferData.treatment_given.trim());
            }
            if (reReferData.attachment_files && reReferData.attachment_files.length > 0) {
                reReferData.attachment_files.forEach(file => formData.append('attachment_files', file));
            }
            // DEBUG: log formData contents
            console.log('[RE-REFER DEBUG] FormData entries:');
            for (let [key, value] of formData.entries()) {
                console.log(`  ${key}:`, value);
            }
            console.log('[RE-REFER DEBUG] referral id:', selectedReferral.referral?.id || selectedReferral.id);

            await deliveryReferralAPI.reRefer(selectedReferral.referral?.id || selectedReferral.id, formData);
            alert('Referral re-referred successfully');
            setShowReReferModal(false);
            setReReferData({ referred_to_dp_id: '', re_refer_reason: '', re_refer_note: '', treatment_given: '', attachment_files: [] });
            fetchReferrals();
        } catch (error) {
            console.error('Error re-referring:', error);
            alert('Failed to re-refer');
        }
    };

    const handleDeliveryTypeChange = (e) => {
        const value = e.target.value;
        setOutcomeData(prev => ({
            ...prev,
            delivery_type: value,
            babies: value === 'maternal_death' ? [] : (prev.babies.length ? prev.babies : [{ gender: '', status: '' }])
        }));
    };

    const handleBabyChange = (index, field, value) => {
        setOutcomeData(prev => {
            const updated = [...prev.babies];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, babies: updated };
        });
    };

    const addBaby = () => {
        if (outcomeData.babies.length >= 5) return;
        setOutcomeData(prev => ({ ...prev, babies: [...prev.babies, { gender: '', status: '' }] }));
    };

    const removeBaby = (index) => {
        if (outcomeData.babies.length <= 1) return;
        setOutcomeData(prev => ({ ...prev, babies: prev.babies.filter((_, i) => i !== index) }));
    };

    const handleRecordOutcome = async () => {
        if (!outcomeData.delivery_type || !outcomeData.delivery_date) {
            alert('Please fill all required fields');
            return;
        }
        if (REQUIRES_BABIES.includes(outcomeData.delivery_type)) {
            if (outcomeData.babies.length === 0) {
                alert('At least 1 baby is required for selected delivery type');
                return;
            }
            const incomplete = outcomeData.babies.some(b => !b.gender || !b.status);
            if (incomplete) {
                alert('Please fill gender and status for all babies');
                return;
            }
        }
        if (maternalOutcomeNeedsNotes && !outcomeData.maternal_outcome_notes.trim()) {
            alert('Please add notes describing the maternal outcome');
            return;
        }
        try {
            const payload = {
                delivery_type: outcomeData.delivery_type,
                delivery_date: `${outcomeData.delivery_date}T00:00:00`,
                remarks: outcomeData.remarks || null,
                babies: outcomeData.delivery_type === 'maternal_death' ? [] : outcomeData.babies,
                maternal_outcome: outcomeData.maternal_outcome,
                maternal_outcome_notes: outcomeData.maternal_outcome_notes || null,
            };
            await deliveryReferralAPI.recordOutcome(selectedReferral.referral?.id || selectedReferral.id, payload);
            alert('Delivery outcome recorded successfully');
            setShowOutcomeModal(false);
            setOutcomeData({ delivery_type: '', delivery_date: '', babies: [{ gender: '', status: '' }], maternal_outcome: 'healthy', maternal_outcome_notes: '', remarks: '' });
            fetchReferrals();
        } catch (error) {
            console.error('Error recording outcome:', error);
            alert(error.message || 'Failed to record outcome');
        }
    };

    const openAdmissionModal = (referral) => {
        setSelectedReferral(referral);
        const existing = referral.admission; // full object when opened from the detail view
        const alreadyAdmitted = !!existing || referral.is_admitted;
        setIsEditingAdmission(alreadyAdmitted);
        setAdmissionData({
            admission_date: existing ? (existing.admission_date || '').slice(0, 10) : '',
            treating_doctor: existing ? (existing.treating_doctor || '') : '',
            condition_at_admission: existing ? (existing.condition_at_admission || '') : ''
        });
        setAdmissionError('');
        setShowAdmissionModal(true);
    };

    const handleAdmission = async () => {
        if (!isEditingAdmission && !admissionData.admission_date) {
            setAdmissionError('Admission date is required');
            return;
        }
        setAdmissionSubmitting(true);
        setAdmissionError('');
        try {
            const referralId = selectedReferral.referral?.id || selectedReferral.id;
            if (isEditingAdmission) {
                await deliveryReferralAPI.updateAdmission(referralId, {
                    treating_doctor: admissionData.treating_doctor || null,
                    condition_at_admission: admissionData.condition_at_admission || null,
                });
                alert('Admission updated successfully');
            } else {
                await deliveryReferralAPI.createAdmission(referralId, {
                    admission_date: `${admissionData.admission_date}T00:00:00`,
                    treating_doctor: admissionData.treating_doctor || null,
                    condition_at_admission: admissionData.condition_at_admission || null,
                });
                alert('Admission recorded successfully');
            }
            setShowAdmissionModal(false);
            fetchReferrals();
        } catch (error) {
            console.error('Error saving admission:', error);
            setAdmissionError(error.message || 'Failed to save admission');
        } finally {
            setAdmissionSubmitting(false);
        }
    };

    const openDischargeModal = (referral) => {
        setSelectedReferral(referral);
        setDischargeData({
            discharge_date: '',
            discharge_facility: '',
            discharging_doctor: '',
            condition_at_discharge: '',
            discharge_notes: ''
        });
        setDischargeError('');
        setShowDischargeModal(true);
    };

    const handleDischarge = async () => {
        if (!dischargeData.discharge_date) {
            setDischargeError('Discharge date is required');
            return;
        }
        setDischargeSubmitting(true);
        setDischargeError('');
        try {
            const payload = {
                discharge_date: `${dischargeData.discharge_date}T00:00:00`,
                discharge_facility: dischargeData.discharge_facility || null,
                discharging_doctor: dischargeData.discharging_doctor || null,
                condition_at_discharge: dischargeData.condition_at_discharge || null,
                discharge_notes: dischargeData.discharge_notes || null,
            };
            await deliveryReferralAPI.dischargeCase(selectedReferral.referral?.id || selectedReferral.id, payload);
            alert('Case discharged successfully. PNC reminders scheduled.');
            setShowDischargeModal(false);
            fetchReferrals();
        } catch (error) {
            console.error('Error discharging case:', error);
            setDischargeError(error.message || 'Failed to discharge case');
        } finally {
            setDischargeSubmitting(false);
        }
    };

    const handleCreateReferral = async () => {
        if (!createData.pregnant_woman_id || !createData.dp_id) {
            alert('Patient and Delivery Point are required');
            return;
        }
        try {
            await deliveryReferralAPI.createReferral({
                pregnant_woman_id: parseInt(createData.pregnant_woman_id),
                dp_id: parseInt(createData.dp_id),
                observation_notes: createData.observation_notes || null
            });
            alert('Referral created successfully');
            setShowCreateModal(false);
            setCreateData({ pregnant_woman_id: '', dp_id: '', observation_notes: '' });
            setPwSearch('');
            setShowPwDropdown(false);
            fetchReferrals();
        } catch (error) {
            alert(error.message || 'Failed to create referral');
        }
    };

    const matchesOutcomeFilter = (r) => {
        if (!outcomeFilter) return true;
        if (outcomeFilter === 'maternal_death') return !!r.is_maternal_death;
        if (outcomeFilter === 'infant_death') return (r.infant_death_count || 0) > 0;
        return true;
    };
    const outcomeFilterLabel = outcomeFilter === 'maternal_death' ? 'Maternal death cases' : 'Infant death cases';

    const getCurrentData = () => {
        switch (activeTab) {
            case 'pending': return referrals.filter(r => r.status === 'pending');
            case 'accepted': return referrals.filter(r => r.status === 'accepted');
            case 'completed': return referrals.filter(r => r.status === 'completed' && matchesOutcomeFilter(r));
            default: return referrals;
        }
    };

    const filteredData = getCurrentData().filter(referral =>
        referral.pregnant_woman_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        referral.id?.toString().includes(searchTerm)
    );

    const getRiskBadge = (isHighRisk, riskFactors) => (
        isHighRisk
            ? <span className="px-16 py-4 rounded-pill fw-medium text-sm bg-danger-focus text-danger-main" title={riskFactors || 'High risk'}>High Risk</span>
            : <span className="px-16 py-4 rounded-pill fw-medium text-sm bg-success-focus text-success-main">Normal</span>
    );

    const getStatusBadge = (status) => {
        const badges = {
            pending: <span className="px-24 py-4 rounded-pill fw-medium text-sm bg-warning-focus text-warning-main">Pending</span>,
            accepted: <span className="px-24 py-4 rounded-pill fw-medium text-sm bg-info-focus text-info-main">Accepted</span>,
            re_referred: <span className="px-24 py-4 rounded-pill fw-medium text-sm bg-lilac-100 text-lilac-600">Re-referred</span>,
            completed: <span className="px-24 py-4 rounded-pill fw-medium text-sm bg-success-focus text-success-main">Completed</span>
        };
        return badges[status] || status;
    };

    // Role label map — used only in referral_chain display
    const ROLE_LABELS = {
        district: 'District',
        block: 'Block',
        sub_centre: 'Sub-Centre',
        usg_centre: 'USG Centre',
        dp: 'Delivery Point',
    };
    const getRoleLabel = (role) => ROLE_LABELS[role] || role;

    const getDeliveryTypeBadge = (type) => {
        const colorMap = {
            safe_delivery: 'bg-success-focus text-success-main',
            live_birth: 'bg-success-focus text-success-main',
            still_birth: 'bg-warning-focus text-warning-main',
            infant_death: 'bg-danger-focus text-danger-main',
            maternal_death: 'bg-danger-focus text-danger-main',
        };
        const label = deliveryTypes.find(dt => dt.value === type)?.label || type?.replace(/_/g, ' ');
        const color = colorMap[type] || 'bg-neutral-200 text-secondary-light';
        return <span className={`px-16 py-4 rounded-pill fw-medium text-xs ${color}`}>{label}</span>;
    };

    return (
        <div className="card h-100 p-0 radius-12">
            {/* Statistics */}
            <div className="col-12">
                <div className="card radius-12">
                    <div className="card-body p-16">
                        <div className="row gy-4">
                            <div className="col-xxl-3 col-xl-4 col-sm-6">
                                <div className="px-20 py-16 shadow-none radius-8 h-100 gradient-deep-1 left-line line-bg-primary">
                                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8">
                                        <div>
                                            <span className="mb-2 fw-medium text-secondary-light text-md">Total Referrals</span>
                                            <h6 className="fw-semibold mb-1">{referrals.length}</h6>
                                        </div>
                                        <span className="w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-2xl mb-12 bg-primary-100 text-primary-600">
                                            <Icon icon="material-symbols:local-shipping" />
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="col-xxl-3 col-xl-4 col-sm-6">
                                <div className="px-20 py-16 shadow-none radius-8 h-100 gradient-deep-2 left-line line-bg-warning">
                                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8">
                                        <div>
                                            <span className="mb-2 fw-medium text-secondary-light text-md">Pending</span>
                                            <h6 className="fw-semibold mb-1">{referrals.filter(r => r.status === 'pending').length}</h6>
                                        </div>
                                        <span className="w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-2xl mb-12 bg-warning-focus text-warning-600">
                                            <Icon icon="material-symbols:pending" />
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="col-xxl-3 col-xl-4 col-sm-6">
                                <div className="px-20 py-16 shadow-none radius-8 h-100 bg-info-100 left-line line-bg-info">
                                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8">
                                        <div>
                                            <span className="mb-2 fw-medium text-secondary-light text-md">Accepted</span>
                                            <h6 className="fw-semibold mb-1">{referrals.filter(r => r.status === 'accepted').length}</h6>
                                        </div>
                                        <span className="w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-2xl mb-12 bg-info-200 text-info-600">
                                            <Icon icon="material-symbols:check-circle" />
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="col-xxl-3 col-xl-4 col-sm-6">
                                <div className="px-20 py-16 shadow-none radius-8 h-100 bg-success-100 left-line line-bg-success">
                                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8">
                                        <div>
                                            <span className="mb-2 fw-medium text-secondary-light text-md">Completed</span>
                                            <h6 className="fw-semibold mb-1">{referrals.filter(r => r.status === 'completed').length}</h6>
                                        </div>
                                        <span className="w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-2xl mb-12 bg-success-200 text-success-600">
                                            <Icon icon="material-symbols:task-alt" />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs and toolbar */}
            <div className="card-header border-bottom bg-base py-16 px-24">
                <ListTabs>
                    <ListTab active={activeTab === 'pending'} onClick={() => setActiveTab('pending')}>
                        Pending ({referrals.filter(r => r.status === 'pending').length})
                    </ListTab>
                    <ListTab active={activeTab === 'accepted'} onClick={() => setActiveTab('accepted')}>
                        Accepted ({referrals.filter(r => r.status === 'accepted').length})
                    </ListTab>
                    <ListTab active={activeTab === 'completed'} onClick={() => setActiveTab('completed')}>
                        Completed ({referrals.filter(r => r.status === 'completed' && matchesOutcomeFilter(r)).length})
                    </ListTab>
                </ListTabs>
                <ListToolbar>
                    <ToolbarLeft>
                        <EntriesSelect value={itemsPerPage} onChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }} />
                        <SearchBox value={searchTerm} onChange={(v) => { setSearchTerm(v); setCurrentPage(1); }} placeholder="Search..." />
                    </ToolbarLeft>
                    <ToolbarRight>
                        {(userRole === 'sub_centre' || userRole === 'dp' || userRole === 'pmsma') && (
                            <AddButton onClick={() => setShowCreateModal(true)}>Create Referral</AddButton>
                        )}
                    </ToolbarRight>
                </ListToolbar>
            </div>

            {/* Referrals Table */}
            <div className="card-body p-24">
                {outcomeFilter && activeTab === 'completed' && (
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-16 px-16 py-8 radius-8 bg-danger-focus text-danger-main">
                        <span className="text-sm fw-medium">
                            Showing only: {outcomeFilterLabel}
                            {outcomeFilter === 'infant_death' && ' (one row per delivery; the dashboard counts babies)'}
                        </span>
                        <button type="button" className="btn btn-sm btn-outline-danger py-2 px-12" onClick={() => setOutcomeFilter(null)}>
                            Clear filter
                        </button>
                    </div>
                )}
                <div className="table-responsive scroll-sm">
                    <table className="table bordered-table sm-table mb-0">
                        <thead>
                            <tr>
                                <th>S.L</th>
                                <th>Name</th>
                                <th>Risk</th>
                                <th>Referred From</th>
                                <th>Referred Date</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" className="text-center py-4">Loading...</td></tr>
                            ) : filteredData.length === 0 ? (
                                <tr><td colSpan="7" className="text-center py-4">No referrals found</td></tr>
                            ) : (
                                filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((referral, index) => (
                                    <tr key={referral.id}>
                                        <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                        <td>{referral.pregnant_woman_name}</td>
                                        <td>{getRiskBadge(referral.is_high_risk, referral.risk_factors)}</td>
                                        <td>
                                            <div>
                                                <div className="fw-medium">{referral.sub_centre_name || 'Direct'}</div>
                                                {referral.referral_chain_summary && (
                                                    <div className="text-xs text-secondary-light mt-1">{referral.referral_chain_summary}</div>
                                                )}
                                            </div>
                                        </td>
                                        <td>{formatDate(referral.created_at)}</td>
                                        <td>{getStatusBadge(referral.status)}</td>
                                        <td>
                                            <div className="d-flex align-items-center gap-10">
                                                <button className="bg-primary-50 text-primary-600 bg-hover-primary-100 w-32-px h-32-px d-flex justify-content-center align-items-center rounded-circle" onClick={() => { fetchReferralDetails(referral.id); setShowViewModal(true); }} title="View Details">
                                                    <Icon icon="iconamoon:eye-light" />
                                                </button>
                                                {referral.status === 'pending' && userRole === 'dp' && (
                                                    <>
                                                        <button className="bg-success-focus text-success-main bg-hover-success-200 w-32-px h-32-px d-flex justify-content-center align-items-center rounded-circle" onClick={() => handleAccept(referral.id)} title="Accept">
                                                            <Icon icon="material-symbols:check" />
                                                        </button>
                                                        <button className="bg-warning-focus text-warning-main bg-hover-warning-200 w-32-px h-32-px d-flex justify-content-center align-items-center rounded-circle" onClick={() => { setSelectedReferral(referral); setShowReReferModal(true); }} title="Re-refer">
                                                            <Icon icon="material-symbols:sync" />
                                                        </button>
                                                    </>
                                                )}
                                                {referral.status === 'accepted' && userRole === 'dp' && !referral.is_admitted && (
                                                    <button className="bg-purple-focus text-purple-main bg-hover-purple-200 w-32-px h-32-px d-flex justify-content-center align-items-center rounded-circle" onClick={() => openAdmissionModal(referral)} title="Admit">
                                                        <Icon icon="material-symbols:bed" />
                                                    </button>
                                                )}
                                                {referral.status === 'accepted' && userRole === 'dp' && referral.is_admitted && (
                                                    <button className="bg-purple-focus text-purple-main bg-hover-purple-200 d-flex justify-content-center align-items-center rounded-pill px-8" onClick={() => openAdmissionModal(referral)} title="Update Admission">
                                                        {referral.days_admitted != null ? `${referral.days_admitted}d admitted` : 'Admitted'}
                                                    </button>
                                                )}
                                                {referral.status === 'accepted' && userRole === 'dp' && (
                                                    <button className="bg-info-focus text-info-main bg-hover-info-200 w-32-px h-32-px d-flex justify-content-center align-items-center rounded-circle" onClick={() => { setSelectedReferral(referral); setShowOutcomeModal(true); }} title="Record Outcome">
                                                        <Icon icon="material-symbols:edit-document" />
                                                    </button>
                                                )}
                                                {referral.status === 'completed' && userRole === 'dp' && !referral.is_discharged && (
                                                    <button className="bg-success-focus text-success-main bg-hover-success-200 w-32-px h-32-px d-flex justify-content-center align-items-center rounded-circle" onClick={() => openDischargeModal(referral)} title="Discharge">
                                                        <Icon icon="material-symbols:logout" />
                                                    </button>
                                                )}
                                                {referral.status === 'completed' && referral.is_discharged && (
                                                    <span className="badge bg-success-focus text-success-main">Discharged</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <TableFooter
                    total={filteredData.length}
                    page={currentPage}
                    pageSize={itemsPerPage}
                    onPageChange={setCurrentPage}
                />
            </div>

            {/* View Modal */}
            {showViewModal && selectedReferral && (
                <>
                    <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
                        <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Referral Details</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowViewModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    {/* Patient Info */}
                                    <div className="card mb-3">
                                        <div className="card-header bg-primary-50">
                                            <h6 className="mb-0 fw-semibold">Patient Information</h6>
                                        </div>
                                        <div className="card-body">
                                            <div className="row g-3">
                                                <div className="col-md-4">
                                                    <label className="fw-semibold">Name:</label>
                                                    <p className="mb-0">{selectedReferral.pregnant_woman?.full_name || selectedReferral.pregnant_woman_name}</p>
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="fw-semibold">Age:</label>
                                                    <p className="mb-0">{selectedReferral.pregnant_woman?.age} years</p>
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="fw-semibold">Mobile:</label>
                                                    <p className="mb-0">{selectedReferral.pregnant_woman?.mobile_number || selectedReferral.mobile_number}</p>
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="fw-semibold">EDD:</label>
                                                    <p className="mb-0">{formatDate(selectedReferral.pregnant_woman?.edd_date)}</p>
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="fw-semibold d-block">Risk Status:</label>
                                                    {getRiskBadge(selectedReferral.pregnant_woman?.is_high_risk ?? selectedReferral.is_high_risk)}
                                                </div>
                                                {(selectedReferral.pregnant_woman?.is_high_risk ?? selectedReferral.is_high_risk) && (selectedReferral.pregnant_woman?.risk_factors || selectedReferral.risk_factors) && (
                                                    <div className="col-md-8">
                                                        <label className="fw-semibold">Risk Factors:</label>
                                                        <p className="mb-0">{selectedReferral.pregnant_woman?.risk_factors || selectedReferral.risk_factors}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Referral Chain */}
                                    {referralChain.length > 0 && (
                                        <div className="card mb-3">
                                            <div className="card-header bg-info-50">
                                                <h6 className="mb-0 fw-semibold">Referral Chain</h6>
                                            </div>
                                            <div className="card-body">
                                                <div className="timeline">
                                                    {referralChain.map((chain, idx) => (
                                                        <div key={idx} className="timeline-item mb-3">
                                                            <div className="d-flex align-items-start gap-3">
                                                                <div className="timeline-marker bg-primary-600 text-white rounded-circle d-flex align-items-center justify-content-center" style={{width: '32px', height: '32px', minWidth: '32px'}}>
                                                                    {idx + 1}
                                                                </div>
                                                                <div className="flex-grow-1">
                                                                    <div className="p-3 bg-neutral-50 rounded">
                                                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                                                            <div>
                                                                                <h6 className="mb-1 fw-semibold">{chain.dp_name}</h6>
                                                                                <p className="mb-0 text-sm text-secondary-light">By: {chain.referred_by} ({getRoleLabel(chain.referred_by_role)})</p>
                                                                            </div>
                                                                            <span className="text-xs text-secondary-light">{formatDateTime(chain.created_at)}</span>
                                                                        </div>
                                                                        {chain.observation_notes && <p className="mb-0 text-sm"><strong>Notes:</strong> {chain.observation_notes}</p>}
                                                                        {chain.re_refer_reason && <p className="mb-0 text-sm text-warning-main"><strong>Re-refer Reason:</strong> {chain.re_refer_reason}</p>}
                                                                        {chain.treatment_given && <p className="mb-0 text-sm text-success-main"><strong>Treatment Given:</strong> {chain.treatment_given}</p>}
                                                                        {chain.re_refer_attachment_urls?.length > 0 && (
                                                                            <div className="mt-1">
                                                                                <strong className="text-sm">Attachments:</strong>
                                                                                <div className="d-flex flex-wrap gap-2 mt-1">
                                                                                    {chain.re_refer_attachment_urls.map((url, i) => (
                                                                                        <a key={i} href={`${process.env.REACT_APP_API_BASE_URL}${url}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-secondary py-0 px-2 text-xs">
                                                                                            <Icon icon="mdi:paperclip" className="me-1" />File {i + 1}
                                                                                        </a>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        <span className={`px-12 py-2 rounded-pill fw-medium text-xs mt-1 d-inline-block ${
                                                                            chain.status === 'completed' ? 'bg-success-focus text-success-main' :
                                                                            chain.status === 'accepted' ? 'bg-info-focus text-info-main' :
                                                                            chain.status === 're_referred' ? 'bg-warning-focus text-warning-main' :
                                                                            'bg-neutral-200 text-secondary-light'
                                                                        }`}>{chain.status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* ANC Visits */}
                                    {ancVisits.length > 0 && (
                                        <div className="card mb-3">
                                            <div className="card-header bg-success-50">
                                                <h6 className="mb-0 fw-semibold">ANC Visit History</h6>
                                            </div>
                                            <div className="card-body">
                                                <div className="table-responsive">
                                                    <table className="table table-sm">
                                                        <thead>
                                                            <tr>
                                                                <th>Visit #</th>
                                                                <th>Date</th>
                                                                <th>Weight</th>
                                                                <th>BP</th>
                                                                <th>Hemoglobin</th>
                                                                <th>Notes</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {ancVisits.map(visit => (
                                                                <tr key={visit.id}>
                                                                    <td>#{visit.visit_number}</td>
                                                                    <td>{formatDate(visit.visit_date)}</td>
                                                                    <td>{visit.weight} kg</td>
                                                                    <td>{visit.blood_pressure}</td>
                                                                    <td>{visit.hemoglobin} g/dL</td>
                                                                    <td>{visit.doctor_notes || 'N/A'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Admission */}
                                    {selectedReferral.admission && (
                                        <div className="card mb-3">
                                            <div className="card-header bg-success-50 d-flex justify-content-between align-items-center">
                                                <h6 className="mb-0 fw-semibold">Admission</h6>
                                                {selectedReferral.referral?.status === 'accepted' && userRole === 'dp' && (
                                                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openAdmissionModal(selectedReferral)}>
                                                        Update
                                                    </button>
                                                )}
                                            </div>
                                            <div className="card-body">
                                                <div className="row g-3">
                                                    <div className="col-md-4">
                                                        <label className="fw-semibold">Admission Date:</label>
                                                        <p className="mb-0">{formatDate(selectedReferral.admission.admission_date)}</p>
                                                    </div>
                                                    <div className="col-md-4">
                                                        <label className="fw-semibold">Days Admitted:</label>
                                                        <p className="mb-0">
                                                            <span className="badge bg-info-focus text-info-main">{selectedReferral.admission.days_admitted}</span>
                                                            {selectedReferral.admission.discharge_date ? '' : ' (ongoing)'}
                                                        </p>
                                                    </div>
                                                    {selectedReferral.admission.treating_doctor && (
                                                        <div className="col-md-4">
                                                            <label className="fw-semibold">Treating Doctor:</label>
                                                            <p className="mb-0">{selectedReferral.admission.treating_doctor}</p>
                                                        </div>
                                                    )}
                                                    {selectedReferral.admission.condition_at_admission && (
                                                        <div className="col-md-4">
                                                            <label className="fw-semibold">Condition:</label>
                                                            <p className="mb-0">{selectedReferral.admission.condition_at_admission}</p>
                                                        </div>
                                                    )}
                                                    {selectedReferral.admission.discharge_date && (
                                                        <div className="col-md-4">
                                                            <label className="fw-semibold">Admission Discharge Date:</label>
                                                            <p className="mb-0">{formatDate(selectedReferral.admission.discharge_date)}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Delivery Outcome */}
                                    {selectedReferral.outcome && (
                                        <div className="card mb-3">
                                            <div className="card-header bg-success-50">
                                                <h6 className="mb-0 fw-semibold">Delivery Outcome</h6>
                                            </div>
                                            <div className="card-body">
                                                <div className="row g-3">
                                                    <div className="col-md-4">
                                                        <label className="fw-semibold">Delivery Type:</label>
                                                        <p className="mb-0">{getDeliveryTypeBadge(selectedReferral.outcome.delivery_type)}</p>
                                                    </div>
                                                    <div className="col-md-4">
                                                        <label className="fw-semibold">Baby Count:</label>
                                                        <p className="mb-0">{selectedReferral.outcome.baby_count ?? 0}</p>
                                                    </div>
                                                    <div className="col-md-4">
                                                        <label className="fw-semibold">Delivery Date:</label>
                                                        <p className="mb-0">{formatDate(selectedReferral.outcome.delivery_date)}</p>
                                                    </div>
                                                    <div className="col-md-4">
                                                        <label className="fw-semibold">Maternal Outcome:</label>
                                                        <p className="mb-0">
                                                            <span className={`badge ${
                                                                selectedReferral.outcome.maternal_outcome === 'healthy'
                                                                    ? 'bg-success-focus text-success-main'
                                                                    : selectedReferral.outcome.maternal_outcome === 'maternal_death'
                                                                        ? 'bg-danger-focus text-danger-main'
                                                                        : 'bg-warning-focus text-warning-main'
                                                            }`}>
                                                                {(selectedReferral.outcome.maternal_outcome || 'healthy').replace(/_/g, ' ')}
                                                            </span>
                                                        </p>
                                                    </div>
                                                    {selectedReferral.outcome.maternal_outcome_notes && (
                                                        <div className="col-12">
                                                            <label className="fw-semibold">Maternal Outcome Notes:</label>
                                                            <p className="mb-0">{selectedReferral.outcome.maternal_outcome_notes}</p>
                                                        </div>
                                                    )}
                                                    {(() => {
                                                        // Resolve babies with backward compat
                                                        const babies = selectedReferral.outcome.babies?.length
                                                            ? selectedReferral.outcome.babies
                                                            : selectedReferral.outcome.baby_gender
                                                                ? [{ baby_number: 1, gender: selectedReferral.outcome.baby_gender, status: 'live_birth' }]
                                                                : [];
                                                        return babies.length > 0 ? (
                                                            <div className="col-12">
                                                                <label className="fw-semibold">Babies:</label>
                                                                <ul className="mb-0 ps-3">
                                                                    {babies.map(b => (
                                                                        <li key={b.baby_number} className="text-sm">
                                                                            Baby {b.baby_number}: <span className="text-capitalize">{b.gender}</span> — <span className="text-capitalize">{b.status?.replace(/_/g, ' ')}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        ) : null;
                                                    })()}
                                                    {selectedReferral.outcome.remarks && (
                                                        <div className="col-12">
                                                            <label className="fw-semibold">Remarks:</label>
                                                            <p className="mb-0">{selectedReferral.outcome.remarks}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Discharge */}
                                    {selectedReferral.discharge && (
                                        <div className="card mb-3">
                                            <div className="card-header bg-success-50">
                                                <h6 className="mb-0 fw-semibold">Discharge</h6>
                                            </div>
                                            <div className="card-body">
                                                <div className="row g-3">
                                                    <div className="col-md-4">
                                                        <label className="fw-semibold">Discharge Date:</label>
                                                        <p className="mb-0">{formatDate(selectedReferral.discharge.discharge_date)}</p>
                                                    </div>
                                                    {selectedReferral.discharge.discharge_facility && (
                                                        <div className="col-md-4">
                                                            <label className="fw-semibold">Facility:</label>
                                                            <p className="mb-0">{selectedReferral.discharge.discharge_facility}</p>
                                                        </div>
                                                    )}
                                                    {selectedReferral.discharge.discharging_doctor && (
                                                        <div className="col-md-4">
                                                            <label className="fw-semibold">Discharging Doctor:</label>
                                                            <p className="mb-0">{selectedReferral.discharge.discharging_doctor}</p>
                                                        </div>
                                                    )}
                                                    {selectedReferral.discharge.condition_at_discharge && (
                                                        <div className="col-md-4">
                                                            <label className="fw-semibold">Condition:</label>
                                                            <p className="mb-0 text-capitalize">{selectedReferral.discharge.condition_at_discharge.replace(/_/g, ' ')}</p>
                                                        </div>
                                                    )}
                                                    {selectedReferral.discharge.discharge_notes && (
                                                        <div className="col-12">
                                                            <label className="fw-semibold">Notes:</label>
                                                            <p className="mb-0">{selectedReferral.discharge.discharge_notes}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Observation Notes */}
                                    <div className="card">
                                        <div className="card-header bg-warning-50">
                                            <h6 className="mb-0 fw-semibold">Observation Notes</h6>
                                        </div>
                                        <div className="card-body">
                                            <p className="mb-0">{selectedReferral.referral?.observation_notes || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowViewModal(false)}>Close</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" onClick={() => setShowViewModal(false)}></div>
                </>
            )}

            {/* Re-Refer Modal */}
            {showReReferModal && selectedReferral && (
                <>
                    <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Re-refer to Another Delivery Point</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowReReferModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Select Delivery Point <span className="text-danger">*</span></label>
                                        <select className="form-select" value={reReferData.referred_to_dp_id} onChange={(e) => setReReferData({...reReferData, referred_to_dp_id: e.target.value})}>
                                            <option value="">Choose...</option>
                                            {deliveryPoints.filter(dp => dp.id !== selectedReferral.dp_id).map(dp => (
                                                <option key={dp.id} value={dp.id}>{dp.name} - {dp.code}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Reason <span className="text-danger">*</span></label>
                                        <input type="text" className="form-control" placeholder="e.g., Lack of facilities, High-risk case" value={reReferData.re_refer_reason} onChange={(e) => setReReferData({...reReferData, re_refer_reason: e.target.value})} />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Notes <span className="text-danger">*</span></label>
                                        <textarea className="form-control" rows="3" placeholder="Detailed notes for the next facility..." value={reReferData.re_refer_note} onChange={(e) => setReReferData({...reReferData, re_refer_note: e.target.value})}></textarea>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Treatment Given</label>
                                        <textarea className="form-control" rows="2" placeholder="e.g., Given IV fluids, BP stabilized..." value={reReferData.treatment_given} onChange={(e) => setReReferData({...reReferData, treatment_given: e.target.value})}></textarea>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Attachments</label>
                                        <input
                                            type="file"
                                            className="form-control"
                                            multiple
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={(e) => setReReferData({...reReferData, attachment_files: Array.from(e.target.files)})}
                                        />
                                        <small className="text-secondary-light">Optional. PDF, JPG, PNG allowed. Multiple files supported.</small>
                                        {reReferData.attachment_files.length > 0 && (
                                            <div className="mt-1 text-sm text-success-main">{reReferData.attachment_files.length} file(s) selected</div>
                                        )}
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowReReferModal(false)}>Cancel</button>
                                    <button type="button" className="btn btn-warning" onClick={handleReRefer}>Re-refer</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" onClick={() => setShowReReferModal(false)}></div>
                </>
            )}

            {/* Outcome Modal */}
            {showOutcomeModal && selectedReferral && (
                <>
                    <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered modal-lg">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Record Delivery Outcome</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowOutcomeModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Delivery Type <span className="text-danger">*</span></label>
                                        <select className="form-select" value={outcomeData.delivery_type} onChange={handleDeliveryTypeChange}>
                                            <option value="">Choose...</option>
                                            {deliveryTypes.map(dt => (
                                                <option key={dt.value} value={dt.value}>{dt.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {requiresBabies && (
                                        <div className="mb-3">
                                            <div className="d-flex align-items-center justify-content-between mb-2">
                                                <label className="form-label fw-semibold mb-0">Babies <span className="text-danger">*</span></label>
                                                {outcomeData.babies.length < 5 && (
                                                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={addBaby}>
                                                        <Icon icon="ic:baseline-plus" className="me-1" />Add Baby
                                                    </button>
                                                )}
                                            </div>
                                            {outcomeData.babies.map((baby, idx) => (
                                                <div key={idx} className="border rounded p-3 mb-2 bg-neutral-50">
                                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                                        <span className="fw-medium text-sm">Baby {idx + 1}</span>
                                                        {outcomeData.babies.length > 1 && (
                                                            <button type="button" className="btn btn-sm btn-outline-danger py-0 px-2" onClick={() => removeBaby(idx)}>
                                                                <Icon icon="ic:baseline-close" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="row g-2">
                                                        <div className="col-6">
                                                            <label className="form-label text-sm mb-1">Gender <span className="text-danger">*</span></label>
                                                            <select className="form-select form-select-sm" value={baby.gender} onChange={(e) => handleBabyChange(idx, 'gender', e.target.value)}>
                                                                <option value="">Select</option>
                                                                <option value="male">Male</option>
                                                                <option value="female">Female</option>
                                                                <option value="other">Other</option>
                                                            </select>
                                                        </div>
                                                        <div className="col-6">
                                                            <label className="form-label text-sm mb-1">Status <span className="text-danger">*</span></label>
                                                            <select className="form-select form-select-sm" value={baby.status} onChange={(e) => handleBabyChange(idx, 'status', e.target.value)}>
                                                                <option value="">Select</option>
                                                                <option value="live_birth">Live Birth</option>
                                                                <option value="still_birth">Still Birth</option>
                                                                <option value="infant_death">Infant Death</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Delivery Date <span className="text-danger">*</span></label>
                                        <input type="date" className="form-control" value={outcomeData.delivery_date} onChange={(e) => setOutcomeData({...outcomeData, delivery_date: e.target.value})} />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Maternal Outcome <span className="text-danger">*</span></label>
                                        <select
                                            className="form-select"
                                            value={outcomeData.maternal_outcome}
                                            onChange={(e) => setOutcomeData({ ...outcomeData, maternal_outcome: e.target.value })}
                                        >
                                            {MATERNAL_OUTCOME_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                        <div className="form-text">Captured separately from delivery type / baby outcome.</div>
                                    </div>

                                    {maternalOutcomeNeedsNotes && (
                                        <div className="mb-3">
                                            <label className="form-label fw-semibold">
                                                Maternal Outcome Notes <span className="text-danger">*</span>
                                            </label>
                                            <textarea
                                                className="form-control"
                                                rows="3"
                                                placeholder="Describe the complication / referral / cause, as applicable..."
                                                value={outcomeData.maternal_outcome_notes}
                                                onChange={(e) => setOutcomeData({ ...outcomeData, maternal_outcome_notes: e.target.value })}
                                            ></textarea>
                                        </div>
                                    )}

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Remarks</label>
                                        <textarea className="form-control" rows="3" placeholder="Additional notes about the delivery..." value={outcomeData.remarks} onChange={(e) => setOutcomeData({...outcomeData, remarks: e.target.value})}></textarea>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowOutcomeModal(false)}>Cancel</button>
                                    <button type="button" className="btn btn-success" onClick={handleRecordOutcome}>Record Outcome</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" onClick={() => setShowOutcomeModal(false)}></div>
                </>
            )}

            {/* Discharge Modal */}
            {showDischargeModal && selectedReferral && (
                <>
                    <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Discharge Case</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowDischargeModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    {dischargeError && <div className="alert alert-danger py-2">{dischargeError}</div>}
                                    <p className="text-secondary-light mb-3">
                                        Closes this case and automatically schedules PNC reminders (48hr / day 7 / day 42) for the sub-centre.
                                    </p>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Discharge Date <span className="text-danger">*</span></label>
                                        <input type="date" className="form-control" value={dischargeData.discharge_date} onChange={(e) => setDischargeData({ ...dischargeData, discharge_date: e.target.value })} />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Discharge Facility</label>
                                        <input type="text" className="form-control" placeholder="e.g. same DP, or referred-onward facility name" value={dischargeData.discharge_facility} onChange={(e) => setDischargeData({ ...dischargeData, discharge_facility: e.target.value })} />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Discharging Doctor</label>
                                        <input type="text" className="form-control" value={dischargeData.discharging_doctor} onChange={(e) => setDischargeData({ ...dischargeData, discharging_doctor: e.target.value })} />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Condition at Discharge</label>
                                        <select className="form-select" value={dischargeData.condition_at_discharge} onChange={(e) => setDischargeData({ ...dischargeData, condition_at_discharge: e.target.value })}>
                                            <option value="">Select condition</option>
                                            <option value="stable">Stable</option>
                                            <option value="needs_followup">Needs Follow-up</option>
                                            <option value="referred_higher_facility">Referred to Higher Facility</option>
                                        </select>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Notes</label>
                                        <textarea className="form-control" rows="3" placeholder="Additional discharge notes..." value={dischargeData.discharge_notes} onChange={(e) => setDischargeData({ ...dischargeData, discharge_notes: e.target.value })}></textarea>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowDischargeModal(false)} disabled={dischargeSubmitting}>Cancel</button>
                                    <button type="button" className="btn btn-success" onClick={handleDischarge} disabled={dischargeSubmitting}>
                                        {dischargeSubmitting ? 'Discharging...' : 'Discharge & Schedule PNC Reminders'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" onClick={() => setShowDischargeModal(false)}></div>
                </>
            )}

            {/* Admission Modal */}
            {showAdmissionModal && selectedReferral && (
                <>
                    <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">{isEditingAdmission ? 'Update Admission' : 'Admit Patient'}</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowAdmissionModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    {admissionError && <div className="alert alert-danger py-2">{admissionError}</div>}
                                    <p className="text-secondary-light mb-3">
                                        Facility is your own delivery point. Days admitted is calculated automatically.
                                    </p>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Admission Date <span className="text-danger">*</span></label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={admissionData.admission_date}
                                            onChange={(e) => setAdmissionData({ ...admissionData, admission_date: e.target.value })}
                                            disabled={isEditingAdmission}
                                        />
                                        {isEditingAdmission && (
                                            <div className="form-text">Admission date can't be changed once recorded.</div>
                                        )}
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Treating Doctor</label>
                                        <input type="text" className="form-control" value={admissionData.treating_doctor} onChange={(e) => setAdmissionData({ ...admissionData, treating_doctor: e.target.value })} />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Condition</label>
                                        <input type="text" className="form-control" placeholder="e.g. stable, under observation" value={admissionData.condition_at_admission} onChange={(e) => setAdmissionData({ ...admissionData, condition_at_admission: e.target.value })} />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowAdmissionModal(false)} disabled={admissionSubmitting}>Cancel</button>
                                    <button type="button" className="btn btn-primary" onClick={handleAdmission} disabled={admissionSubmitting}>
                                        {admissionSubmitting ? 'Saving...' : (isEditingAdmission ? 'Save Changes' : 'Admit Patient')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" onClick={() => setShowAdmissionModal(false)}></div>
                </>
            )}

            {/* Create Referral Modal - Sub Centre only */}
            {showCreateModal && (
                <>
                    <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Create Delivery Referral</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowCreateModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Patient <span className="text-danger">*</span></label>
                                        <div className="position-relative">
                                            <div className="input-group">
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder="Search or select patient..."
                                                    value={pwSearch}
                                                    onChange={(e) => { setPwSearch(e.target.value); setShowPwDropdown(true); }}
                                                    onFocus={() => setShowPwDropdown(true)}
                                                    autoComplete="off"
                                                />
                                                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowPwDropdown(!showPwDropdown)}>
                                                    <Icon icon={showPwDropdown ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'} />
                                                </button>
                                            </div>
                                            {showPwDropdown && (
                                                <div className="card position-absolute w-100 mt-1 shadow border-0" style={{zIndex: 1050, maxHeight: '200px'}}>
                                                    <div className="list-group list-group-flush" style={{maxHeight: '200px', overflowY: 'auto'}}>
                                                        {pregnantWomen
                                                            .filter(pw => !pwSearch || pw.full_name?.toLowerCase().includes(pwSearch.toLowerCase()) || pw.mobile_number?.includes(pwSearch))
                                                            .map(pw => (
                                                                <button
                                                                    key={pw.id}
                                                                    type="button"
                                                                    className="list-group-item list-group-item-action border-0 py-2 px-3 text-start"
                                                                    onClick={() => { setCreateData({...createData, pregnant_woman_id: pw.id}); setPwSearch(pw.full_name); setShowPwDropdown(false); }}
                                                                >
                                                                    {pw.full_name} — {pw.mobile_number}
                                                                </button>
                                                            ))
                                                        }
                                                        {pregnantWomen.filter(pw => !pwSearch || pw.full_name?.toLowerCase().includes(pwSearch.toLowerCase()) || pw.mobile_number?.includes(pwSearch)).length === 0 && (
                                                            <div className="list-group-item border-0 py-3 text-center text-muted"><small>No patients found</small></div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Delivery Point <span className="text-danger">*</span></label>
                                        <select className="form-select" value={createData.dp_id} onChange={(e) => setCreateData({...createData, dp_id: e.target.value})}>
                                            <option value="">{createData.pregnant_woman_id ? 'Select Delivery Point' : 'Select a patient first'}</option>
                                            {availableDeliveryPoints.map(dp => (
                                                <option key={dp.id} value={dp.id}>{dp.name} — {dp.code}{dp.is_sdh_dhh ? ' (SDH/DHH)' : ''}</option>
                                            ))}
                                        </select>
                                        {createData.pregnant_woman_id && availableDeliveryPoints.length === 0 && (
                                            <small className="text-warning-main">No delivery points available for this patient's risk profile.</small>
                                        )}
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Observation Notes</label>
                                        <textarea className="form-control" rows="3" placeholder="Clinical observations, reason for referral..." value={createData.observation_notes} onChange={(e) => setCreateData({...createData, observation_notes: e.target.value})}></textarea>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                                    <button type="button" className="btn btn-primary" onClick={handleCreateReferral}>Create Referral</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" onClick={() => setShowCreateModal(false)}></div>
                </>
            )}
        </div>
    );
};

export default DeliveryReferralManagementLayer;