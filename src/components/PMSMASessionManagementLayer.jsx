import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react/dist/iconify.js';
import { pmsmaSessionAPI } from '../services/api';
import { formatDate, formatDateTime } from '../utils/dateFormatter';
import { getUserRole } from '../services/auth';
import PMSMAANCDetails from './child/PMSMAANCDetails';

const PMSMASessionManagementLayer = () => {
    const [searchParams] = useSearchParams();
    const userRole = getUserRole();
    // District Admins get a read-only, district-wide view; they cannot
    // complete or reschedule sessions from here (that stays with PMSMA/Sub-Centre users).
    const isReadOnly = userRole === 'district';
    const initialTab = searchParams.get('tab') === 'completed' ? 'completed' : 'queue';
    const [queue, setQueue] = useState([]);
    const [completedSessions, setCompletedSessions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingCompleted, setLoadingCompleted] = useState(false);
    const [activeTab, setActiveTab] = useState(initialTab); // 'queue' | 'completed'
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSession, setSelectedSession] = useState(null);
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [detailTab, setDetailTab] = useState('session'); // 'session' | 'anc'
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    const [completeData, setCompleteData] = useState({
        bp: '',
        blood_sugar: '',
        hb: '',
        weight: '',
        counselling_notes: '',
        is_high_risk: false,
    });

    const [rescheduleData, setRescheduleData] = useState({
        new_scheduled_date: '',
        reschedule_reason: '',
        is_emergency_override: false,
        override_reason: '',
    });

    useEffect(() => {
        fetchQueue();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'completed' && completedSessions.length === 0) {
            fetchCompleted();
        }
    }, [activeTab]);

    const fetchQueue = async () => {
        try {
            setLoading(true);
            if (isReadOnly) {
                const data = await pmsmaSessionAPI.getDistrictOverview();
                const upcoming = Array.isArray(data) ? data.filter(s => s.status === 'scheduled' || s.status === 'rescheduled') : [];
                setQueue(upcoming);
            } else {
                const data = await pmsmaSessionAPI.getQueue();
                setQueue(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Error fetching PMSMA session queue:', error);
            setQueue([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchCompleted = async () => {
        try {
            setLoadingCompleted(true);
            const data = isReadOnly
                ? await pmsmaSessionAPI.getDistrictOverview({ status_filter: 'completed' })
                : await pmsmaSessionAPI.getCompleted();
            setCompletedSessions(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching completed PMSMA sessions:', error);
            setCompletedSessions([]);
        } finally {
            setLoadingCompleted(false);
        }
    };

    const handleComplete = async () => {
        if (isSubmitting) return;
        try {
            setIsSubmitting(true);
            await pmsmaSessionAPI.completeSession(selectedSession.id, completeData);
            alert('Session completed successfully');
            setShowCompleteModal(false);
            fetchQueue();
            setCompletedSessions([]);
            if (activeTab === 'completed') fetchCompleted();
        } catch (error) {
            console.error('Error completing session:', error);
            alert(error.message || 'Failed to complete session');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReschedule = async () => {
        if (isSubmitting) return;
        if (rescheduleData.is_emergency_override && !rescheduleData.override_reason.trim()) {
            alert('Override reason is required for emergency reschedule');
            return;
        }
        try {
            setIsSubmitting(true);
            await pmsmaSessionAPI.rescheduleSession(selectedSession.id, rescheduleData);
            alert('Session rescheduled successfully');
            setShowRescheduleModal(false);
            fetchQueue();
        } catch (error) {
            console.error('Error rescheduling session:', error);
            alert(error.message || 'Failed to reschedule session');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openCompleteModal = (session) => {
        setSelectedSession(session);
        setCompleteData({ bp: '', blood_sugar: '', hb: '', weight: '', counselling_notes: '', is_high_risk: !!session.is_high_risk });
        setShowCompleteModal(true);
    };

    const openRescheduleModal = (session) => {
        setSelectedSession(session);
        setRescheduleData({ new_scheduled_date: '', reschedule_reason: '', is_emergency_override: false, override_reason: '' });
        setShowRescheduleModal(true);
    };

    const getStatusBadge = (status) => {
        const map = {
            scheduled: { cls: 'bg-warning-focus text-warning-main', label: 'Scheduled' },
            rescheduled: { cls: 'bg-primary-focus text-primary-main', label: 'Rescheduled' },
            completed: { cls: 'bg-success-focus text-success-main', label: 'Completed' },
        };
        const cfg = map[status] || { cls: 'bg-neutral-200 text-neutral-600', label: status };
        return <span className={`px-24 py-4 rounded-pill fw-medium text-sm ${cfg.cls}`}>{cfg.label}</span>;
    };

    const todayStr = new Date().toISOString().slice(0, 10);
    const todaySessions = queue.filter(s => s.scheduled_date?.slice(0, 10) === todayStr);
    const upcomingSessions = queue.filter(s => s.scheduled_date?.slice(0, 10) > todayStr);

    const filteredQueue = queue.filter(s =>
        (s.pregnant_woman_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(s.id).includes(searchTerm)
    );

    const filteredCompleted = completedSessions.filter(s =>
        (s.pregnant_woman_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(s.id).includes(searchTerm)
    );

    // Smart pagination: show only relevant page numbers (same as USG / Delivery Referral)
    const getVisiblePages = (page, totalPages) => {
        const delta = 2;
        const range = [];
        const rangeWithDots = [];
        for (let i = Math.max(2, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) {
            range.push(i);
        }
        if (page - delta > 2) {
            rangeWithDots.push(1, '...');
        } else {
            rangeWithDots.push(1);
        }
        rangeWithDots.push(...range);
        if (page + delta < totalPages - 1) {
            rangeWithDots.push('...', totalPages);
        } else {
            rangeWithDots.push(totalPages);
        }
        return rangeWithDots.filter((item, index, arr) => arr.indexOf(item) === index);
    };

    const renderPagination = (total) => {
        if (total <= itemsPerPage) return null;
        const totalPages = Math.ceil(total / itemsPerPage);
        const navBtn = "page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md";
        return (
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-24">
                <span className="text-sm text-secondary-light">
                    Showing {Math.min((currentPage - 1) * itemsPerPage + 1, total)} to {Math.min(currentPage * itemsPerPage, total)} of {total} entries
                </span>
                <ul className="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center">
                    <li className="page-item">
                        <button className={navBtn} onClick={() => setCurrentPage(1)} disabled={currentPage === 1} title="First Page">
                            <Icon icon="ep:d-arrow-left" /><Icon icon="ep:d-arrow-left" />
                        </button>
                    </li>
                    <li className="page-item">
                        <button className={navBtn} onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} title="Previous Page">
                            <Icon icon="ep:d-arrow-left" />
                        </button>
                    </li>
                    {getVisiblePages(currentPage, totalPages).map((page, index) => {
                        if (page === '...') {
                            return (
                                <li key={`ellipsis-${index}`} className="page-item">
                                    <span className="page-link bg-transparent border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md text-secondary-light">...</span>
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
                    <li className="page-item">
                        <button className={navBtn} onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} title="Next Page">
                            <Icon icon="ep:d-arrow-right" />
                        </button>
                    </li>
                    <li className="page-item">
                        <button className={navBtn} onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} title="Last Page">
                            <Icon icon="ep:d-arrow-right" /><Icon icon="ep:d-arrow-right" />
                        </button>
                    </li>
                </ul>
            </div>
        );
    };

    return (
        <div className="card h-100 p-0 radius-12">
            {/* Stats */}
            <div className="col-12">
                <div className="card radius-12">
                    <div className="card-body p-16">
                        <div className="row gy-4">
                            <div className="col-xxl-3 col-xl-4 col-sm-6">
                                <div className="px-20 py-16 shadow-none radius-8 h-100 gradient-deep-1 left-line line-bg-primary position-relative overflow-hidden">
                                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8">
                                        <div>
                                            <span className="mb-2 fw-medium text-secondary-light text-md">Total in Queue</span>
                                            <h6 className="fw-semibold mb-1">{queue.length}</h6>
                                        </div>
                                        <span className="w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-2xl mb-12 bg-primary-100 text-primary-600">
                                            <Icon icon="material-symbols:queue" />
                                        </span>
                                    </div>
                                    <p className="text-sm mb-0">Today + Upcoming</p>
                                </div>
                            </div>
                            <div className="col-xxl-3 col-xl-4 col-sm-6">
                                <div className="px-20 py-16 shadow-none radius-8 h-100 gradient-deep-2 left-line line-bg-lilac position-relative overflow-hidden">
                                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8">
                                        <div>
                                            <span className="mb-2 fw-medium text-secondary-light text-md">Today</span>
                                            <h6 className="fw-semibold mb-1">{todaySessions.length}</h6>
                                        </div>
                                        <span className="w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-2xl mb-12 bg-lilac-200 text-lilac-600">
                                            <Icon icon="material-symbols:today" />
                                        </span>
                                    </div>
                                    <p className="text-sm mb-0">Scheduled for today</p>
                                </div>
                            </div>
                            <div className="col-xxl-3 col-xl-4 col-sm-6">
                                <div className="px-20 py-16 shadow-none radius-8 h-100 bg-success-100 left-line line-bg-success position-relative overflow-hidden">
                                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8">
                                        <div>
                                            <span className="mb-2 fw-medium text-secondary-light text-md">Upcoming</span>
                                            <h6 className="fw-semibold mb-1">{upcomingSessions.length}</h6>
                                        </div>
                                        <span className="w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-2xl mb-12 bg-success-focus text-success-600">
                                            <Icon icon="material-symbols:event-upcoming" />
                                        </span>
                                    </div>
                                    <p className="text-sm mb-0">Future sessions</p>
                                </div>
                            </div>
                            <div className="col-xxl-3 col-xl-4 col-sm-6">
                                <div className="px-20 py-16 shadow-none radius-8 h-100 bg-danger-100 left-line line-bg-danger position-relative overflow-hidden">
                                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8">
                                        <div>
                                            <span className="mb-2 fw-medium text-secondary-light text-md">High Risk</span>
                                            <h6 className="fw-semibold mb-1">{queue.filter(s => s.is_high_risk).length}</h6>
                                        </div>
                                        <span className="w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-2xl mb-12 bg-danger-200 text-danger-600">
                                            <Icon icon="material-symbols:priority-high" />
                                        </span>
                                    </div>
                                    <p className="text-sm mb-0">Flagged cases</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Header */}
            <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between">
                <div className="d-flex align-items-center flex-wrap gap-3">
                    <ul className="nav border-gradient-tab nav-pills" role="tablist">
                        <li className="nav-item" role="presentation">
                            <button
                                className={`nav-link ${activeTab === 'queue' ? 'active' : ''}`}
                                onClick={() => setActiveTab('queue')}
                                type="button"
                            >
                                Session Queue
                            </button>
                        </li>
                        <li className="nav-item" role="presentation">
                            <button
                                className={`nav-link ${activeTab === 'completed' ? 'active' : ''}`}
                                onClick={() => setActiveTab('completed')}
                                type="button"
                            >
                                Completed ({completedSessions.length || ''})
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
                    <button
                        className="btn btn-outline-primary btn-sm px-8 py-4 radius-8 h-32-px d-flex align-items-center gap-1"
                        onClick={() => activeTab === 'completed' ? fetchCompleted() : fetchQueue()}
                        style={{ fontSize: '12px' }}
                    >
                        <Icon icon="material-symbols:refresh" className="text-sm" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Queue Table */}
            {activeTab === 'queue' && (
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
                                    <th scope="col">Name</th>
                                    <th scope="col">Scheduled Date</th>
                                    <th scope="col">Site</th>
                                    <th scope="col">Type</th>
                                    <th scope="col" className="text-center">Status</th>
                                    <th scope="col" className="text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredQueue.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="text-center py-4">
                                            No sessions in queue
                                        </td>
                                    </tr>
                                ) : (
                                    filteredQueue.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((session, index) => (
                                        <tr key={session.id}>
                                            <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                            <td>
                                                {session.pregnant_woman_name || 'N/A'}
                                                {session.is_high_risk && (
                                                    <span className="ms-1 px-8 py-2 rounded-pill text-xs bg-danger-focus text-danger-main fw-medium">HRP</span>
                                                )}
                                            </td>
                                            <td>{formatDateTime(session.scheduled_date)}</td>
                                            <td>{session.pmsma_centre_name || session.site || '—'}</td>
                                            <td>
                                                {session.appointment_type === 'emergency'
                                                    ? <span className="px-24 py-4 rounded-pill fw-medium text-sm bg-danger-focus text-danger-main">Emergency</span>
                                                    : <span className="px-24 py-4 rounded-pill fw-medium text-sm bg-neutral-200 text-neutral-600">Regular</span>
                                                }
                                            </td>
                                            <td className="text-center">{getStatusBadge(session.status)}</td>
                                            <td>
                                                <div className="d-flex align-items-center gap-10 justify-content-center">
                                                    <button
                                                        className="bg-primary-50 text-primary-600 bg-hover-primary-100 text-hover-primary-800 w-32-px h-32-px d-flex justify-content-center align-items-center rounded-circle"
                                                        onClick={() => { setSelectedSession(session); setDetailTab('session'); setShowViewModal(true); }}
                                                        title="View Details"
                                                    >
                                                        <Icon icon="iconamoon:eye-light" />
                                                    </button>
                                                    {!isReadOnly && session.status !== 'completed' && (
                                                        <>
                                                            <button
                                                                className="bg-success-focus text-success-main bg-hover-success-200 w-32-px h-32-px d-flex justify-content-center align-items-center rounded-circle"
                                                                onClick={() => openCompleteModal(session)}
                                                                title="Record Test Results"
                                                            >
                                                                <Icon icon="material-symbols:task-alt" />
                                                            </button>
                                                            <button
                                                                className="bg-warning-focus text-warning-main bg-hover-warning-200 w-32-px h-32-px d-flex justify-content-center align-items-center rounded-circle"
                                                                onClick={() => openRescheduleModal(session)}
                                                                title="Reschedule"
                                                            >
                                                                <Icon icon="material-symbols:schedule" />
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

                {renderPagination(filteredQueue.length)}
            </div>
            )}

            {/* Completed Sessions Table */}
            {activeTab === 'completed' && (
            <div className="card-body p-24">
                {loadingCompleted ? (
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
                                    <th scope="col">Name</th>
                                    <th scope="col">Completed On</th>
                                    <th scope="col">Site</th>
                                    <th scope="col">BP</th>
                                    <th scope="col">Blood Sugar</th>
                                    <th scope="col">Hb</th>
                                    <th scope="col">Weight</th>
                                    <th scope="col">Counselling Notes</th>
                                    <th scope="col" className="text-center">HRP</th>
                                    <th scope="col" className="text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCompleted.length === 0 ? (
                                    <tr>
                                        <td colSpan="11" className="text-center py-4">
                                            No completed sessions found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCompleted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((session, index) => (
                                        <tr key={session.id}>
                                            <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                            <td>{session.pregnant_woman_name || 'N/A'}</td>
                                            <td>{formatDateTime(session.updated_at || session.scheduled_date)}</td>
                                            <td>{session.pmsma_centre_name || session.site || '—'}</td>
                                            <td>{session.bp || '—'}</td>
                                            <td>{session.blood_sugar ?? '—'}</td>
                                            <td>{session.hb ?? '—'}</td>
                                            <td>{session.weight ?? '—'}</td>
                                            <td style={{ maxWidth: '220px', whiteSpace: 'normal' }}>{session.counselling_notes || '—'}</td>
                                            <td className="text-center">
                                                {session.is_high_risk
                                                    ? <span className="px-8 py-2 rounded-pill text-xs bg-danger-focus text-danger-main fw-medium">HRP</span>
                                                    : <span className="text-secondary-light text-xs">—</span>
                                                }
                                            </td>
                                            <td>
                                                <div className="d-flex align-items-center gap-10 justify-content-center">
                                                    <button
                                                        className="bg-primary-50 text-primary-600 bg-hover-primary-100 w-32-px h-32-px d-flex justify-content-center align-items-center rounded-circle"
                                                        onClick={() => { setSelectedSession(session); setDetailTab('session'); setShowViewModal(true); }}
                                                        title="View Details"
                                                    >
                                                        <Icon icon="iconamoon:eye-light" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {renderPagination(filteredCompleted.length)}
            </div>
            )}

            {/* View Details Modal */}
            {showViewModal && selectedSession && (
                <>
                    <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered modal-lg">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">PMSMA Session Details</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowViewModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <ul className="nav nav-tabs mb-16" role="tablist">
                                        <li className="nav-item" role="presentation">
                                            <button type="button" className={`nav-link ${detailTab === 'session' ? 'active' : ''}`} onClick={() => setDetailTab('session')}>Session</button>
                                        </li>
                                        <li className="nav-item" role="presentation">
                                            <button type="button" className={`nav-link ${detailTab === 'anc' ? 'active' : ''}`} onClick={() => setDetailTab('anc')}>ANC Details</button>
                                        </li>
                                    </ul>
                                    {detailTab === 'anc' ? (
                                        <PMSMAANCDetails pwId={selectedSession.pregnant_woman_id} />
                                    ) : (
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Name</label>
                                            <p className="mb-0">{selectedSession.pregnant_woman_name || 'N/A'}</p>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Scheduled Date</label>
                                            <p className="mb-0">{formatDateTime(selectedSession.scheduled_date)}</p>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Site</label>
                                            <p className="mb-0">{selectedSession.pmsma_centre_name || selectedSession.site || '—'}</p>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Type</label>
                                            <p className="mb-0 text-capitalize">{selectedSession.appointment_type || 'regular'}</p>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Status</label>
                                            <p className="mb-0">{getStatusBadge(selectedSession.status)}</p>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">High Risk</label>
                                            <p className="mb-0">{selectedSession.is_high_risk ? 'Yes' : 'No'}</p>
                                        </div>
                                        {selectedSession.status === 'completed' && (
                                            <>
                                                <div className="col-md-3">
                                                    <label className="form-label fw-semibold">BP</label>
                                                    <p className="mb-0">{selectedSession.bp || '—'}</p>
                                                </div>
                                                <div className="col-md-3">
                                                    <label className="form-label fw-semibold">Blood Sugar</label>
                                                    <p className="mb-0">{selectedSession.blood_sugar ?? '—'}</p>
                                                </div>
                                                <div className="col-md-3">
                                                    <label className="form-label fw-semibold">Hb</label>
                                                    <p className="mb-0">{selectedSession.hb ?? '—'}</p>
                                                </div>
                                                <div className="col-md-3">
                                                    <label className="form-label fw-semibold">Weight</label>
                                                    <p className="mb-0">{selectedSession.weight ?? '—'}</p>
                                                </div>
                                                <div className="col-12">
                                                    <label className="form-label fw-semibold">Counselling Notes</label>
                                                    <p className="mb-0">{selectedSession.counselling_notes || '—'}</p>
                                                </div>
                                            </>
                                        )}
                                        {selectedSession.reschedule_reason && (
                                            <div className="col-12">
                                                <label className="form-label fw-semibold">Reschedule Reason</label>
                                                <p className="mb-0">{selectedSession.reschedule_reason}</p>
                                            </div>
                                        )}
                                    </div>
                                    )}
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

            {/* Complete / Test Entry Modal */}
            {showCompleteModal && selectedSession && (
                <>
                    <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                        <div className="modal-dialog modal-lg modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Record Test Results — {selectedSession.pregnant_woman_name}</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowCompleteModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">BP (mmHg)</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="e.g. 120/80"
                                                value={completeData.bp}
                                                onChange={(e) => setCompleteData({ ...completeData, bp: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Blood Sugar (mg/dL)</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="e.g. 95"
                                                value={completeData.blood_sugar}
                                                onChange={(e) => setCompleteData({ ...completeData, blood_sugar: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Hb (g/dL)</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="e.g. 11.5"
                                                value={completeData.hb}
                                                onChange={(e) => setCompleteData({ ...completeData, hb: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Weight (kg)</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="e.g. 58"
                                                value={completeData.weight}
                                                onChange={(e) => setCompleteData({ ...completeData, weight: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label fw-semibold">Counselling Notes</label>
                                            <textarea
                                                className="form-control"
                                                rows="3"
                                                placeholder="Counselling provided, observations..."
                                                value={completeData.counselling_notes}
                                                onChange={(e) => setCompleteData({ ...completeData, counselling_notes: e.target.value })}
                                            ></textarea>
                                        </div>
                                        <div className="col-12">
                                            <div className="form-check d-flex align-items-center">
                                                <input
                                                    className="form-check-input me-2"
                                                    type="checkbox"
                                                    checked={completeData.is_high_risk}
                                                    onChange={(e) => setCompleteData({ ...completeData, is_high_risk: e.target.checked })}
                                                />
                                                <label className="form-check-label fw-semibold">Flag as High Risk</label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowCompleteModal(false)}>Cancel</button>
                                    <button
                                        type="button"
                                        className="btn btn-success"
                                        onClick={handleComplete}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? 'Saving...' : 'Save & Complete'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" onClick={() => setShowCompleteModal(false)}></div>
                </>
            )}

            {/* Reschedule Modal */}
            {showRescheduleModal && selectedSession && (
                <>
                    <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Reschedule Session — {selectedSession.pregnant_woman_name}</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowRescheduleModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <div className="row g-3 mb-3 p-3 bg-neutral-50 radius-8">
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Patient Name</label>
                                            <p className="mb-0">{selectedSession.pregnant_woman_name || 'N/A'}</p>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Site / Centre</label>
                                            <p className="mb-0">{selectedSession.pmsma_centre_name || selectedSession.site || '—'}</p>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Appointment Type</label>
                                            <p className="mb-0 text-capitalize">{selectedSession.appointment_type || 'regular'}</p>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Status</label>
                                            <p className="mb-0">{getStatusBadge(selectedSession.status)}</p>
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Original Date</label>
                                        <p className="mb-0 text-secondary-light">{formatDate(selectedSession.original_scheduled_date || selectedSession.scheduled_date)}</p>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">New Scheduled Date <span className="text-danger">*</span></label>
                                        <input
                                            type="datetime-local"
                                            className="form-control"
                                            value={rescheduleData.new_scheduled_date}
                                            onChange={(e) => setRescheduleData({ ...rescheduleData, new_scheduled_date: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Reschedule Reason <span className="text-danger">*</span></label>
                                        <textarea
                                            className="form-control"
                                            rows="2"
                                            placeholder="Reason for rescheduling..."
                                            value={rescheduleData.reschedule_reason}
                                            onChange={(e) => setRescheduleData({ ...rescheduleData, reschedule_reason: e.target.value })}
                                            required
                                        ></textarea>
                                    </div>
                                    <div className="mb-3">
                                        <div className="form-check d-flex align-items-center">
                                            <input
                                                className="form-check-input me-2"
                                                type="checkbox"
                                                checked={rescheduleData.is_emergency_override}
                                                onChange={(e) => setRescheduleData({ ...rescheduleData, is_emergency_override: e.target.checked, override_reason: '' })}
                                            />
                                            <label className="form-check-label fw-semibold">Emergency Override (beyond 7-day window)</label>
                                        </div>
                                    </div>
                                    {rescheduleData.is_emergency_override && (
                                        <div className="mb-3">
                                            <label className="form-label fw-semibold">Override Reason <span className="text-danger">*</span></label>
                                            <textarea
                                                className="form-control border-danger"
                                                rows="2"
                                                placeholder="Mandatory: explain why emergency override is needed..."
                                                value={rescheduleData.override_reason}
                                                onChange={(e) => setRescheduleData({ ...rescheduleData, override_reason: e.target.value })}
                                                required
                                            ></textarea>
                                            <div className="form-text text-danger">Required when emergency override is enabled.</div>
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowRescheduleModal(false)}>Cancel</button>
                                    <button
                                        type="button"
                                        className="btn btn-warning"
                                        onClick={handleReschedule}
                                        disabled={
                                            isSubmitting ||
                                            !rescheduleData.new_scheduled_date ||
                                            !rescheduleData.reschedule_reason.trim() ||
                                            (rescheduleData.is_emergency_override && !rescheduleData.override_reason.trim())
                                        }
                                    >
                                        {isSubmitting ? 'Rescheduling...' : 'Reschedule'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" onClick={() => setShowRescheduleModal(false)}></div>
                </>
            )}
        </div>
    );
};

export default PMSMASessionManagementLayer;