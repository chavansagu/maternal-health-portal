import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';
import { grievanceAPI, adminAPI } from '../services/api';
import { getUserRole } from '../services/auth';
import { formatDate } from '../utils/dateFormatter';

const GrievanceManagementLayer = () => {
    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
    const [grievances, setGrievances] = useState([]);
    const [pendingGrievances, setPendingGrievances] = useState([]);
    const [activeTab, setActiveTab] = useState('escalated');
    const [districts, setDistricts] = useState([]);
    const [blocks, setBlocks] = useState([]);
    const [wards, setWards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showViewModal, setShowViewModal] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [showResolveModal, setShowResolveModal] = useState(false);
    const [selectedGrievance, setSelectedGrievance] = useState(null);
    const [updateData, setUpdateData] = useState({ status: '', notes: '' });
    const [resolutionData, setResolutionData] = useState({ resolution_notes: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const userRole = getUserRole();

    useEffect(() => {
        fetchAllData();
        fetchDistricts();
        fetchBlocks();
        fetchWards();
    }, []);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const [allData, pendingData] = await Promise.all([
                grievanceAPI.getGrievances(),
                grievanceAPI.getPendingGrievances()
            ]);
            setGrievances(allData);
            setPendingGrievances(pendingData);
        } catch (error) {
            console.error('Error fetching grievances:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateGrievance = async () => {
        try {
            await grievanceAPI.updateGrievance(selectedGrievance.id, updateData);
            alert('Grievance updated successfully');
            setShowUpdateModal(false);
            fetchAllData();
        } catch (error) {
            console.error('Error updating grievance:', error);
            alert('Failed to update grievance');
        }
    };

    const handleResolveGrievance = async () => {
        try {
            await grievanceAPI.resolveGrievance(selectedGrievance.id, resolutionData.resolution_notes);
            alert('Grievance resolved successfully');
            setShowResolveModal(false);
            fetchAllData();
        } catch (error) {
            console.error('Error resolving grievance:', error);
            alert('Failed to resolve grievance');
        }
    };

    const fetchDistricts = async () => {
        try {
            const data = await adminAPI.getDistricts();
            setDistricts(data);
        } catch (error) {
            console.error('Error fetching districts:', error);
        }
    };

    const fetchBlocks = async () => {
        try {
            const data = await adminAPI.getBlocks();
            setBlocks(data);
        } catch (error) {
            console.error('Error fetching blocks:', error);
        }
    };

    const fetchWards = async () => {
        try {
            const data = await adminAPI.getWards();
            setWards(data);
        } catch (error) {
            console.error('Error fetching wards:', error);
        }
    };

    const handleAutoEscalate = async () => {
        try {
            const result = await grievanceAPI.autoEscalateGrievances();
            alert(`Auto-escalated grievances successfully`);
            fetchAllData();
        } catch (error) {
            console.error('Error auto-escalating grievances:', error);
            alert('Failed to auto-escalate grievances');
        }
    };

    const getCurrentData = () => {
        switch (activeTab) {
            case 'pending': return grievances.filter(g => g.status === 'pending');
            case 'in_progress': return grievances.filter(g => g.status === 'in_progress');
            case 'resolved': return grievances.filter(g => g.status === 'resolved');
            case 'escalated': return grievances.filter(g => g.escalated_to_district);
            default: return grievances;
        }
    };

    const filteredData = getCurrentData().filter(grievance =>
        grievance.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grievance.mobile_number?.includes(searchTerm) ||
        grievance.ticket_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grievance.rch_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getDistrictName = (districtId) => districts.find(d => d.id === districtId)?.name || 'N/A';
    const getBlockName = (blockId) => blocks.find(b => b.id === blockId)?.name || 'N/A';
    const getWardName = (wardId) => wards.find(w => w.id === wardId)?.name || 'N/A';

    // Smart pagination function to show only relevant page numbers
    const getVisiblePages = (currentPage, totalPages) => {
        const delta = 2; // Show 2 pages before and after current page
        const range = [];
        const rangeWithDots = [];

        for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
            range.push(i);
        }

        if (currentPage - delta > 2) {
            rangeWithDots.push(1, '...');
        } else {
            rangeWithDots.push(1);
        }

        rangeWithDots.push(...range);

        if (currentPage + delta < totalPages - 1) {
            rangeWithDots.push('...', totalPages);
        } else {
            rangeWithDots.push(totalPages);
        }

        return rangeWithDots.filter((item, index, arr) => arr.indexOf(item) === index);
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            pending: { class: 'bg-warning-focus text-warning-main', text: 'Pending' },
            in_progress: { class: 'bg-info-focus text-info-main', text: 'In Progress' },
            resolved: { class: 'bg-success-focus text-success-main', text: 'Resolved' }
        };
        const config = statusConfig[status] || { class: 'bg-neutral-200 text-neutral-600', text: status };
        return <span className={`px-24 py-4 rounded-pill fw-medium text-sm ${config.class}`}>{config.text}</span>;
    };

    return (
        <div className="card h-100 p-0 radius-12">
            {/* Statistics Cards */}
            <div className="col-12">
                <div className="card radius-12">
                    <div className="card-body p-16">
                        <div className="row gy-4">
                            <div className="col-xxl-3 col-xl-4 col-sm-6">
                                <div className="px-20 py-16 shadow-none radius-8 h-100 gradient-deep-1 left-line line-bg-primary position-relative overflow-hidden">
                                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8">
                                        <div>
                                            <span className="mb-2 fw-medium text-secondary-light text-md">
                                                Total Grievances
                                            </span>
                                            <h6 className="fw-semibold mb-1">{grievances.length}</h6>
                                        </div>
                                        <span className="w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-2xl mb-12 bg-primary-100 text-primary-600">
                                            <Icon icon="material-symbols:support-agent" />
                                        </span>
                                    </div>
                                    <p className="text-sm mb-0">
                                        <span className="bg-success-focus px-1 rounded-2 fw-medium text-success-main text-sm">
                                            <Icon icon="ri:arrow-right-up-line" /> Active
                                        </span>{" "}
                                        Support Cases{" "}
                                    </p>
                                </div>
                            </div>
                            <div className="col-xxl-3 col-xl-4 col-sm-6">
                                <div className="px-20 py-16 shadow-none radius-8 h-100 gradient-deep-2 left-line line-bg-lilac position-relative overflow-hidden">
                                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8">
                                        <div>
                                            <span className="mb-2 fw-medium text-secondary-light text-md">
                                                Pending
                                            </span>
                                            <h6 className="fw-semibold mb-1">{pendingGrievances.length}</h6>
                                        </div>
                                        <span className="w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-2xl mb-12 bg-lilac-200 text-lilac-600">
                                            <Icon icon="material-symbols:pending" />
                                        </span>
                                    </div>
                                    <p className="text-sm mb-0">
                                        <span className="bg-warning-focus px-1 rounded-2 fw-medium text-warning-main text-sm">
                                            <Icon icon="ri:arrow-right-up-line" /> Pending
                                        </span>{" "}
                                        Awaiting Action{" "}
                                    </p>
                                </div>
                            </div>
                            <div className="col-xxl-3 col-xl-4 col-sm-6">
                                <div className="px-20 py-16 shadow-none radius-8 h-100 bg-danger-100 left-line line-bg-danger position-relative overflow-hidden">
                                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8">
                                        <div>
                                            <span className="mb-2 fw-medium text-secondary-light text-md">
                                                Escalated
                                            </span>
                                            <h6 className="fw-semibold mb-1">{grievances.filter(g => g.escalated_to_district).length}</h6>
                                        </div>
                                        <span className="w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-2xl mb-12 bg-danger-200 text-danger-600">
                                            <Icon icon="material-symbols:escalator-warning" />
                                        </span>
                                    </div>
                                    <p className="text-sm mb-0">
                                        <span className="bg-danger-focus px-1 rounded-2 fw-medium text-danger-main text-sm">
                                            <Icon icon="ri:arrow-right-up-line" /> Critical
                                        </span>{" "}
                                        Higher Level{" "}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs and Actions */}
            <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between">
                <div className="d-flex align-items-center flex-wrap gap-3">
                    <ul className="nav border-gradient-tab nav-pills" role="tablist">
                        <li className="nav-item" role="presentation">
                            <button
                                className={`nav-link ${activeTab === 'escalated' ? 'active' : ''}`}
                                onClick={() => setActiveTab('escalated')}
                                type="button"
                            >
                                Escalated ({grievances.filter(g => g.escalated_to_district).length})
                            </button>
                        </li>
                        <li className="nav-item" role="presentation">
                            <button
                                className={`nav-link ${activeTab === 'pending' ? 'active' : ''}`}
                                onClick={() => setActiveTab('pending')}
                                type="button"
                            >
                                Pending ({grievances.filter(g => g.status === 'pending').length})
                            </button>
                        </li>
                        <li className="nav-item" role="presentation">
                            <button
                                className={`nav-link ${activeTab === 'in_progress' ? 'active' : ''}`}
                                onClick={() => setActiveTab('in_progress')}
                                type="button"
                            >
                                In Progress ({grievances.filter(g => g.status === 'in_progress').length})
                            </button>
                        </li>
                        <li className="nav-item" role="presentation">
                            <button
                                className={`nav-link ${activeTab === 'resolved' ? 'active' : ''}`}
                                onClick={() => setActiveTab('resolved')}
                                type="button"
                            >
                                Resolved ({grievances.filter(g => g.status === 'resolved').length})
                            </button>
                        </li>
                        <li className="nav-item" role="presentation">
                            <button
                                className={`nav-link ${activeTab === 'all' ? 'active' : ''}`}
                                onClick={() => setActiveTab('all')}
                                type="button"
                            >
                                All ({grievances.length})
                            </button>
                        </li>
                    </ul>
                    
                    {/* Pagination Size Selector - Compact */}
                    <div className="d-flex align-items-center gap-1">
                        <span className="text-xs text-secondary-light">Show:</span>
                        <select 
                            className="form-select form-select-sm" 
                            style={{ width: '70px', fontSize: '12px' }}
                            value={itemsPerPage}
                            onChange={(e) => {
                                setItemsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        <span className="text-xs text-secondary-light">entries</span>
                    </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                    <form className="navbar-search" style={{ width: '200px' }}>
                        <input
                            type="text"
                            className="bg-base h-32-px w-100"
                            style={{ fontSize: '13px' }}
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                        <Icon icon="ion:search-outline" className="icon" />
                    </form>
                    {userRole === 'district' && (
                        <button 
                            className="btn btn-primary btn-sm px-8 py-4 radius-8 h-32-px d-flex align-items-center gap-1"
                            onClick={handleAutoEscalate}
                            style={{ fontSize: '12px' }}
                        >
                            <Icon icon="material-symbols:escalator-warning" className="text-sm" />
                            Auto Escalate
                        </button>
                    )}
                </div>
            </div>

            {/* Grievances Table */}
            <div className="card-body p-24">
                {loading ? (
                    <div className="text-center py-4">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                ) : (
                    <div className="table-responsive scroll-sm">
                        <table className="table bordered-table sm-table mb-0">
                            <thead>
                                <tr>
                                    <th scope="col">S.L</th>
                                    <th scope="col" style={{width: '100px'}}>Ticket #</th>
                                    <th scope="col">Name</th>
                                    <th scope="col">Mobile</th>
                                    <th scope="col">RCH ID</th>
                                    <th scope="col">Location</th>
                                    <th scope="col">Created Date</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Escalated</th>
                                    <th scope="col">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan="10" className="text-center py-4">No grievances found</td>
                                    </tr>
                                ) : (
                                    filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((grievance, index) => (
                                        <tr key={grievance.id}>
                                            <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                            <td title={grievance.ticket_number}>{grievance.ticket_number?.slice(-6)}</td>
                                            <td>{grievance.name}</td>
                                            <td title={grievance.mobile_number}>{grievance.mobile_number?.slice(-10)}</td>
                                            <td>{grievance.rch_id}</td>
                                            <td>
                                                <div className="text-sm">
                                                    <div>{getDistrictName(grievance.district_id)}</div>
                                                    <div className="text-secondary-light">{getBlockName(grievance.block_id)}</div>
                                                </div>
                                            </td>
                                            <td>{formatDate(grievance.created_at)}</td>
                                            <td>{getStatusBadge(grievance.status)}</td>
                                            <td>
                                                {grievance.escalated_to_district ? (
                                                    <span className="px-24 py-4 rounded-pill fw-medium text-sm bg-danger-focus text-danger-main">
                                                        Yes
                                                    </span>
                                                ) : (
                                                    <span className="px-24 py-4 rounded-pill fw-medium text-sm bg-neutral-200 text-neutral-600">
                                                        No
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <div className="d-flex align-items-center gap-10 justify-content-center">
                                                    <button
                                                        className="bg-primary-50 text-primary-600 bg-hover-primary-100 text-hover-primary-800 w-32-px h-32-px d-flex justify-content-center align-items-center rounded-circle"
                                                        onClick={() => { setSelectedGrievance(grievance); setShowViewModal(true); }}
                                                        title="View Details"
                                                    >
                                                        <Icon icon="iconamoon:eye-light" />
                                                    </button>
                                                    {userRole === 'block' && grievance.status !== 'resolved' && (
                                                        <>
                                                            <button
                                                                className="bg-success-focus text-success-main bg-hover-success-200 w-32-px h-32-px d-flex justify-content-center align-items-center rounded-circle"
                                                                onClick={() => { 
                                                                    setSelectedGrievance(grievance); 
                                                                    setUpdateData({ status: grievance.status, notes: '' });
                                                                    setShowUpdateModal(true); 
                                                                }}
                                                                title="Update Status"
                                                            >
                                                                <Icon icon="lucide:edit" />
                                                            </button>
                                                            <button
                                                                className="bg-info-focus text-info-main bg-hover-info-200 w-32-px h-32-px d-flex justify-content-center align-items-center rounded-circle"
                                                                onClick={() => { 
                                                                    setSelectedGrievance(grievance); 
                                                                    setResolutionData({ resolution_notes: '' });
                                                                    setShowResolveModal(true); 
                                                                }}
                                                                title="Resolve"
                                                            >
                                                                <Icon icon="material-symbols:check" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
                
                {/* Pagination */}
                {filteredData.length > itemsPerPage && (
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-24">
                        <span className="text-sm text-secondary-light">
                            Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredData.length)} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} entries
                        </span>
                        <ul className="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center">
                            {/* First Page */}
                            <li className="page-item">
                                <button
                                    className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md"
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    title="First Page"
                                >
                                    <Icon icon="ep:d-arrow-left" /><Icon icon="ep:d-arrow-left" />
                                </button>
                            </li>
                            {/* Previous Page */}
                            <li className="page-item">
                                <button 
                                    className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md"
                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    title="Previous Page"
                                >
                                    <Icon icon="ep:d-arrow-left" className="" />
                                </button>
                            </li>
                            {/* Page Numbers */}
                            {getVisiblePages(currentPage, Math.ceil(filteredData.length / itemsPerPage)).map((page, index) => {
                                if (page === '...') {
                                    return (
                                        <li key={`ellipsis-${index}`} className="page-item">
                                            <span className="page-link bg-transparent border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md text-secondary-light">
                                                ...
                                            </span>
                                        </li>
                                    );
                                }
                                return (
                                    <li key={page} className="page-item">
                                        <button 
                                            className={`page-link ${currentPage === page ? 'bg-primary-600 text-white' : 'bg-neutral-200 text-secondary-light'} fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px`}
                                            onClick={() => setCurrentPage(page)}
                                        >
                                            {page}
                                        </button>
                                    </li>
                                );
                            })}
                            {/* Next Page */}
                            <li className="page-item">
                                <button 
                                    className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md"
                                    onClick={() => setCurrentPage(Math.min(Math.ceil(filteredData.length / itemsPerPage), currentPage + 1))}
                                    disabled={currentPage === Math.ceil(filteredData.length / itemsPerPage)}
                                    title="Next Page"
                                >
                                    <Icon icon="ep:d-arrow-right" className="" />
                                </button>
                            </li>
                            {/* Last Page */}
                            <li className="page-item">
                                <button
                                    className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md"
                                    onClick={() => setCurrentPage(Math.ceil(filteredData.length / itemsPerPage))}
                                    disabled={currentPage === Math.ceil(filteredData.length / itemsPerPage)}
                                    title="Last Page"
                                >
                                    <Icon icon="ep:d-arrow-right" /><Icon icon="ep:d-arrow-right" />
                                </button>
                            </li>
                        </ul>
                    </div>
                )}
            </div>

            {/* View Grievance Modal */}
            {showViewModal && selectedGrievance && (
                <>
                    <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
                        <div className="modal-dialog modal-lg modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Grievance Details</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowViewModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label fw-medium text-secondary-light mb-8">Ticket Number :</label>
                                            <div className="bg-neutral-50 px-16 py-12 radius-8">
                                                <span className="text-primary-600 fw-medium">{selectedGrievance.ticket_number}</span>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-medium text-secondary-light mb-8">Status :</label>
                                            <div className="bg-neutral-50 px-16 py-12 radius-8">
                                                {getStatusBadge(selectedGrievance.status)}
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-medium text-secondary-light mb-8">Name :</label>
                                            <div className="bg-neutral-50 px-16 py-12 radius-8">
                                                <span className="text-neutral-600">{selectedGrievance.name}</span>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-medium text-secondary-light mb-8">Mobile Number :</label>
                                            <div className="bg-neutral-50 px-16 py-12 radius-8">
                                                <span className="text-neutral-600">{selectedGrievance.mobile_number}</span>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-medium text-secondary-light mb-8">RCH ID:</label>
                                            <div className="bg-neutral-50 px-16 py-12 radius-8">
                                                <span className="text-neutral-600">{selectedGrievance.rch_id}</span>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-medium text-secondary-light mb-8">Escalated:</label>
                                            <div className="bg-neutral-50 px-16 py-12 radius-8">
                                                {selectedGrievance.escalated_to_district ? (
                                                    <span className="px-24 py-4 rounded-pill fw-medium text-sm bg-danger-focus text-danger-main">Yes</span>
                                                ) : (
                                                    <span className="px-24 py-4 rounded-pill fw-medium text-sm bg-neutral-200 text-neutral-600">No</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label fw-medium text-secondary-light mb-8">District</label>
                                            <div className="bg-neutral-50 px-16 py-12 radius-8">
                                                <span className="text-neutral-600">{getDistrictName(selectedGrievance.district_id)}</span>
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label fw-medium text-secondary-light mb-8">Block</label>
                                            <div className="bg-neutral-50 px-16 py-12 radius-8">
                                                <span className="text-neutral-600">{getBlockName(selectedGrievance.block_id)}</span>
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label fw-medium text-secondary-light mb-8">Ward</label>
                                            <div className="bg-neutral-50 px-16 py-12 radius-8">
                                                <span className="text-neutral-600">{getWardName(selectedGrievance.ward_id)}</span>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-medium text-secondary-light mb-8">LMP Date :</label>
                                            <div className="bg-neutral-50 px-16 py-12 radius-8">
                                                <span className="text-neutral-600">{formatDate(selectedGrievance.lmp_date)}</span>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-medium text-secondary-light mb-8">EDD Date :</label>
                                            <div className="bg-neutral-50 px-16 py-12 radius-8">
                                                <span className="text-neutral-600">{formatDate(selectedGrievance.edd_date)}</span>
                                            </div>
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label fw-medium text-secondary-light mb-8">Grievance Description :</label>
                                            <div className="bg-neutral-50 px-16 py-12 radius-8">
                                                <span className="text-neutral-600">{selectedGrievance.grievance_note}</span>
                                            </div>
                                        </div>
                                        {selectedGrievance.attachment_file_url && (
                                            <div className="col-md-6">
                                                <label className="form-label fw-medium text-secondary-light mb-8">Attachment File:</label>
                                                <div className="bg-neutral-50 px-16 py-12 radius-8">
                                                    <a 
                                                        href={`${API_BASE_URL}${selectedGrievance.attachment_file_url}`}
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2"
                                                    >
                                                        <Icon icon="material-symbols:visibility" />
                                                        View Attachment
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                        <div className="col-md-6">
                                            <label className="form-label fw-medium text-secondary-light mb-8">Created Date :</label>
                                            <div className="bg-neutral-50 px-16 py-12 radius-8">
                                                <span className="text-neutral-600">{formatDate(selectedGrievance.created_at)}</span>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-medium text-secondary-light mb-8">Resolved Date :</label>
                                            <div className="bg-neutral-50 px-16 py-12 radius-8">
                                                <span className="text-neutral-600">{formatDate(selectedGrievance.resolved_at)}</span>
                                            </div>
                                        </div>
                                        {selectedGrievance.status === 'resolved' && (
                                            <div className="col-12">
                                                <label className="form-label fw-medium text-secondary-light mb-8">Resolution Details :</label>
                                                <div className="bg-success-50 px-16 py-12 radius-8 border border-success-200">
                                                    <span className="text-success-700">
                                                        {selectedGrievance.resolution_note || 'Resolution details not available'}
                                                    </span>
                                                    {selectedGrievance.resolved_at && (
                                                        <small className="d-block mt-2 text-success-600">Resolved on: {formatDate(selectedGrievance.resolved_at)}</small>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="modal-footer justify-content-center">
                                    <button type="button" className="btn btn-secondary px-32" onClick={() => setShowViewModal(false)}>Close</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" onClick={() => setShowViewModal(false)}></div>
                </>
            )}

            {/* Update Grievance Modal */}
            {showUpdateModal && selectedGrievance && (
                <>
                    <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Update Grievance Status</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowUpdateModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Ticket Number:</label>
                                        <p className="mb-0 text-primary-600 fw-medium">{selectedGrievance.ticket_number}</p>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Status</label>
                                        <select 
                                            className="form-select"
                                            value={updateData.status}
                                            onChange={(e) => setUpdateData({...updateData, status: e.target.value})}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="in_progress">In Progress</option>
                                        </select>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Notes</label>
                                        <textarea 
                                            className="form-control"
                                            rows="3"
                                            value={updateData.notes}
                                            onChange={(e) => setUpdateData({...updateData, notes: e.target.value})}
                                            placeholder="Add update notes..."
                                        ></textarea>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowUpdateModal(false)}>Cancel</button>
                                    <button type="button" className="btn btn-primary" onClick={handleUpdateGrievance}>Update</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" onClick={() => setShowUpdateModal(false)}></div>
                </>
            )}

            {/* Resolve Grievance Modal */}
            {showResolveModal && selectedGrievance && (
                <>
                    <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Resolve Grievance</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowResolveModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Ticket Number:</label>
                                        <p className="mb-0 text-primary-600 fw-medium">{selectedGrievance.ticket_number}</p>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Resolution Notes <span className="text-danger">*</span></label>
                                        <textarea 
                                            className="form-control"
                                            rows="4"
                                            value={resolutionData.resolution_notes}
                                            onChange={(e) => setResolutionData({...resolutionData, resolution_notes: e.target.value})}
                                            placeholder="Describe how the grievance was resolved..."
                                            required
                                        ></textarea>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowResolveModal(false)}>Cancel</button>
                                    <button 
                                        type="button" 
                                        className="btn btn-success" 
                                        onClick={handleResolveGrievance}
                                        disabled={!resolutionData.resolution_notes.trim()}
                                    >
                                        Resolve
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" onClick={() => setShowResolveModal(false)}></div>
                </>
            )}
        </div>
    );
};

export default GrievanceManagementLayer;