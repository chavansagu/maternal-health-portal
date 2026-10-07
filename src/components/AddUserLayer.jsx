import { Icon } from '@iconify/react/dist/iconify.js';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userAPI, authAPI, adminAPI, deliveryPointAPI, pmsmaAPI } from '../services/api';
import { getUserRole as getLoggedInUserRole } from '../services/auth';
import PasswordRequirements from './child/PasswordRequirements';
import { validatePassword } from '../helper/passwordValidation';
import { validateMobileNumber, formatMobileNumberInput } from '../utils/mobileValidation';

// Only active Delivery Points may be assigned to a new user. The API is asked for
// active ones, and this guards against any inactive record slipping through.
const activeOnly = (list) => (Array.isArray(list) ? list.filter((dp) => dp.is_active !== false) : []);

const AddUserLayer = () => {
    const navigate = useNavigate();
    const loggedInUserRole = getLoggedInUserRole();
    
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        role: '',
        full_name: '',
        mobile_number: '',
        password: '',
        district_id: null,
        block_id: null,
        sub_centre_id: null,
        usg_centre_id: null,
        dp_id: null,
        pmsma_centre_id: null,
    });
    
    const [roles, setRoles] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [blocks, setBlocks] = useState([]);
    const [subCentres, setSubCentres] = useState([]);
    const [usgCentres, setUSGCentres] = useState([]);
    const [deliveryPoints, setDeliveryPoints] = useState([]);
    const [pmsmaCentres, setPMSMACentres] = useState([]);
    const [wards, setWards] = useState([]);
    const [selectedWardIds, setSelectedWardIds] = useState([]);
    const [wardSearch, setWardSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [mobileError, setMobileError] = useState('');

    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            // Fetch current user info for block pre-selection
            const currentUserData = await authAPI.getCurrentUser();
            setCurrentUser(currentUserData);
            
            const rolesData = await authAPI.getRoles();
            setRoles(rolesData.roles || []);
            
            const districtsData = await adminAPI.getDistricts();
            setDistricts(districtsData);
            
            // Auto-select first district by default
            if (districtsData && districtsData.length > 0) {
                const firstDistrict = districtsData[0];
                if (firstDistrict) {
                    setFormData(prev => ({...prev, district_id: firstDistrict.id}));
                    const blocksData = await adminAPI.getBlocks(0, 100, firstDistrict.id);
                    setBlocks(blocksData);
                    
                    if (currentUserData && currentUserData.role === 'block' && currentUserData.block_id) {
                        setFormData(prev => ({...prev, block_id: currentUserData.block_id}));
                        const subCentresData = await adminAPI.getSubCentres(0, 100, currentUserData.block_id);
                        setSubCentres(subCentresData);
                        const wardsData = await adminAPI.getWards(0, 10000, currentUserData.block_id);
                        setWards(wardsData);
                    }
                    
                    const usgCentresData = await adminAPI.getUSGCentres(0, 100, firstDistrict.id);
                    setUSGCentres(usgCentresData);
                    const dpData = await deliveryPointAPI.getDeliveryPoints(firstDistrict.id, null, true);
                    setDeliveryPoints(activeOnly(dpData));
                } else if (false) {
                    // If only one district available, select it by default
                    const singleDistrict = districtsData[0];
                    setFormData(prev => ({...prev, district_id: singleDistrict.id}));
                    // Fetch blocks for the single district
                    const blocksData = await adminAPI.getBlocks(0, 100, singleDistrict.id);
                    setBlocks(blocksData);
                    
                    // Auto-select block if current user is block user
                    if (currentUserData && currentUserData.role === 'block' && currentUserData.block_id) {
                        setFormData(prev => ({...prev, block_id: currentUserData.block_id}));
                        // Fetch sub-centres and wards for the user's block
                        const subCentresData = await adminAPI.getSubCentres(0, 100, currentUserData.block_id);
                        setSubCentres(subCentresData);
                        const wardsData = await adminAPI.getWards(0, 10000, currentUserData.block_id);
                        setWards(wardsData);
                    }
                    
                    const usgCentresData = await adminAPI.getUSGCentres(0, 100, singleDistrict.id);
                    setUSGCentres(usgCentresData);
                    const dpData = await deliveryPointAPI.getDeliveryPoints(singleDistrict.id, null, true);
                    setDeliveryPoints(activeOnly(dpData));
                }
            }
        } catch (error) {
            console.error('Error fetching initial data:', error);
        }
    };

    const handleRoleChange = async (role) => {
        // For block users, preserve their pre-selected block_id
        if (currentUser && currentUser.role === 'block' && currentUser.block_id) {
            setFormData({...formData, role, sub_centre_id: null, usg_centre_id: null, dp_id: null, pmsma_centre_id: null});
        } else {
            setFormData({...formData, role, block_id: null, sub_centre_id: null, usg_centre_id: null, dp_id: null, pmsma_centre_id: null});
        }
        // Fetch delivery points when dp role selected
        if (role === 'dp' && formData.district_id) {
            const dpData = await deliveryPointAPI.getDeliveryPoints(formData.district_id, null, true);
            setDeliveryPoints(activeOnly(dpData));
        }
        // Fetch PMSMA centres when pmsma role selected (pre-selected block for block-admin creators)
        if (role === 'pmsma') {
            const presetBlockId = currentUser && currentUser.role === 'block' && currentUser.block_id
                ? currentUser.block_id
                : formData.block_id;
            if (presetBlockId) {
                const pmsmaCentreData = await pmsmaAPI.getPMSMACentres(formData.district_id, presetBlockId);
                setPMSMACentres(Array.isArray(pmsmaCentreData) ? pmsmaCentreData : []);
            }
        }
    };

    const handleDistrictChange = async (districtId) => {
        setFormData({...formData, district_id: Number(districtId), block_id: null, sub_centre_id: null, usg_centre_id: null, dp_id: null});
        if (districtId) {
            const blocksData = await adminAPI.getBlocks(0, 100, districtId);
            setBlocks(blocksData);
            const usgCentresData = await adminAPI.getUSGCentres(0, 100, districtId);
            setUSGCentres(usgCentresData);
            const dpData = await deliveryPointAPI.getDeliveryPoints(districtId, null, true);
            setDeliveryPoints(activeOnly(dpData));
        }
    };

    const handleBlockChange = async (blockId) => {
        setFormData({...formData, block_id: Number(blockId), sub_centre_id: null, usg_centre_id: null, pmsma_centre_id: null});
        if (blockId) {
            const subCentresData = await adminAPI.getSubCentres(0, 100, blockId);
            setSubCentres(subCentresData);
            const wardsData = await adminAPI.getWards(0, 10000, blockId);
            setWards(wardsData);
            if (formData.district_id) {
                const usgCentresData = await adminAPI.getUSGCentres(0, 100, formData.district_id, blockId);
                setUSGCentres(usgCentresData);
            }
            if (formData.role === 'pmsma') {
                const pmsmaCentreData = await pmsmaAPI.getPMSMACentres(formData.district_id, blockId);
                setPMSMACentres(Array.isArray(pmsmaCentreData) ? pmsmaCentreData : []);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            const userData = {
                username: formData.username,
                email: formData.email,
                role: formData.role,
                full_name: formData.full_name,
                mobile_number: formData.mobile_number,
                password: formData.password,
                district_id: formData.district_id,
                block_id: formData.block_id,
                sub_centre_id: formData.sub_centre_id,
                usg_centre_id: formData.usg_centre_id,
                dp_id: formData.dp_id,
                pmsma_centre_id: formData.pmsma_centre_id,
                ward_ids: selectedWardIds,
            };
            
            const errors = validatePassword(formData.password);
            if (errors.length > 0) {
                alert('Password does not meet requirements');
                return;
            }
            
            const mobileValidation = validateMobileNumber(formData.mobile_number);
            if (!mobileValidation.isValid) {
                setMobileError(mobileValidation.error);
                alert('Please enter a valid mobile number');
                return;
            }
            
            await userAPI.createUser(userData);
            alert('User created successfully');
            navigate('/users-list');
        } catch (error) {
            console.error('Error creating user:', error);
            alert(error.message || 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    const showBlockField = ['block', 'sub_centre', 'usg_centre', 'pmsma'].includes(formData.role);
    const showSubCentreField = formData.role === 'sub_centre';
    const showUSGCentreField = formData.role === 'usg_centre';
    const showDPField = formData.role === 'dp';
    const showPMSMACentreField = formData.role === 'pmsma';

    return (
        <div className="card h-100 p-0 radius-12">
            <div className="card-body p-24">
                <div className="row justify-content-center">
                    <div className="col-xxl-8 col-xl-10 col-lg-12">
                        <div className="card border">
                            <div className="card-body">
                                <h6 className="text-md text-primary-light mb-16">Add New User</h6>
                                <form onSubmit={handleSubmit}>
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label">Full Name <span className="text-danger-600">*</span></label>
                                            <input type="text" className="form-control" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} required />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Username <span className="text-danger-600">*</span></label>
                                            <input type="text" className="form-control" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} required />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Email <span className="text-danger-600">*</span></label>
                                            <input type="email" className="form-control" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Mobile Number <span className="text-danger-600">*</span></label>
                                            <input 
                                                type="text" 
                                                className={`form-control ${mobileError ? 'is-invalid' : ''}`}
                                                value={formData.mobile_number} 
                                                onChange={(e) => {
                                                    const formatted = formatMobileNumberInput(e.target.value);
                                                    setFormData({...formData, mobile_number: formatted});
                                                    if (formatted) {
                                                        const validation = validateMobileNumber(formatted);
                                                        setMobileError(validation.isValid ? '' : validation.error);
                                                    } else {
                                                        setMobileError('');
                                                    }
                                                }}
                                                onBlur={() => {
                                                    if (formData.mobile_number) {
                                                        const validation = validateMobileNumber(formData.mobile_number);
                                                        setMobileError(validation.isValid ? '' : validation.error);
                                                    }
                                                }}
                                                maxLength="10"
                                                placeholder="Enter 10-digit mobile number"
                                                required 
                                            />
                                            {mobileError && <div className="text-danger-600 text-sm mt-1">{mobileError}</div>}
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Password <span className="text-danger-600">*</span></label>
                                            <div className="position-relative">
                                                <input 
                                                    type={showPassword ? 'text' : 'password'} 
                                                    className="form-control" 
                                                    value={formData.password} 
                                                    onChange={(e) => {
                                                        const pwd = e.target.value;
                                                        setFormData({...formData, password: pwd});
                                                    }} 
                                                    required 
                                                />
                                                <span 
                                                    className="position-absolute end-0 top-50 translate-middle-y me-16 cursor-pointer"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    <Icon icon={showPassword ? 'ri:eye-line' : 'ri:eye-off-line'} />
                                                </span>
                                            </div>
                                            {formData.password && (
                                                <div className="mt-2">
                                                    <PasswordRequirements password={formData.password} showStrength={true} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Role <span className="text-danger-600">*</span></label>
                                            <select className="form-select" value={formData.role} onChange={(e) => handleRoleChange(e.target.value)} required>
                                                <option value="">Select Role</option>
                                                {Array.isArray(roles) && roles.filter(role => {
                                                    if (role.value === 'district') return false;
                                                    if (loggedInUserRole === 'block') return ['sub_centre', 'usg_centre'].includes(role.value);
                                                    return true;
                                                }).map(role => (
                                                    <option key={role.value} value={role.value}>{role.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            {districts.length > 0 ? (
                                                <>
                                                    <label className="form-label">District</label>
                                                    <input 
                                                        type="text" 
                                                        className="form-control" 
                                                        value={districts[0]?.name || ''} 
                                                        readOnly 
                                                        style={{backgroundColor: '#f8f9fa'}}
                                                    />
                                                </>
                                            ) : districts.length === 1 ? (
                                                <>
                                                    <label className="form-label">District</label>
                                                    <input 
                                                        type="text" 
                                                        className="form-control" 
                                                        value={districts[0]?.name || ''} 
                                                        readOnly 
                                                        style={{backgroundColor: '#f8f9fa'}}
                                                    />
                                                </>
                                            ) : (
                                                <>
                                                    <label className="form-label">District <span className="text-danger-600">*</span></label>
                                                    <select className="form-select" value={formData.district_id || ''} onChange={(e) => handleDistrictChange(e.target.value)} required>
                                                        <option value="">Select District</option>
                                                        {Array.isArray(districts) && districts.map(district => (
                                                            <option key={district.id} value={district.id}>{district.name}</option>
                                                        ))}
                                                    </select>
                                                </>
                                            )}
                                        </div>
                                        {showBlockField && (
                                            <div className="col-md-6">
                                                <label className="form-label">Block <span className="text-danger-600">*</span></label>
                                                {currentUser && currentUser.role === 'block' && currentUser.block_id ? (
                                                    <input 
                                                        type="text" 
                                                        className="form-control" 
                                                        value={blocks.find(b => b.id === currentUser.block_id)?.name || ''} 
                                                        readOnly 
                                                        style={{backgroundColor: '#f8f9fa'}}
                                                    />
                                                ) : (
                                                    <select className="form-select" value={formData.block_id || ''} onChange={(e) => handleBlockChange(e.target.value)} required>
                                                        <option value="">Select Block</option>
                                                        {Array.isArray(blocks) && blocks.map(block => (
                                                            <option key={block.id} value={block.id}>{block.name}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        )}
                                        {showSubCentreField && (
                                            <div className="col-md-6">
                                                <label className="form-label">Sub Centre <span className="text-danger-600">*</span></label>
                                                <select className="form-select" value={formData.sub_centre_id || ''} onChange={(e) => setFormData({...formData, sub_centre_id: Number(e.target.value)})} required disabled={formData.block_id && subCentres.length === 0}>
                                                    <option value="">
                                                        {!formData.block_id 
                                                            ? 'Select Block First' 
                                                            : subCentres.length === 0 
                                                            ? 'No sub-center found for the selected block' 
                                                            : 'Select Sub Centre'}
                                                    </option>
                                                    {Array.isArray(subCentres) && subCentres.map(subCentre => (
                                                        <option key={subCentre.id} value={subCentre.id}>{subCentre.name}</option>
                                                    ))}
                                                </select>
                                                {formData.block_id && subCentres.length === 0 && (
                                                    <small className="text-danger-600 mt-1 d-block">
                                                        <Icon icon="material-symbols:info-outline" className="me-1" />
                                                        No sub-center found for the selected block
                                                    </small>
                                                )}
                                            </div>
                                        )}
                                        {showUSGCentreField && (
                                            <div className="col-md-6">
                                                <label className="form-label">USG Centre</label>
                                                <select className="form-select" value={formData.usg_centre_id || ''} onChange={(e) => setFormData({...formData, usg_centre_id: Number(e.target.value) || null})}>
                                                    <option value="">Select USG Centre</option>
                                                    {Array.isArray(usgCentres) && usgCentres.map(usgCentre => (
                                                        <option key={usgCentre.id} value={usgCentre.id}>{usgCentre.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        {showPMSMACentreField && (
                                            <div className="col-md-6">
                                                <label className="form-label">PMSMA Centre</label>
                                                <select className="form-select" value={formData.pmsma_centre_id || ''} onChange={(e) => setFormData({...formData, pmsma_centre_id: Number(e.target.value) || null})} disabled={formData.block_id && pmsmaCentres.length === 0}>
                                                    <option value="">
                                                        {!formData.block_id
                                                            ? 'Select Block First'
                                                            : pmsmaCentres.length === 0
                                                            ? 'No PMSMA centre found for the selected block'
                                                            : 'Select PMSMA Centre'}
                                                    </option>
                                                    {Array.isArray(pmsmaCentres) && pmsmaCentres.map(centre => (
                                                        <option key={centre.id} value={centre.id}>{centre.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        {showDPField && (
                                            <div className="col-md-6">
                                                <label className="form-label">Delivery Point <span className="text-danger-600">*</span></label>
                                                <select className="form-select" value={formData.dp_id || ''} onChange={(e) => setFormData({...formData, dp_id: Number(e.target.value) || null})} required>
                                                    <option value="">{deliveryPoints.length === 0 ? 'No delivery points found' : 'Select Delivery Point'}</option>
                                                    {Array.isArray(deliveryPoints) && deliveryPoints.map(dp => (
                                                        <option key={dp.id} value={dp.id}>{dp.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        {showSubCentreField && formData.block_id && (
                                            <div className="col-12">
                                                <label className="form-label">Assigned Wards (Optional)</label>
                                                <div className="position-relative mb-2">
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        placeholder="Search wards..."
                                                        value={wardSearch}
                                                        onChange={(e) => setWardSearch(e.target.value)}
                                                        style={{paddingLeft: '32px'}}
                                                    />
                                                    <Icon icon="ion:search-outline" className="position-absolute start-0 top-50 translate-middle-y ms-2 text-secondary-light" />
                                                </div>
                                                <div className="border rounded p-3" style={{maxHeight: '200px', overflowY: 'auto'}}>
                                                    {wards.length === 0 ? (
                                                        <small className="text-muted">No wards available</small>
                                                    ) : wards.filter(w =>
                                                        !wardSearch ||
                                                        w.name?.toLowerCase().includes(wardSearch.toLowerCase()) ||
                                                        w.code?.toLowerCase().includes(wardSearch.toLowerCase())
                                                    ).length === 0 ? (
                                                        <small className="text-muted">No wards match your search</small>
                                                    ) : (
                                                        wards
                                                            .filter(w =>
                                                                !wardSearch ||
                                                                w.name?.toLowerCase().includes(wardSearch.toLowerCase()) ||
                                                                w.code?.toLowerCase().includes(wardSearch.toLowerCase())
                                                            )
                                                            .map(ward => (
                                                                <div key={ward.id} className="form-check mb-2">
                                                                    <input 
                                                                        className="form-check-input" 
                                                                        type="checkbox" 
                                                                        value={ward.id}
                                                                        checked={selectedWardIds.includes(Number(ward.id))}
                                                                        onChange={(e) => {
                                                                            if (e.target.checked) {
                                                                                setSelectedWardIds([...selectedWardIds, Number(ward.id)]);
                                                                            } else {
                                                                                setSelectedWardIds(selectedWardIds.filter(id => id !== Number(ward.id)));
                                                                            }
                                                                        }}
                                                                    />
                                                                    <label className="form-check-label">
                                                                        {ward.name} ({ward.code})
                                                                    </label>
                                                                </div>
                                                            ))
                                                    )}
                                                </div>
                                                <small className="text-muted d-block mt-2">Leave empty to allow access to all wards in the sub-centre</small>
                                            </div>
                                        )}
                                    </div>
                                    <div className="d-flex align-items-center justify-content-center gap-3 mt-24">
                                        <button type="button" className="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-56 py-11 radius-8" onClick={() => navigate('/users-list')}>
                                            Cancel
                                        </button>
                                        <button type="submit" className="btn btn-primary border border-primary-600 text-md px-56 py-12 radius-8" disabled={loading}>
                                            {loading ? 'Creating...' : 'Create User'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddUserLayer;