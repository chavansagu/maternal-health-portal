import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';
import { getUserRole } from '../services/auth';
import { formatDateTime } from '../utils/dateFormatter';
import { apiRequest } from '../services/api';

// Define IVR API functions directly in this component
const ivrAPI = {
  getCallLogs: (callType = null, callStatus = null, skip = 0, limit = 100) => {
    const params = new URLSearchParams();
    params.append('skip', skip);
    params.append('limit', limit);
    if (callType) params.append('call_type', callType);
    if (callStatus) params.append('call_status', callStatus);
    return apiRequest(`/api/v2/ivr/call-logs?${params}`);
  },
  getCallLogsForWoman: (pwId) => apiRequest(`/api/v2/ivr/call-logs/${pwId}`),
  triggerHighRiskCalls: () => apiRequest('/api/v2/ivr/trigger-high-risk', { method: 'POST' }),
  triggerFeedbackCall1: (usgAppointmentId) => apiRequest(`/api/v2/ivr/trigger-feedback-call-1/${usgAppointmentId}`, { method: 'POST' }),
  triggerFeedbackCall2: (pregnantWomanId) => apiRequest(`/api/v2/ivr/trigger-feedback-call-2/${pregnantWomanId}`, { method: 'POST' }),
  syncStatus: () => apiRequest('/api/v2/ivr/sync-status', { method: 'POST' }),
};

const IVRCallLogsLayer = () => {
    const [callLogs, setCallLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [triggering, setTriggering] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [callTypeFilter, setCallTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [totalLogs, setTotalLogs] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const userRole = getUserRole();

    useEffect(() => {
        fetchCallLogs();
    }, [callTypeFilter, statusFilter]);

    const fetchCallLogs = async () => {
        try {
            setLoading(true);
            const data = await ivrAPI.getCallLogs(callTypeFilter || null, statusFilter || null, 0, 1000); // Get more records for client-side pagination
            setCallLogs(data.data || []);
            setTotalLogs(data.total || data.data?.length || 0);
        } catch (error) {
            console.error('Error fetching IVR call logs:', error);
            alert('Error fetching call logs: ' + (error.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

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

    // Get current page data
    const getCurrentPageData = () => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return callLogs.slice(startIndex, endIndex);
    };

    const handleSyncStatus = async () => {
        try {
            setSyncing(true);
            const result = await ivrAPI.syncStatus();
            alert(
                `Sync complete!\n` +
                `Updated: ${result.updated}\n` +
                `Total checked: ${result.total_checked}`
            );
            fetchCallLogs();
        } catch (error) {
            console.error('Sync error:', error);
            alert('Sync failed: ' + (error.message || 'Unknown error'));
        } finally {
            setSyncing(false);
        }
    };

    const handleTriggerHighRisk = async () => {
        if (!window.confirm('Trigger high-risk advisory calls for all active high-risk women?')) return;
        try {
            setTriggering(true);
            const result = await ivrAPI.triggerHighRiskCalls();
            alert(
                `Calls triggered successfully!\n` +
                `Triggered: ${result.triggered}\n` +
                `Skipped (already called): ${result.skipped_already_called}\n` +
                `Failed: ${result.failed}`
            );
            fetchCallLogs();
        } catch (error) {
            console.error('Trigger error:', error);
            alert('Trigger failed: ' + (error.message || 'Unknown error'));
        } finally {
            setTriggering(false);
        }
    };

    const getStatusBadge = (status) => {
        const map = {
            initiated: 'bg-info-focus text-info-main',
            connected: 'bg-success-focus text-success-main',
            no_answer: 'bg-warning-focus text-warning-main',
            busy: 'bg-warning-focus text-warning-main',
            failed: 'bg-danger-focus text-danger-main',
        };
        return (
            <span className={`px-12 py-4 rounded-pill fw-medium text-xs ${map[status] || 'bg-neutral-200 text-secondary-light'}`}>
                {status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </span>
        );
    };

    const getCallTypeBadge = (type) => {
        const map = {
            high_risk_advisory: 'bg-danger-focus text-danger-main',
            feedback_call_1: 'bg-primary-focus text-primary-main',
            feedback_call_2: 'bg-lilac-100 text-lilac-600',
        };
        return (
            <span className={`px-12 py-4 rounded-pill fw-medium text-xs ${map[type] || 'bg-neutral-200 text-secondary-light'}`}>
                {type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </span>
        );
    };

    const handleTriggerFeedbackCall1 = async (usgAppointmentId) => {
        if (!window.confirm('Trigger Feedback Call 1 for this USG appointment?')) return;
        try {
            const result = await ivrAPI.triggerFeedbackCall1(usgAppointmentId);
            alert(`Feedback Call 1: ${result.message}`);
            fetchCallLogs();
        } catch (error) {
            console.error('Feedback Call 1 error:', error);
            alert('Feedback Call 1 failed: ' + (error.message || 'Unknown error'));
        }
    };

    const handleTriggerFeedbackCall2 = async (pregnantWomanId) => {
        if (!window.confirm('Trigger Feedback Call 2 for this woman?')) return;
        try {
            const result = await ivrAPI.triggerFeedbackCall2(pregnantWomanId);
            alert(`Feedback Call 2: ${result.message}`);
            fetchCallLogs();
        } catch (error) {
            console.error('Feedback Call 2 error:', error);
            alert('Feedback Call 2 failed: ' + (error.message || 'Unknown error'));
        }
    };

    // Stats
    const total = callLogs.length;
    const connected = callLogs.filter(l => l.call_status === 'connected').length;
    const noAnswer = callLogs.filter(l => l.call_status === 'no_answer').length;
    const failed = callLogs.filter(l => l.call_status === 'failed').length;

    return (
        <div className="card h-100 p-0 radius-12">
            {/* Stats Cards */}
            <div className="col-12">
                <div className="card radius-12">
                    <div className="card-body p-16">
                        <div className="row gy-4">
                            <div className="col-xxl-3 col-xl-3 col-sm-6">
                                <div className="px-20 py-16 shadow-none radius-8 h-100 gradient-deep-1 left-line line-bg-primary">
                                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8">
                                        <div>
                                            <span className="mb-2 fw-medium text-secondary-light text-md">Total Calls</span>
                                            <h6 className="fw-semibold mb-1">{total}</h6>
                                        </div>
                                        <span className="w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-2xl bg-primary-100 text-primary-600">
                                            <Icon icon="material-symbols:call" />
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="col-xxl-3 col-xl-3 col-sm-6">
                                <div className="px-20 py-16 shadow-none radius-8 h-100 bg-success-100 left-line line-bg-success">
                                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8">
                                        <div>
                                            <span className="mb-2 fw-medium text-secondary-light text-md">Connected</span>
                                            <h6 className="fw-semibold mb-1">{connected}</h6>
                                        </div>
                                        <span className="w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-2xl bg-success-200 text-success-600">
                                            <Icon icon="material-symbols:call-received" />
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="col-xxl-3 col-xl-3 col-sm-6">
                                <div className="px-20 py-16 shadow-none radius-8 h-100 gradient-deep-2 left-line line-bg-warning">
                                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8">
                                        <div>
                                            <span className="mb-2 fw-medium text-secondary-light text-md">No Answer</span>
                                            <h6 className="fw-semibold mb-1">{noAnswer}</h6>
                                        </div>
                                        <span className="w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-2xl bg-warning-focus text-warning-600">
                                            <Icon icon="material-symbols:call-missed" />
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="col-xxl-3 col-xl-3 col-sm-6">
                                <div className="px-20 py-16 shadow-none radius-8 h-100 bg-danger-100 left-line line-bg-danger">
                                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8">
                                        <div>
                                            <span className="mb-2 fw-medium text-secondary-light text-md">Failed</span>
                                            <h6 className="fw-semibold mb-1">{failed}</h6>
                                        </div>
                                        <span className="w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-2xl bg-danger-200 text-danger-600">
                                            <Icon icon="material-symbols:call-end" />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Header + Filters */}
            <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between">
                <div className="d-flex align-items-center flex-wrap gap-3">
                    <h6 className="text-lg fw-semibold mb-0">IVR Call Logs</h6>
                    <span className="text-sm text-secondary-light fw-medium">({totalLogs} records)</span>
                    <select
                        className="form-select form-select-sm w-auto"
                        value={callTypeFilter}
                        onChange={(e) => {
                            setCallTypeFilter(e.target.value);
                            setCurrentPage(1);
                        }}
                    >
                        <option value="">All Types</option>
                        <option value="high_risk_advisory">High Risk Advisory</option>
                        <option value="feedback_call_1">Feedback Call 1</option>
                        <option value="feedback_call_2">Feedback Call 2</option>
                    </select>
                    <select
                        className="form-select form-select-sm w-auto"
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setCurrentPage(1);
                        }}
                    >
                        <option value="">All Status</option>
                        <option value="initiated">Initiated</option>
                        <option value="connected">Connected</option>
                        <option value="no_answer">No Answer</option>
                        <option value="busy">Busy</option>
                        <option value="failed">Failed</option>
                    </select>
                    {/* Pagination Size Selector */}
                    <div className="d-flex align-items-center gap-2">
                        <span className="text-sm text-secondary-light">Show:</span>
                        <select 
                            className="form-select form-select-sm" 
                            style={{ width: 'auto' }}
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
                        <span className="text-sm text-secondary-light">entries</span>
                    </div>
                </div>
                {userRole === 'district' && (
                    <div className="d-flex gap-2">
                        <button
                            className="btn btn-outline-primary btn-sm px-16 py-11 radius-8 d-flex align-items-center gap-2"
                            onClick={handleSyncStatus}
                            disabled={syncing}
                        >
                            <Icon icon="material-symbols:sync" className="text-xl" />
                            {syncing ? 'Syncing...' : 'Sync Status'}
                        </button>
                        <button
                            className="btn btn-danger btn-sm px-20 py-11 radius-8 d-flex align-items-center gap-2"
                            onClick={handleTriggerHighRisk}
                            disabled={triggering}
                        >
                            <Icon icon="material-symbols:call" className="text-xl" />
                            {triggering ? 'Triggering...' : 'Trigger High-Risk Calls'}
                        </button>
                    </div>
                )}
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
                    <div className="table-responsive scroll-sm" style={{overflowX: 'auto'}}>
                        <table className="table bordered-table sm-table mb-0" style={{minWidth: '1200px'}}>
                            <thead>
                                <tr>
                                    <th style={{minWidth: '50px'}}>S.L</th>
                                    <th style={{minWidth: '120px'}}>Name</th>
                                    <th style={{minWidth: '100px'}}>Mobile</th>
                                    <th style={{minWidth: '120px'}}>Call Type</th>
                                    <th style={{minWidth: '80px'}}>Status</th>
                                    <th style={{minWidth: '120px'}}>Caller ID</th>
                                    <th style={{minWidth: '80px'}}>Duration</th>
                                    <th style={{minWidth: '140px'}}>Sent Date</th>
                                    <th style={{minWidth: '140px'}}>Call Connect</th>
                                    <th style={{minWidth: '140px'}}>Call End</th>
                                    <th style={{minWidth: '100px'}}>Campaign ID</th>
                                    <th style={{minWidth: '200px'}}>Unique ID</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="12" className="text-center py-4">Loading...</td></tr>
                                ) : getCurrentPageData().length === 0 ? (
                                    <tr><td colSpan="12" className="text-center py-4">No call logs found</td></tr>
                                ) : (
                                    getCurrentPageData().map((log, index) => (
                                        <tr key={log.id}>
                                            <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                            <td className="fw-medium">{log.pregnant_woman_name || 'N/A'}</td>
                                            <td>{log.mobile_number}</td>
                                            <td>{getCallTypeBadge(log.call_type)}</td>
                                            <td>{getStatusBadge(log.call_status)}</td>
                                            <td className="text-secondary-light text-sm">{log.caller_id || '—'}</td>
                                            <td>{log.call_duration_seconds ? `${log.call_duration_seconds}s` : '—'}</td>
                                            <td className="text-secondary-light text-sm">{log.sent_date || '—'}</td>
                                            <td className="text-secondary-light text-sm">{log.call_connect || '—'}</td>
                                            <td className="text-secondary-light text-sm">{log.call_end || '—'}</td>
                                            <td className="text-secondary-light text-sm">{log.dovesoft_campaign_id || '—'}</td>
                                            <td className="text-secondary-light text-sm" style={{fontSize: '11px'}}>{log.ivr_campaign_id || '—'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
                    
                {/* Pagination */}
                {callLogs.length > itemsPerPage && (
                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-24">
                            <span className="text-sm text-secondary-light">
                                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, callLogs.length)} to {Math.min(currentPage * itemsPerPage, callLogs.length)} of {callLogs.length} entries
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
                                {getVisiblePages(currentPage, Math.ceil(callLogs.length / itemsPerPage)).map((page, index) => {
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
                                        onClick={() => setCurrentPage(Math.min(Math.ceil(callLogs.length / itemsPerPage), currentPage + 1))}
                                        disabled={currentPage === Math.ceil(callLogs.length / itemsPerPage)}
                                        title="Next Page"
                                    >
                                        <Icon icon="ep:d-arrow-right" className="" />
                                    </button>
                                </li>
                                {/* Last Page */}
                                <li className="page-item">
                                    <button
                                        className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md"
                                        onClick={() => setCurrentPage(Math.ceil(callLogs.length / itemsPerPage))}
                                        disabled={currentPage === Math.ceil(callLogs.length / itemsPerPage)}
                                        title="Last Page"
                                    >
                                        <Icon icon="ep:d-arrow-right" /><Icon icon="ep:d-arrow-right" />
                                    </button>
                                </li>
                            </ul>
                        </div>
                    )}
            </div>
        </div>
    );
};

export default IVRCallLogsLayer;
