import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';
import { auditAPI, userAPI } from '../services/api';
import { getUserRole } from '../services/auth';
import { formatDateTime } from '../utils/dateFormatter';

const AuditLogsLayer = () => {
    const [logs, setLogs] = useState([]);
    const [statistics, setStatistics] = useState(null);
    const [recentActivities, setRecentActivities] = useState([]);
    const [users, setUsers] = useState([]);
    const [actions, setActions] = useState([]);
    const [entityTypes, setEntityTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [filters, setFilters] = useState({
        user_id: '',
        action: '',
        entity_type: '',
        start_date: '',
        end_date: '',
        days: 30
    });
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);
    const [totalLogs, setTotalLogs] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const userRole = getUserRole();

    useEffect(() => {
        fetchData();
        fetchUsers();
        fetchFilterOptions();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [logsData, statsData, recentData] = await Promise.all([
                auditAPI.getLogs(),
                auditAPI.getStatistics(filters.days),
                auditAPI.getRecentActivities(50)
            ]);
            setLogs(logsData.logs || []);
            setTotalLogs(logsData.total || 0);
            setStatistics(statsData);
            setRecentActivities(recentData.recent_activities || []);
        } catch (error) {
            console.error('Error fetching audit data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const data = await userAPI.getUsers();
            setUsers(data);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const fetchFilterOptions = async () => {
        try {
            const data = await auditAPI.getFilters();
            setActions(data.actions || []);
            setEntityTypes(data.entity_types || []);
        } catch (error) {
            console.error('Error fetching filter options:', error);
        }
    };

    const handleFilter = async () => {
        try {
            setLoading(true);
            
            // Format dates to ISO format if they exist
            const startDate = filters.start_date ? new Date(filters.start_date).toISOString() : null;
            const endDate = filters.end_date ? new Date(filters.end_date + 'T23:59:59').toISOString() : null;
            
            const data = await auditAPI.getLogs(
                0, 100,
                filters.user_id || null,
                filters.action || null,
                filters.entity_type || null,
                null,
                startDate,
                endDate
            );
            setLogs(data.logs || []);
            setTotalLogs(data.total || 0);
        } catch (error) {
            console.error('Error filtering logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setFilters({
            user_id: '',
            action: '',
            entity_type: '',
            start_date: '',
            end_date: '',
            days: 30
        });
        fetchData();
    };



    const getActionBadge = (action) => {
        const badges = {
            'LOGIN_SUCCESS': 'bg-success-focus text-success-main',
            'LOGIN_FAILED': 'bg-danger-focus text-danger-main',
            'LOGOUT': 'bg-secondary-focus text-secondary-main',
            'CREATE': 'bg-primary-focus text-primary-main',
            'UPDATE': 'bg-warning-focus text-warning-main',
            'DELETE': 'bg-danger-focus text-danger-main',
            'APPROVE': 'bg-info-focus text-info-main'
        };
        return badges[action] || 'bg-neutral-focus text-neutral-main';
    };

    const flattenObject = (obj, prefix = '') => {
        if (!obj || typeof obj !== 'object') return {};
        return Object.keys(obj).reduce((acc, key) => {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            const val = obj[key];
            if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
                Object.assign(acc, flattenObject(val, fullKey));
            } else {
                acc[fullKey] = val;
            }
            return acc;
        }, {});
    };

    const safeParse = (str) => {
        if (!str) return {};
        try { return JSON.parse(str); } catch { return {}; }
    };

    const formatValue = (val) => {
        if (val === null || val === undefined) return '—';
        if (typeof val === 'boolean') return val ? 'Yes' : 'No';
        if (Array.isArray(val)) return val.join(', ') || '—';
        return String(val);
    };

    const generateDiffRows = (oldStr, newStr) => {
        const oldFlat = flattenObject(safeParse(oldStr));
        const newFlat = flattenObject(safeParse(newStr));
        const allKeys = [...new Set([...Object.keys(oldFlat), ...Object.keys(newFlat)])];
        return allKeys.map(key => {
            const oldVal = oldFlat[key];
            const newVal = newFlat[key];
            const inOld = key in oldFlat;
            const inNew = key in newFlat;
            let status;
            if (!inOld) status = 'added';
            else if (!inNew) status = 'removed';
            else if (String(oldVal) !== String(newVal)) status = 'changed';
            else status = 'same';
            return { key, oldVal, newVal, status };
        });
    };

    const generateSingleRows = (str) => {
        const flat = flattenObject(safeParse(str));
        return Object.entries(flat).map(([key, val]) => ({ key, val }));
    };

    const toTitleCase = (key) =>
        key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const DiffBadge = ({ status }) => {
        const map = {
            changed: { cls: 'bg-warning-focus text-warning-main', label: '🔄 Changed' },
            added:   { cls: 'bg-success-focus text-success-main',  label: '➕ Added'   },
            removed: { cls: 'bg-danger-focus text-danger-main',    label: '❌ Removed'  },
            same:    { cls: 'bg-neutral-200 text-secondary-light', label: '✔ No Change' },
        };
        const { cls, label } = map[status] || map.same;
        return <span className={`px-8 py-2 rounded-pill fw-medium text-xs ${cls}`}>{label}</span>;
    };

    const UpdateDiffTable = ({ oldStr, newStr }) => {
        const rows = generateDiffRows(oldStr, newStr);
        if (!rows.length) return <p className="text-secondary-light text-sm">No data available.</p>;
        return (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <table className="table table-bordered table-sm mb-0" style={{ fontSize: '13px' }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#f8f9fa', zIndex: 1 }}>
                        <tr>
                            <th style={{ width: '28%' }}>Field</th>
                            <th style={{ width: '28%' }}>Old Value</th>
                            <th style={{ width: '28%' }}>New Value</th>
                            <th style={{ width: '16%' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(({ key, oldVal, newVal, status }) => (
                            <tr key={key} style={
                                status === 'changed' ? { background: '#fffbea' } :
                                status === 'added'   ? { background: '#f0fff4' } :
                                status === 'removed' ? { background: '#fff5f5' } : {}
                            }>
                                <td className="fw-medium text-dark">{toTitleCase(key)}</td>
                                <td className="text-secondary">{formatValue(oldVal)}</td>
                                <td className={status === 'changed' || status === 'added' ? 'fw-semibold text-dark' : 'text-secondary'}>{formatValue(newVal)}</td>
                                <td><DiffBadge status={status} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const SingleValueTable = ({ str, label }) => {
        const rows = generateSingleRows(str);
        if (!rows.length) return <p className="text-secondary-light text-sm">No data available.</p>;
        return (
            <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                <table className="table table-bordered table-sm mb-0" style={{ fontSize: '13px' }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#f8f9fa', zIndex: 1 }}>
                        <tr>
                            <th style={{ width: '40%' }}>Field</th>
                            <th>{label}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(({ key, val }) => (
                            <tr key={key}>
                                <td className="fw-medium text-dark">{toTitleCase(key)}</td>
                                <td className="text-secondary">{formatValue(val)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const getUserName = (userId) => {
        const user = users.find(u => u.id === userId);
        return user ? user.full_name || user.username : `User ${userId}`;
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

    const getCurrentData = () => {
        if (activeTab === 'recent') return recentActivities;
        return logs;
    };

    const canAccess = ['district', 'block'].includes(userRole);

    if (!canAccess) {
        return (
            <div className="card h-100 p-24 text-center">
                <Icon icon="material-symbols:lock" className="text-danger" style={{fontSize: '64px'}} />
                <h5 className="mt-3">Access Denied</h5>
                <p className="text-secondary-light">Only District and Block users can access audit logs.</p>
            </div>
        );
    }

    return (
        <div className="card h-100 p-0 radius-12">
            {/* Statistics Cards */}
            {statistics && (
                <div className="col-12">
                    <div className="card radius-12">
                        <div className="card-body p-16">
                            <div className="row gy-4">
                                <div className="col-xxl-3 col-xl-4 col-sm-6">
                                    <div className="px-20 py-16 shadow-none radius-8 h-100 gradient-deep-1 left-line line-bg-primary">
                                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8">
                                            <div>
                                                <span className="mb-2 fw-medium text-secondary-light text-md">Total Actions</span>
                                                <h6 className="fw-semibold mb-1">{statistics.total_actions}</h6>
                                            </div>
                                            <span className="w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-2xl mb-12 bg-primary-100 text-primary-600">
                                                <Icon icon="material-symbols:history" />
                                            </span>
                                        </div>
                                        <p className="text-sm mb-0">
                                            <span className="bg-success-focus px-1 rounded-2 fw-medium text-success-main text-sm">
                                                Last {statistics.period_days} days
                                            </span>
                                        </p>
                                    </div>
                                </div>
                                <div className="col-xxl-3 col-xl-4 col-sm-6">
                                    <div className="px-20 py-16 shadow-none radius-8 h-100 gradient-deep-2 left-line line-bg-lilac">
                                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8">
                                            <div>
                                                <span className="mb-2 fw-medium text-secondary-light text-md">Active Users</span>
                                                <h6 className="fw-semibold mb-1">{statistics.most_active_users?.length || 0}</h6>
                                            </div>
                                            <span className="w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-2xl mb-12 bg-lilac-200 text-lilac-600">
                                                <Icon icon="flowbite:users-group-outline" />
                                            </span>
                                        </div>
                                        <p className="text-sm mb-0">
                                            <span className="bg-info-focus px-1 rounded-2 fw-medium text-info-main text-sm">
                                                Contributing users
                                            </span>
                                        </p>
                                    </div>
                                </div>
                                <div className="col-xxl-3 col-xl-4 col-sm-6">
                                    <div className="px-20 py-16 shadow-none radius-8 h-100 bg-success-100 left-line line-bg-success">
                                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8">
                                            <div>
                                                <span className="mb-2 fw-medium text-secondary-light text-md">Create Actions</span>
                                                <h6 className="fw-semibold mb-1">
                                                    {statistics.actions_by_type?.find(a => a.action === 'CREATE')?.count || 0}
                                                </h6>
                                            </div>
                                            <span className="w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-2xl mb-12 bg-success-200 text-success-600">
                                                <Icon icon="material-symbols:add-circle" />
                                            </span>
                                        </div>
                                        <p className="text-sm mb-0">
                                            <span className="bg-success-focus px-1 rounded-2 fw-medium text-success-main text-sm">
                                                New records
                                            </span>
                                        </p>
                                    </div>
                                </div>
                                <div className="col-xxl-3 col-xl-4 col-sm-6">
                                    <div className="px-20 py-16 shadow-none radius-8 h-100 gradient-deep-4 left-line line-bg-warning">
                                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8">
                                            <div>
                                                <span className="mb-2 fw-medium text-secondary-light text-md">Update Actions</span>
                                                <h6 className="fw-semibold mb-1">
                                                    {statistics.actions_by_type?.find(a => a.action === 'UPDATE')?.count || 0}
                                                </h6>
                                            </div>
                                            <span className="w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-2xl mb-12 bg-warning-focus text-warning-600">
                                                <Icon icon="material-symbols:edit" />
                                            </span>
                                        </div>
                                        <p className="text-sm mb-0">
                                            <span className="bg-warning-focus px-1 rounded-2 fw-medium text-warning-main text-sm">
                                                Modified records
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-3">
                    <h6 className="text-lg fw-semibold mb-0">Audit Logs</h6>
                    <span className="text-sm text-secondary-light fw-medium">({totalLogs} records)</span>
                </div>
            </div>

            {/* Filters */}
            <div className="card-header border-bottom bg-base py-16 px-24">
                <div className="row g-3">
                    <div className="col-md-3">
                        <label className="form-label text-sm">User</label>
                        <select className="form-select" value={filters.user_id} onChange={(e) => setFilters({...filters, user_id: e.target.value})}>
                            <option value="">All Users</option>
                            {users.map(user => (
                                <option key={user.id} value={user.id}>{user.full_name || user.username}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-2">
                        <label className="form-label text-sm">Action</label>
                        <select className="form-select" value={filters.action} onChange={(e) => setFilters({...filters, action: e.target.value})}>
                            <option value="">All Actions</option>
                            {actions.map(action => (
                                <option key={action} value={action}>{action}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-2">
                        <label className="form-label text-sm">Entity Type</label>
                        <select className="form-select" value={filters.entity_type} onChange={(e) => setFilters({...filters, entity_type: e.target.value})}>
                            <option value="">All Types</option>
                            {entityTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-2">
                        <label className="form-label text-sm">Start Date</label>
                        <input type="date" className="form-control" value={filters.start_date} onChange={(e) => setFilters({...filters, start_date: e.target.value})} />
                    </div>
                    <div className="col-md-2">
                        <label className="form-label text-sm">End Date</label>
                        <input type="date" className="form-control" value={filters.end_date} onChange={(e) => setFilters({...filters, end_date: e.target.value})} />
                    </div>
                    <div className="col-md-1 d-flex align-items-end gap-2">
                        <button className="btn btn-primary btn-sm" onClick={handleFilter}>
                            <Icon icon="ion:search-outline" />
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={handleReset}>
                            <Icon icon="tabler:reload" className="icon reload-button" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="card-header border-bottom bg-base py-16 px-24">
                <div className="d-flex align-items-center flex-wrap gap-3 justify-content-between">
                    <div className="d-flex align-items-center flex-wrap gap-3">
                        <ul className="nav border-gradient-tab nav-pills" role="tablist">
                            <li className="nav-item" role="presentation">
                                <button className={`nav-link ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')} type="button">
                                    All Logs ({logs.length})
                                </button>
                            </li>
                            <li className="nav-item" role="presentation">
                                <button className={`nav-link ${activeTab === 'recent' ? 'active' : ''}`} onClick={() => setActiveTab('recent')} type="button">
                                    Recent Activities ({recentActivities.length})
                                </button>
                            </li>
                        </ul>
                        
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
                </div>
            </div>

            {/* Data Table */}
            <div className="card-body p-24">
                <div className="table-responsive scroll-sm">
                    <table className="table bordered-table sm-table mb-0">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>User</th>
                                <th>Action</th>
                                <th>Entity</th>
                                <th>IP Address</th>
                                <th>Timestamp</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" className="text-center py-4">Loading...</td></tr>
                            ) : getCurrentData().length === 0 ? (
                                <tr><td colSpan="7" className="text-center py-4">No logs found</td></tr>
                            ) : (
                                getCurrentData().slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((log, index) => (
                                    <tr key={log.id}>
                                        <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                        <td>
                                            <div className="text-sm">{getUserName(log.user_id)}</div>
                                            <div className="text-xs text-secondary-light">ID: {log.user_id}</div>
                                        </td>
                                        <td>
                                            <span className={`px-16 py-4 rounded-pill fw-medium text-xs ${getActionBadge(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="text-sm">{log.entity_type}</div>
                                            {log.entity_id && <div className="text-xs text-secondary-light">ID: {log.entity_id}</div>}
                                        </td>
                                        <td className="text-sm">{log.ip_address || 'N/A'}</td>
                                        <td className="text-sm">{formatDateTime(log.created_at)}</td>
                                        <td>
                                            <button 
                                                className="bg-primary-50 text-primary-600 bg-hover-primary-100 w-32-px h-32-px d-flex justify-content-center align-items-center rounded-circle"
                                                onClick={() => { setSelectedLog(log); setShowDetailModal(true); }}
                                                title="View Details"
                                            >
                                                <Icon icon="iconamoon:eye-light" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination */}
                {getCurrentData().length > itemsPerPage && (
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-24">
                        <span className="text-sm text-secondary-light">
                            Showing {Math.min((currentPage - 1) * itemsPerPage + 1, getCurrentData().length)} to {Math.min(currentPage * itemsPerPage, getCurrentData().length)} of {getCurrentData().length} entries
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
                            {getVisiblePages(currentPage, Math.ceil(getCurrentData().length / itemsPerPage)).map((page, index) => {
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
                                    onClick={() => setCurrentPage(Math.min(Math.ceil(getCurrentData().length / itemsPerPage), currentPage + 1))}
                                    disabled={currentPage === Math.ceil(getCurrentData().length / itemsPerPage)}
                                    title="Next Page"
                                >
                                    <Icon icon="ep:d-arrow-right" className="" />
                                </button>
                            </li>
                            {/* Last Page */}
                            <li className="page-item">
                                <button
                                    className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md"
                                    onClick={() => setCurrentPage(Math.ceil(getCurrentData().length / itemsPerPage))}
                                    disabled={currentPage === Math.ceil(getCurrentData().length / itemsPerPage)}
                                    title="Last Page"
                                >
                                    <Icon icon="ep:d-arrow-right" /><Icon icon="ep:d-arrow-right" />
                                </button>
                            </li>
                        </ul>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedLog && (
                <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Audit Log Details</h5>
                                <button className="btn-close" onClick={() => setShowDetailModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <div className="p-16 radius-8 bg-neutral-50">
                                            <span className="text-secondary-light fw-medium">Log ID:</span>
                                            <span className="ms-12 fw-semibold">{selectedLog.id}</span>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="p-16 radius-8 bg-neutral-50">
                                            <span className="text-secondary-light fw-medium">User:</span>
                                            <span className="ms-12 fw-semibold">{getUserName(selectedLog.user_id)}</span>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="p-16 radius-8 bg-neutral-50">
                                            <span className="text-secondary-light fw-medium">Action:</span>
                                            <span className={`ms-12 px-16 py-4 rounded-pill fw-medium text-xs ${getActionBadge(selectedLog.action)}`}>
                                                {selectedLog.action}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="p-16 radius-8 bg-neutral-50">
                                            <span className="text-secondary-light fw-medium">Entity:</span>
                                            <span className="ms-12 fw-semibold">{selectedLog.entity_type} #{selectedLog.entity_id}</span>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="p-16 radius-8 bg-neutral-50">
                                            <span className="text-secondary-light fw-medium">IP Address:</span>
                                            <span className="ms-12 fw-semibold">{selectedLog.ip_address || 'N/A'}</span>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="p-16 radius-8 bg-neutral-50">
                                            <span className="text-secondary-light fw-medium">Timestamp:</span>
                                            <span className="ms-12 fw-semibold">{formatDateTime(selectedLog.created_at)}</span>
                                        </div>
                                    </div>
                                    {(selectedLog.old_values || selectedLog.new_values) && (
                                        <div className="col-12">
                                            <div className="p-16 radius-8" style={{ border: '1px solid #e9ecef' }}>
                                                {selectedLog.action === 'UPDATE' ? (
                                                    <>
                                                        <div className="d-flex align-items-center gap-2 mb-12">
                                                            <Icon icon="material-symbols:compare-arrows" className="text-warning-main" />
                                                            <span className="fw-semibold text-sm">What Changed</span>
                                                            <span className="text-xs text-secondary-light ms-auto">
                                                                {generateDiffRows(selectedLog.old_values, selectedLog.new_values).filter(r => r.status === 'changed').length} field(s) modified
                                                            </span>
                                                        </div>
                                                        <UpdateDiffTable oldStr={selectedLog.old_values} newStr={selectedLog.new_values} />
                                                    </>
                                                ) : selectedLog.action === 'DELETE' ? (
                                                    <>
                                                        <div className="d-flex align-items-center gap-2 mb-12">
                                                            <Icon icon="material-symbols:delete-outline" className="text-danger-main" />
                                                            <span className="fw-semibold text-sm">Deleted Data Snapshot</span>
                                                        </div>
                                                        <SingleValueTable str={selectedLog.old_values} label="Value at Deletion" />
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="d-flex align-items-center gap-2 mb-12">
                                                            <Icon icon="material-symbols:add-circle-outline" className="text-primary-main" />
                                                            <span className="fw-semibold text-sm">Created Record Data</span>
                                                        </div>
                                                        <SingleValueTable str={selectedLog.new_values || selectedLog.old_values} label="Value" />
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {selectedLog.user_agent && (
                                        <div className="col-12">
                                            <div className="p-16 radius-8 bg-neutral-50">
                                                <span className="text-secondary-light fw-medium">User Agent:</span>
                                                <span className="ms-12 text-xs">{selectedLog.user_agent}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditLogsLayer;
