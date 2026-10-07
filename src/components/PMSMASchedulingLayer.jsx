import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';
import { pmsmaSessionAPI, pmsmaAPI, pregnantWomenAPI } from '../services/api';
import { formatDate, formatDateTime } from '../utils/dateFormatter';
import PMSMAANCDetails from './child/PMSMAANCDetails';

const PMSMASchedulingLayer = () => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('upcoming'); // upcoming | completed | all
    const [searchTerm, setSearchTerm] = useState('');

    const [pregnantWomen, setPregnantWomen] = useState([]);
    const [pmsmaCentres, setPmsmaCentres] = useState([]);

    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleData, setScheduleData] = useState({ pregnant_woman_id: '', scheduled_date: '', pmsma_centre_id: '', site: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [selectedSession, setSelectedSession] = useState(null);
    const [rescheduleData, setRescheduleData] = useState({ new_scheduled_date: '', reschedule_reason: '' });

    const [showViewModal, setShowViewModal] = useState(false);
    const [detailTab, setDetailTab] = useState('session'); // 'session' | 'anc'
    const [viewingSession, setViewingSession] = useState(null);
    const openViewModal = (session) => {
        setViewingSession(session);
        setDetailTab('session');
        setShowViewModal(true);
    };

    useEffect(() => {
        fetchSessions();
        fetchPregnantWomen();
        fetchCentres();
    }, []);

    const fetchSessions = async () => {
        try {
            setLoading(true);
            const data = await pmsmaSessionAPI.getSubCentreSessions();
            setSessions(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching PMSMA sessions:', error);
            setSessions([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchPregnantWomen = async () => {
        try {
            const res = await pregnantWomenAPI.getPregnantWomen(0, 500, null, null, null, null, true);
            const list = (res.data || []).filter(w => !w.pregnancy_outcome);
            setPregnantWomen(list);
        } catch (error) {
            console.error('Error fetching pregnant women:', error);
            setPregnantWomen([]);
        }
    };

    const fetchCentres = async () => {
        try {
            const res = await pmsmaAPI.getPMSMACentres(null, null, true);
            setPmsmaCentres(Array.isArray(res) ? res : (res.data || []));
        } catch (error) {
            console.error('Error fetching PMSMA centres:', error);
            setPmsmaCentres([]);
        }
    };

    const openScheduleModal = () => {
        setScheduleData({ pregnant_woman_id: '', scheduled_date: '', pmsma_centre_id: '', site: '' });
        setShowScheduleModal(true);
    };

    const handleSchedule = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        if (!scheduleData.pregnant_woman_id || !scheduleData.scheduled_date) {
            alert('Please select a pregnant woman and a date');
            return;
        }
        try {
            setIsSubmitting(true);
            await pmsmaSessionAPI.scheduleSession({
                pregnant_woman_id: parseInt(scheduleData.pregnant_woman_id, 10),
                scheduled_date: scheduleData.scheduled_date,
                pmsma_centre_id: scheduleData.pmsma_centre_id ? parseInt(scheduleData.pmsma_centre_id, 10) : undefined,
                site: scheduleData.pmsma_centre_id ? undefined : (scheduleData.site || undefined),
            });
            alert('PMSMA session scheduled successfully');
            setShowScheduleModal(false);
            fetchSessions();
        } catch (error) {
            console.error('Error scheduling PMSMA session:', error);
            alert(error.message || 'Failed to schedule PMSMA session');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openRescheduleModal = (session) => {
        setSelectedSession(session);
        setRescheduleData({ new_scheduled_date: '', reschedule_reason: '' });
        setShowRescheduleModal(true);
    };

    const handleReschedule = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        if (!rescheduleData.new_scheduled_date || !rescheduleData.reschedule_reason.trim()) {
            alert('Please provide a new date and a reason');
            return;
        }
        try {
            setIsSubmitting(true);
            await pmsmaSessionAPI.rescheduleSession(selectedSession.id, {
                new_scheduled_date: rescheduleData.new_scheduled_date,
                reschedule_reason: rescheduleData.reschedule_reason,
                is_emergency_override: false,
            });
            alert('Session rescheduled successfully');
            setShowRescheduleModal(false);
            fetchSessions();
        } catch (error) {
            console.error('Error rescheduling session:', error);
            alert(error.message || 'Failed to reschedule session. Note: PMSMA sessions can only be rescheduled up to 7 days ahead of the original date — a PMSMA user can override this in a genuine emergency.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusBadge = (status) => {
        const map = {
            scheduled: { cls: 'bg-warning-focus text-warning-main', label: 'Scheduled' },
            rescheduled: { cls: 'bg-primary-focus text-primary-main', label: 'Rescheduled' },
            completed: { cls: 'bg-success-focus text-success-main', label: 'Completed' },
            cancelled: { cls: 'bg-neutral-200 text-neutral-600', label: 'Cancelled' },
        };
        const cfg = map[status] || { cls: 'bg-neutral-200 text-neutral-600', label: status };
        return <span className={`px-24 py-4 rounded-pill fw-medium text-sm ${cfg.cls}`}>{cfg.label}</span>;
    };

    const upcoming = sessions.filter(s => ['scheduled', 'rescheduled'].includes(s.status));
    const completed = sessions.filter(s => s.status === 'completed');

    const baseList = activeTab === 'upcoming' ? upcoming : activeTab === 'completed' ? completed : sessions;
    const filteredList = baseList.filter(s =>
        (s.pregnant_woman_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(s.id).includes(searchTerm)
    );

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
                                            <span className="mb-2 fw-medium text-secondary-light text-md">Total Sessions</span>
                                            <h6 className="fw-semibold mb-1">{sessions.length}</h6>
                                        </div>
                                        <span className="w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-2xl mb-12 bg-primary-100 text-primary-600">
                                            <Icon icon="material-symbols:queue" />
                                        </span>
                                    </div>
                                    <p className="text-sm mb-0">All statuses</p>
                                </div>
                            </div>
                            <div className="col-xxl-3 col-xl-4 col-sm-6">
                                <div className="px-20 py-16 shadow-none radius-8 h-100 bg-warning-100 left-line line-bg-warning position-relative overflow-hidden">
                                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8">
                                        <div>
                                            <span className="mb-2 fw-medium text-secondary-light text-md">Upcoming</span>
                                            <h6 className="fw-semibold mb-1">{upcoming.length}</h6>
                                        </div>
                                        <span className="w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-2xl mb-12 bg-warning-focus text-warning-main">
                                            <Icon icon="material-symbols:event-upcoming" />
                                        </span>
                                    </div>
                                    <p className="text-sm mb-0">Scheduled / Rescheduled</p>
                                </div>
                            </div>
                            <div className="col-xxl-3 col-xl-4 col-sm-6">
                                <div className="px-20 py-16 shadow-none radius-8 h-100 bg-success-100 left-line line-bg-success position-relative overflow-hidden">
                                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8">
                                        <div>
                                            <span className="mb-2 fw-medium text-secondary-light text-md">Completed</span>
                                            <h6 className="fw-semibold mb-1">{completed.length}</h6>
                                        </div>
                                        <span className="w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-2xl mb-12 bg-success-focus text-success-600">
                                            <Icon icon="material-symbols:task-alt" />
                                        </span>
                                    </div>
                                    <p className="text-sm mb-0">Test results recorded</p>
                                </div>
                            </div>
                            <div className="col-xxl-3 col-xl-4 col-sm-6">
                                <div className="px-20 py-16 shadow-none radius-8 h-100 bg-danger-100 left-line line-bg-danger position-relative overflow-hidden">
                                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8">
                                        <div>
                                            <span className="mb-2 fw-medium text-secondary-light text-md">High Risk</span>
                                            <h6 className="fw-semibold mb-1">{sessions.filter(s => s.is_high_risk).length}</h6>
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
                                className={`nav-link ${activeTab === 'upcoming' ? 'active' : ''}`}
                                onClick={() => setActiveTab('upcoming')}
                                type="button"
                            >
                                Upcoming ({upcoming.length})
                            </button>
                        </li>
                        <li className="nav-item" role="presentation">
                            <button
                                className={`nav-link ${activeTab === 'completed' ? 'active' : ''}`}
                                onClick={() => setActiveTab('completed')}
                                type="button"
                            >
                                Completed ({completed.length})
                            </button>
                        </li>
                        <li className="nav-item" role="presentation">
                            <button
                                className={`nav-link ${activeTab === 'all' ? 'active' : ''}`}
                                onClick={() => setActiveTab('all')}
                                type="button"
                            >
                                All ({sessions.length})
                            </button>
                        </li>
                    </ul>
                </div>
                <div className="d-flex align-items-center gap-2">
                    <form className="navbar-search" style={{ width: '200px' }}>
                        <input
                            type="text"
                            className="bg-base h-32-px w-100"
                            style={{ fontSize: '13px' }}
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Icon icon="ion:search-outline" className="icon" />
                    </form>
                    <button className="btn btn-outline-primary btn-sm px-8 py-4 radius-8 h-32-px d-flex align-items-center gap-1" onClick={fetchSessions} style={{ fontSize: '12px' }}>
                        <Icon icon="material-symbols:refresh" className="text-sm" />
                        Refresh
                    </button>
                    <button className="btn btn-primary btn-sm px-12 py-4 radius-8 h-32-px d-flex align-items-center gap-1" onClick={openScheduleModal} style={{ fontSize: '12px' }}>
                        <Icon icon="material-symbols:add" className="text-sm" />
                        Schedule PMSMA
                    </button>
                </div>
            </div>

            {/* Table */}
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
                                    <th scope="col" className="text-center">Status</th>
                                    <th scope="col" className="text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredList.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center py-4">No sessions found</td>
                                    </tr>
                                ) : (
                                    filteredList.map((session, index) => (
                                        <tr key={session.id}>
                                            <td>{index + 1}</td>
                                            <td>
                                                {session.pregnant_woman_name || 'N/A'}
                                                {session.is_high_risk && (
                                                    <span className="ms-1 px-8 py-2 rounded-pill text-xs bg-danger-focus text-danger-main fw-medium">HRP</span>
                                                )}
                                            </td>
                                            <td>{formatDateTime(session.scheduled_date)}</td>
                                            <td>{session.pmsma_centre_name || session.site || '—'}</td>
                                            <td className="text-center">{getStatusBadge(session.status)}</td>
                                            <td>
                                                <div className="d-flex align-items-center gap-10 justify-content-center">
                                                    <button
                                                        className="bg-primary-50 text-primary-600 bg-hover-primary-100 w-32-px h-32-px d-flex justify-content-center align-items-center rounded-circle"
                                                        onClick={() => openViewModal(session)}
                                                        title="View Details"
                                                    >
                                                        <Icon icon="iconamoon:eye-light" />
                                                    </button>
                                                    {['scheduled', 'rescheduled'].includes(session.status) && (
                                                        <button
                                                            className="bg-warning-focus text-warning-main bg-hover-warning-200 w-32-px h-32-px d-flex justify-content-center align-items-center rounded-circle"
                                                            onClick={() => openRescheduleModal(session)}
                                                            title="Reschedule"
                                                        >
                                                            <Icon icon="material-symbols:schedule" />
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
                )}
            </div>

            {/* Schedule Modal */}
            {showScheduleModal && (
                <>
                    <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <form onSubmit={handleSchedule}>
                                    <div className="modal-header">
                                        <h5 className="modal-title">Schedule PMSMA Session</h5>
                                        <button type="button" className="btn-close" onClick={() => setShowScheduleModal(false)}></button>
                                    </div>
                                    <div className="modal-body">
                                        <div className="mb-16">
                                            <label className="form-label">Pregnant Woman <span className="text-danger">*</span></label>
                                            <select
                                                className="form-select"
                                                value={scheduleData.pregnant_woman_id}
                                                onChange={(e) => setScheduleData({ ...scheduleData, pregnant_woman_id: e.target.value })}
                                                required
                                            >
                                                <option value="">-- Select --</option>
                                                {pregnantWomen.map(w => (
                                                    <option key={w.id} value={w.id}>{w.full_name} (EDD: {w.edd_date ? formatDate(w.edd_date) : 'N/A'})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="mb-16">
                                            <label className="form-label">Scheduled Date & Time <span className="text-danger">*</span></label>
                                            <input
                                                type="datetime-local"
                                                className="form-control"
                                                value={scheduleData.scheduled_date}
                                                onChange={(e) => setScheduleData({ ...scheduleData, scheduled_date: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="mb-0">
                                            <label className="form-label">PMSMA Centre (Site)</label>
                                            <select
                                                className="form-select"
                                                value={scheduleData.pmsma_centre_id}
                                                onChange={(e) => setScheduleData({ ...scheduleData, pmsma_centre_id: e.target.value, site: e.target.value ? '' : scheduleData.site })}
                                            >
                                                <option value="">{pmsmaCentres.length ? '-- Select a PMSMA centre --' : 'No centres set up'}</option>
                                                {pmsmaCentres.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                                                ))}
                                            </select>
                                            {!scheduleData.pmsma_centre_id && (
                                                <input
                                                    type="text"
                                                    className="form-control mt-8"
                                                    placeholder="Or type a site name (if not in the list above)"
                                                    value={scheduleData.site}
                                                    onChange={(e) => setScheduleData({ ...scheduleData, site: e.target.value })}
                                                />
                                            )}
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-secondary" onClick={() => setShowScheduleModal(false)}>Cancel</button>
                                        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                            {isSubmitting ? 'Scheduling...' : 'Schedule'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" onClick={() => setShowScheduleModal(false)}></div>
                </>
            )}

            {/* Reschedule Modal */}
            {showRescheduleModal && selectedSession && (
                <>
                    <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <form onSubmit={handleReschedule}>
                                    <div className="modal-header">
                                        <h5 className="modal-title">Reschedule PMSMA Session — {selectedSession.pregnant_woman_name}</h5>
                                        <button type="button" className="btn-close" onClick={() => setShowRescheduleModal(false)}></button>
                                    </div>
                                    <div className="modal-body">
                                        <div className="row g-3 mb-3 p-3 bg-neutral-50 radius-8">
                                            <div className="col-6">
                                                <label className="form-label fw-semibold mb-0">Patient Name</label>
                                                <p className="mb-0">{selectedSession.pregnant_woman_name || 'N/A'}</p>
                                            </div>
                                            <div className="col-6">
                                                <label className="form-label fw-semibold mb-0">Site / Centre</label>
                                                <p className="mb-0">{selectedSession.pmsma_centre_name || selectedSession.site || '—'}</p>
                                            </div>
                                            <div className="col-6">
                                                <label className="form-label fw-semibold mb-0">Appointment Type</label>
                                                <p className="mb-0 text-capitalize">{selectedSession.appointment_type || 'regular'}</p>
                                            </div>
                                            <div className="col-6">
                                                <label className="form-label fw-semibold mb-0">Current Date</label>
                                                <p className="mb-0">{formatDateTime(selectedSession.scheduled_date)}</p>
                                            </div>
                                        </div>
                                        <div className="mb-16">
                                            <label className="form-label">New Date & Time <span className="text-danger">*</span></label>
                                            <input
                                                type="datetime-local"
                                                className="form-control"
                                                value={rescheduleData.new_scheduled_date}
                                                onChange={(e) => setRescheduleData({ ...rescheduleData, new_scheduled_date: e.target.value })}
                                                required
                                            />
                                            <small className="text-muted">Must be within 7 days of the original scheduled date. For a genuine emergency beyond this window, ask the PMSMA user to reschedule with an override.</small>
                                        </div>
                                        <div className="mb-0">
                                            <label className="form-label">Reason <span className="text-danger">*</span></label>
                                            <textarea
                                                className="form-control"
                                                rows="2"
                                                value={rescheduleData.reschedule_reason}
                                                onChange={(e) => setRescheduleData({ ...rescheduleData, reschedule_reason: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-secondary" onClick={() => setShowRescheduleModal(false)}>Cancel</button>
                                        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                            {isSubmitting ? 'Rescheduling...' : 'Reschedule'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" onClick={() => setShowRescheduleModal(false)}></div>
                </>
            )}

            {/* View Details Modal */}
            {showViewModal && viewingSession && (
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
                                        <PMSMAANCDetails pwId={viewingSession.pregnant_woman_id} />
                                    ) : (
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Name</label>
                                            <p className="mb-0">{viewingSession.pregnant_woman_name || 'N/A'}</p>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Scheduled Date</label>
                                            <p className="mb-0">{formatDateTime(viewingSession.scheduled_date)}</p>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Site</label>
                                            <p className="mb-0">{viewingSession.pmsma_centre_name || viewingSession.site || '—'}</p>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Type</label>
                                            <p className="mb-0 text-capitalize">{viewingSession.appointment_type || 'regular'}</p>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Status</label>
                                            <p className="mb-0">{getStatusBadge(viewingSession.status)}</p>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">High Risk</label>
                                            <p className="mb-0">{viewingSession.is_high_risk ? 'Yes' : 'No'}</p>
                                        </div>
                                        {viewingSession.status === 'completed' && (
                                            <>
                                                <div className="col-md-3">
                                                    <label className="form-label fw-semibold">BP</label>
                                                    <p className="mb-0">{viewingSession.bp || '—'}</p>
                                                </div>
                                                <div className="col-md-3">
                                                    <label className="form-label fw-semibold">Blood Sugar</label>
                                                    <p className="mb-0">{viewingSession.blood_sugar ?? '—'}</p>
                                                </div>
                                                <div className="col-md-3">
                                                    <label className="form-label fw-semibold">Hb</label>
                                                    <p className="mb-0">{viewingSession.hb ?? '—'}</p>
                                                </div>
                                                <div className="col-md-3">
                                                    <label className="form-label fw-semibold">Weight</label>
                                                    <p className="mb-0">{viewingSession.weight ?? '—'}</p>
                                                </div>
                                                <div className="col-12">
                                                    <label className="form-label fw-semibold">Counselling Notes</label>
                                                    <p className="mb-0">{viewingSession.counselling_notes || '—'}</p>
                                                </div>
                                            </>
                                        )}
                                        {viewingSession.reschedule_reason && (
                                            <div className="col-12">
                                                <label className="form-label fw-semibold">Reschedule Reason</label>
                                                <p className="mb-0">{viewingSession.reschedule_reason}</p>
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
        </div>
    );
};

export default PMSMASchedulingLayer;