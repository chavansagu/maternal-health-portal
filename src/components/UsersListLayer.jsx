import { Icon } from '@iconify/react/dist/iconify.js';
import React, { useEffect, useState } from 'react';
import {
    ListToolbar, ToolbarLeft, ToolbarRight, EntriesSelect, SearchBox, FilterSelect, AddButton, TableFooter,
} from './common/ListControls';
import { userAPI, authAPI, adminAPI } from '../services/api';
import { validateMobileNumber, formatMobileNumberInput } from '../utils/mobileValidation';
import { formatDate } from '../utils/dateFormatter';

const UsersListLayer = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [limit, setLimit] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewUser, setViewUser] = useState(null);
    const [editUser, setEditUser] = useState(null);
    const [deleteUserId, setDeleteUserId] = useState(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showActivateModal, setShowActivateModal] = useState(false);
    const [activateUserId, setActivateUserId] = useState(null);
    const [roles, setRoles] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [blocks, setBlocks] = useState([]);
    const [subCentres, setSubCentres] = useState([]);
    const [usgCentres, setUSGCentres] = useState([]);
    const [wards, setWards] = useState([]);
    const [selectedWardIds, setSelectedWardIds] = useState([]);
    const [wardSearch, setWardSearch] = useState('');
    const [mobileError, setMobileError] = useState('');

    useEffect(() => {
        fetchUsers();
    }, [roleFilter, statusFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [limit, roleFilter, statusFilter, searchTerm]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const isActive = statusFilter === 'Active' ? true : statusFilter === 'Inactive' ? false : null;
            const data = await userAPI.getUsers(0, 10000, roleFilter || null, isActive);
            setUsers(data);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewUser = async (userId) => {
        try {
            const data = await userAPI.getUserById(userId);
            setViewUser(data);
            setShowViewModal(true);
        } catch (error) {
            console.error('Error fetching user details:', error);
            alert('Failed to load user details');
        }
    };

    const handleEditUser = async (userId) => {
        try {
            const data = await userAPI.getUserById(userId);
            setEditUser(data);
            
            const rolesData = await authAPI.getRoles();
            setRoles(rolesData.roles || []);
            
            const districtsData = await adminAPI.getDistricts();
            setDistricts(districtsData);
            
            // Auto-select first district by default
            const effectiveDistrictId = data.district_id || (districtsData && districtsData.length > 0 ? districtsData[0].id : null);
            setEditUser({...data, district_id: effectiveDistrictId});
            
            if (effectiveDistrictId) {
                const districtId = effectiveDistrictId;
                const blocksData = await adminAPI.getBlocks(0, 100, districtId);
                setBlocks(blocksData);
                const usgCentresData = await adminAPI.getUSGCentres(0, 100, districtId);
                setUSGCentres(usgCentresData);
            }
            
            if (data.block_id) {
                const subCentresData = await adminAPI.getSubCentres(0, 100, data.block_id);
                setSubCentres(subCentresData);
                const wardsData = await adminAPI.getWards(0, 10000, data.block_id);
                setWards(wardsData);
            }
            setSelectedWardIds((data.ward_ids || []).map(Number));
            setWardSearch('');
            
            setShowEditModal(true);
        } catch (error) {
            console.error('Error fetching user details:', error);
            alert('Failed to load user details');
        }
    };

    const handleDistrictChange = async (districtId) => {
        setEditUser({...editUser, district_id: Number(districtId), block_id: null, sub_centre_id: null});
        if (districtId) {
            const blocksData = await adminAPI.getBlocks(0, 100, districtId);
            setBlocks(blocksData);
            const usgCentresData = await adminAPI.getUSGCentres(0, 100, districtId);
            setUSGCentres(usgCentresData);
        }
    };

    const handleBlockChange = async (blockId) => {
        setEditUser({...editUser, block_id: Number(blockId), sub_centre_id: null, usg_centre_id: null});
        if (blockId) {
            const subCentresData = await adminAPI.getSubCentres(0, 100, blockId);
            setSubCentres(subCentresData);
            const wardsData = await adminAPI.getWards(0, 10000, blockId);
            setWards(wardsData);
            if (editUser.district_id) {
                const usgCentresData = await adminAPI.getUSGCentres(0, 100, editUser.district_id, blockId);
                setUSGCentres(usgCentresData);
            }
        }
    };

    const handleRoleChange = (role) => {
        setEditUser({...editUser, role, block_id: null, sub_centre_id: null, usg_centre_id: null});
        setSelectedWardIds([]);
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        
        const mobileValidation = validateMobileNumber(editUser.mobile_number);
        if (!mobileValidation.isValid) {
            setMobileError(mobileValidation.error);
            alert('Please enter a valid mobile number');
            return;
        }
        
        try {
            await userAPI.updateUser(editUser.id, {
                email: editUser.email,
                full_name: editUser.full_name,
                mobile_number: editUser.mobile_number,
            });
            
            if (editUser.role === 'sub_centre' && editUser.block_id) {
                await userAPI.updateUserWards(editUser.id, selectedWardIds);
            }
            
            setShowEditModal(false);
            setEditUser(null);
            fetchUsers();
            alert('User updated successfully');
        } catch (error) {
            console.error('Error updating user:', error);
            alert('Failed to update user');
        }
    };

    const handleDeleteUser = async () => {
        try {
            await userAPI.deleteUser(deleteUserId);
            setShowDeleteModal(false);
            setDeleteUserId(null);
            fetchUsers();
            alert('User deactivated successfully');
        } catch (error) {
            console.error('Error deactivating user:', error);
            alert('Failed to deactivate user');
        }
    };

    const handleActivateUser = async () => {
        try {
            await userAPI.activateUser(activateUserId);
            setShowActivateModal(false);
            setActivateUserId(null);
            fetchUsers();
            alert('User activated successfully');
        } catch (error) {
            console.error('Error activating user:', error);
            alert('Failed to activate user');
        }
    };

    const filteredUsers = users.filter(user =>
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const paginatedUsers = filteredUsers.slice((currentPage - 1) * limit, currentPage * limit);
    const totalPages = Math.ceil(filteredUsers.length / limit);



    const trimText = (text, maxLength = 15) => {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    // Format role names to camel case
    const formatRole = (role) => {
        if (!role) return '';
        
        const roleMap = {
            'district': 'District',
            'block': 'Block',
            'sub_centre': 'Sub-Centre',
            'usg_centre': 'USG Centre',
            'dp': 'Delivery Point',
            'pmsma': 'PMSMA',
            'super_admin': 'SuperAdmin',
            'data_entry_operator': 'DataEntryOperator',
            'admin': 'Admin',
            'user': 'User'
        };
        
        // If role exists in map, return mapped value
        if (roleMap[role]) {
            return roleMap[role];
        }
        
        // For any other roles, convert to proper camel case
        return role.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join('');
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{minHeight: '400px'}}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="card h-100 p-0 radius-12">
            <ListToolbar asHeader>
                <ToolbarLeft>
                    <EntriesSelect value={limit} onChange={setLimit} />
                    <SearchBox value={searchTerm} onChange={setSearchTerm} placeholder="Search..." />
                    <FilterSelect value={statusFilter} onChange={setStatusFilter} ariaLabel="Filter by status">
                        <option value="">All Status</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </FilterSelect>
                    <FilterSelect value={roleFilter} onChange={setRoleFilter} ariaLabel="Filter by role">
                        <option value="">All Roles</option>
                        <option value="district">District</option>
                        <option value="block">Block</option>
                        <option value="sub_centre">Sub Centre</option>
                        <option value="usg_centre">USG Centre</option>
                        <option value="dp">Delivery Point</option>
                        <option value="pmsma">PMSMA</option>
                    </FilterSelect>
                </ToolbarLeft>
                <ToolbarRight>
                    <AddButton to="/add-user">Add New User</AddButton>
                </ToolbarRight>
            </ListToolbar>
            <div className="card-body p-24">
                <div className="table-responsive scroll-sm">
                    <table className="table bordered-table sm-table mb-0">
                        <thead>
                            <tr>
                                <th scope="col">S.L</th>
                                <th scope="col">Join Date</th>
                                <th scope="col">Name</th>
                                <th scope="col">Email</th>
                                <th scope="col">Mobile</th>
                                <th scope="col" className="text-center">Role</th>
                                <th scope="col" className="text-center">Status</th>
                                <th scope="col" className="text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-4">No users found</td>
                                </tr>
                            ) : (
                                paginatedUsers.map((user, index) => (
                                    <tr key={user.id}>
                                        <td>{(currentPage - 1) * limit + index + 1}</td>
                                        <td>{formatDate(user.created_at)}</td>
                                        <td>
                                            <span className="text-md mb-0 fw-normal text-secondary-light" title={user.full_name}>
                                                {trimText(user.full_name)}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="text-md mb-0 fw-normal text-secondary-light" title={user.email}>
                                                {trimText(user.email)}
                                            </span>
                                        </td>
                                        <td>{user.mobile_number}</td>
                                        <td className="text-center">
                                            <span className="px-24 py-4 rounded-pill fw-medium text-sm bg-info-focus text-info-main">
                                                {formatRole(user.role)}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            <span className={`px-24 py-4 rounded-pill fw-medium text-sm ${
                                                user.is_active 
                                                    ? 'bg-success-focus text-success-main' 
                                                    : 'bg-neutral-200 text-neutral-600'
                                            }`}>
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            <div className="d-flex align-items-center gap-10 justify-content-center">
                                                <button
                                                    type="button"
                                                    className="bg-info-focus bg-hover-info-200 text-info-600 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle"
                                                    onClick={() => handleViewUser(user.id)}
                                                    title="View User"
                                                >
                                                    <Icon icon="majesticons:eye-line" className="icon text-xl" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="bg-success-focus text-success-600 bg-hover-success-200 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle"
                                                    onClick={() => handleEditUser(user.id)}
                                                    title="Edit User"
                                                >
                                                    <Icon icon="lucide:edit" className="menu-icon" />
                                                </button>
                                                {user.is_active ? (
                                                    <button
                                                        type="button"
                                                        className="remove-item-btn bg-danger-focus bg-hover-danger-200 text-danger-600 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle"
                                                        onClick={() => { setDeleteUserId(user.id); setShowDeleteModal(true); }}
                                                        title="Deactivate User"
                                                    >
                                                        <Icon icon="fluent:delete-24-regular" className="menu-icon" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="bg-primary-50 bg-hover-primary-100 text-primary-600 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle"
                                                        onClick={() => { setActivateUserId(user.id); setShowActivateModal(true); }}
                                                        title="Activate User"
                                                    >
                                                        <Icon icon="mdi:check-circle" className="menu-icon" />
                                                    </button>
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
                    total={filteredUsers.length}
                    page={currentPage}
                    pageSize={limit}
                    onPageChange={setCurrentPage}
                />
            </div>

            {/* View User Modal */}
            {showViewModal && viewUser && (
                <>
                <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">User Details</h5>
                                <button type="button" className="btn-close" onClick={() => setShowViewModal(false)} aria-label="Close"></button>
                            </div>
                            <div className="modal-body">
                                <div className="row g-24">
                                    <div className="col-6">
                                        <div className="text-sm text-secondary-light mb-4">Full Name :</div>
                                        <div className="text-md fw-medium text-primary-light">{viewUser.full_name}</div>
                                    </div>
                                    <div className="col-6">
                                        <div className="text-sm text-secondary-light mb-4">Username :</div>
                                        <div className="text-md fw-medium text-primary-light">{viewUser.username}</div>
                                    </div>
                                    <div className="col-6">
                                        <div className="text-sm text-secondary-light mb-4">Email :</div>
                                        <div className="text-md fw-medium text-primary-light">{viewUser.email}</div>
                                    </div>
                                    <div className="col-6">
                                        <div className="text-sm text-secondary-light mb-4">Mobile :</div>
                                        <div className="text-md fw-medium text-primary-light">{viewUser.mobile_number}</div>
                                    </div>
                                    <div className="col-6">
                                        <div className="bg-neutral-50 border border-neutral-200 p-16 radius-8">
                                            <div className="text-sm text-secondary-light mb-8">Role :</div>
                                            <span className="badge bg-info-focus text-info-600 px-12 py-4 radius-4">{formatRole(viewUser.role)}</span>
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <div className="bg-neutral-50 border border-neutral-200 p-16 radius-8">
                                            <div className="text-sm text-secondary-light mb-8">Status :</div>
                                            {viewUser.is_active ? (
                                                <span className="badge bg-success-focus text-success-600 px-12 py-4 radius-4">Active</span>
                                            ) : (
                                                <span className="badge bg-neutral-200 text-neutral-600 px-12 py-4 radius-4">Inactive</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="col-12 mt-24 mb-24">
                                        <div className="bg-neutral-50 border border-neutral-200 p-16 radius-8">
                                            <div className="row g-16">
                                                <div className="col-6">
                                                    <div className="text-sm text-secondary-light mb-4">District :</div>
                                                    <div className="text-md fw-medium text-primary-light">{viewUser.district_name || '-'}</div>
                                                </div>
                                                <div className="col-6">
                                                    <div className="text-sm text-secondary-light mb-4">Block :</div>
                                                    <div className="text-md fw-medium text-primary-light">{viewUser.block_name || '-'}</div>
                                                </div>
                                                <div className="col-6">
                                                    <div className="text-sm text-secondary-light mb-4">Sub-Centre :</div>
                                                    <div className="text-md fw-medium text-primary-light">{viewUser.sub_centre_name || '-'}</div>
                                                </div>
                                                <div className="col-6">
                                                    <div className="text-sm text-secondary-light mb-4">USG-Centre :</div>
                                                    <div className="text-md fw-medium text-primary-light">{viewUser.usg_centre_name || '-'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {viewUser.role === 'sub_centre' && viewUser.ward_ids && viewUser.ward_ids.length > 0 && (
                                        <div className="col-12">
                                            <div className="bg-neutral-50 border border-neutral-200 p-16 radius-8">
                                                <div className="text-sm text-secondary-light mb-8">Assigned Wards :</div>
                                                {viewUser.ward_ids.length > 0 ? (
                                                    <div className="d-flex flex-wrap gap-2">
                                                        {viewUser.ward_names && viewUser.ward_names.length > 0 ? (
                                                            viewUser.ward_names.map((wardName, index) => (
                                                                <span key={index} className="badge bg-primary-focus text-primary-600 px-12 py-4 radius-4">
                                                                    {wardName}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            viewUser.ward_ids.map(wardId => (
                                                                <span key={wardId} className="badge bg-primary-focus text-primary-600 px-12 py-4 radius-4">
                                                                    Ward ID: {wardId}
                                                                </span>
                                                            ))
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-md fw-medium text-secondary-light">All Wards (No specific assignment)</span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    <div className="col-6">
                                        <div className="bg-neutral-50 border border-neutral-200 p-16 radius-8">
                                            <div className="text-sm text-secondary-light mb-8">Updated :</div>
                                            <div className="text-md fw-medium text-primary-light">{formatDate(viewUser.updated_at)}</div>
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <div className="bg-neutral-50 border border-neutral-200 p-16 radius-8">
                                            <div className="text-sm text-secondary-light mb-8">Created :</div>
                                            <div className="text-md fw-medium text-primary-light">{formatDate(viewUser.created_at)}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer justify-content-center">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowViewModal(false)}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="modal-backdrop fade show" onClick={() => setShowViewModal(false)}></div>
                </>
            )}

            {showEditModal && editUser && (
                <>
                <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content">
                            <form onSubmit={handleUpdateUser}>
                                <div className="modal-header">
                                    <h5 className="modal-title">Edit User</h5>
                                    <button type="button" className="btn-close" onClick={() => { setShowEditModal(false); setWardSearch(''); }} aria-label="Close"></button>
                                </div>
                                <div className="modal-body">
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label">Full Name</label>
                                            <input type="text" className="form-control" value={editUser.full_name} onChange={(e) => setEditUser({...editUser, full_name: e.target.value})} required />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Username</label>
                                            <input type="text" className="form-control" value={editUser.username} readOnly />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Email</label>
                                            <input type="email" className="form-control" value={editUser.email} onChange={(e) => setEditUser({...editUser, email: e.target.value})} required />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Mobile Number</label>
                                            <input 
                                                type="text" 
                                                className={`form-control ${mobileError ? 'is-invalid' : ''}`}
                                                value={editUser.mobile_number} 
                                                onChange={(e) => {
                                                    const formatted = formatMobileNumberInput(e.target.value);
                                                    setEditUser({...editUser, mobile_number: formatted});
                                                    if (formatted) {
                                                        const validation = validateMobileNumber(formatted);
                                                        setMobileError(validation.isValid ? '' : validation.error);
                                                    } else {
                                                        setMobileError('');
                                                    }
                                                }}
                                                onBlur={() => {
                                                    if (editUser.mobile_number) {
                                                        const validation = validateMobileNumber(editUser.mobile_number);
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
                                            <label className="form-label">Role</label>
                                            <input type="text" className="form-control" value={formatRole(editUser.role)} readOnly />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">District</label>
                                            <input type="text" className="form-control" value={editUser.district_name || districts.find(d => d.id === editUser.district_id)?.name || districts[0]?.name || ''} readOnly style={{backgroundColor: '#f8f9fa'}} />
                                        </div>
                                        {['block', 'sub_centre', 'usg_centre'].includes(editUser.role) && (
                                            <div className="col-md-6">
                                                <label className="form-label">Block</label>
                                                <input type="text" className="form-control" value={editUser.block_name || blocks.find(b => b.id === editUser.block_id)?.name || ''} readOnly />
                                            </div>
                                        )}
                                        {editUser.role === 'sub_centre' && (
                                            <div className="col-md-6">
                                                <label className="form-label">Sub Centre</label>
                                                <input type="text" className="form-control" value={editUser.sub_centre_name || subCentres.find(s => s.id === editUser.sub_centre_id)?.name || ''} readOnly />
                                            </div>
                                        )}
                                        {editUser.role === 'usg_centre' && (
                                            <div className="col-md-6">
                                                <label className="form-label">USG Centre</label>
                                                <select className="form-select" value={editUser.usg_centre_id || ''} onChange={(e) => setEditUser({...editUser, usg_centre_id: Number(e.target.value) || null})}>
                                                    <option value="">Select USG Centre</option>
                                                    {Array.isArray(usgCentres) && usgCentres
                                                        .filter(c => editUser.block_id ? c.block_id === editUser.block_id : true)
                                                        .map(usgCentre => (
                                                            <option key={usgCentre.id} value={usgCentre.id}>{usgCentre.name}</option>
                                                        ))}
                                                </select>
                                            </div>
                                        )}
                                        {editUser.role === 'sub_centre' && editUser.block_id && (
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
                                </div>
                                <div className="modal-footer justify-content-center">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary">Update User</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                <div className="modal-backdrop fade show" onClick={() => setShowEditModal(false)}></div>
                </>
            )}

            {showDeleteModal && (
                <>
                <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Confirm Deactivate</h5>
                            <button type="button" className="btn-close" onClick={() => setShowDeleteModal(false)} aria-label="Close"></button>
                        </div>
                        <div className="modal-body">
                            <p>Are you sure you want to deactivate this user? The user will be marked as inactive.</p>
                        </div>
                        <div className="modal-footer justify-content-center">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                            <button type="button" className="btn btn-danger" onClick={handleDeleteUser}>Deactivate</button>
                        </div>
                    </div>
                </div>
                </div>
                <div className="modal-backdrop fade show" onClick={() => setShowDeleteModal(false)}></div>
                </>
            )}

            {showActivateModal && (
                <>
                <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Confirm Activate</h5>
                            <button type="button" className="btn-close" onClick={() => setShowActivateModal(false)} aria-label="Close"></button>
                        </div>
                        <div className="modal-body">
                            <p>Are you sure you want to activate this user? The user will be marked as active.</p>
                        </div>
                        <div className="modal-footer justify-content-center">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowActivateModal(false)}>Cancel</button>
                            <button type="button" className="btn btn-success" onClick={handleActivateUser}>Activate</button>
                        </div>
                    </div>
                </div>
                </div>
                <div className="modal-backdrop fade show" onClick={() => setShowActivateModal(false)}></div>
                </>
            )}
        </div>
    );
};

export default UsersListLayer;
