import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';
import {
    ListToolbar, ToolbarLeft, ToolbarRight, EntriesSelect, SearchBox, FilterSelect, RefreshButton, TableFooter, PAGE_SIZE_OPTIONS,
} from './common/ListControls';
import { pncReminderAPI } from '../services/api';
import { getUserRole } from '../services/auth';
import { formatDate } from '../utils/dateFormatter';

const VISIT_LABELS = {
    '48hr': '48 Hours',
    day7: 'Day 7',
    day42: 'Day 42',
};

const VISIT_BADGE_CLASS = {
    '48hr': 'bg-danger-focus text-danger-main',
    day7: 'bg-warning-focus text-warning-main',
    day42: 'bg-info-focus text-info-main',
};

const STATUS_BADGE_CLASS = {
    scheduled: 'bg-neutral-200 text-neutral-700',
    due: 'bg-danger-focus text-danger-main',
    completed: 'bg-success-focus text-success-main',
};

const PNCReminderManagementLayer = () => {
    const [reminders, setReminders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(PAGE_SIZE_OPTIONS[0]);
    const [currentPage, setCurrentPage] = useState(1);
    const [visitFilter, setVisitFilter] = useState('');
    const [showMarkModal, setShowMarkModal] = useState(false);
    const [selectedReminder, setSelectedReminder] = useState(null);
    const [remarks, setRemarks] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const userRole = getUserRole();

    useEffect(() => {
        fetchReminders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visitFilter]);

    // Go back to page 1 whenever the visible result set changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, visitFilter, itemsPerPage]);

    const fetchReminders = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await pncReminderAPI.getReminders({
                visitLabel: visitFilter || undefined,
            });
            setReminders(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message || 'Failed to load PNC reminders');
        } finally {
            setLoading(false);
        }
    };

    const openMarkModal = (reminder) => {
        setSelectedReminder(reminder);
        setRemarks('');
        setShowMarkModal(true);
    };

    const handleMarkDone = async () => {
        if (!selectedReminder) return;
        setSubmitting(true);
        try {
            await pncReminderAPI.markDone(selectedReminder.id, remarks);
            setShowMarkModal(false);
            setSelectedReminder(null);
            fetchReminders();
        } catch (err) {
            setError(err.message || 'Failed to mark reminder as done');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredReminders = reminders.filter((r) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            r.pregnant_woman_name?.toLowerCase().includes(term) ||
            r.mobile_number?.includes(term)
        );
    });

    const totalPages = Math.max(Math.ceil(filteredReminders.length / itemsPerPage), 1);
    const safePage = Math.min(currentPage, totalPages);
    const pagedRows = filteredReminders.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

    return (
        <div className="card basic-data-table">
            <div className="card-header">
                <h5 className="card-title mb-0">PNC Reminder List</h5>
            </div>

            <div className="card-body">
                <ListToolbar>
                    <ToolbarLeft>
                        <EntriesSelect value={itemsPerPage} onChange={setItemsPerPage} />
                        <SearchBox value={searchTerm} onChange={setSearchTerm} placeholder="Search name / mobile" />
                        <FilterSelect value={visitFilter} onChange={setVisitFilter} ariaLabel="Filter by visit">
                            <option value="">All Visits</option>
                            {Object.entries(VISIT_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </FilterSelect>
                    </ToolbarLeft>
                    <ToolbarRight>
                        <RefreshButton onClick={fetchReminders} disabled={loading} />
                    </ToolbarRight>
                </ListToolbar>

                {error && <div className="alert alert-danger py-2">{error}</div>}

                <div className="table-responsive">
                    <table className="table bordered-table mb-0">
                        <thead>
                            <tr>
                                <th>Pregnant Woman</th>
                                <th>Mobile</th>
                                <th>PNC Visit</th>
                                <th>Due Date</th>
                                <th>Status</th>
                                <th className="text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr><td colSpan="6" className="text-center py-4">Loading...</td></tr>
                            )}
                            {!loading && filteredReminders.length === 0 && (
                                <tr><td colSpan="6" className="text-center py-4 text-secondary-light">
                                    No open PNC reminders.
                                </td></tr>
                            )}
                            {!loading && pagedRows.map((r) => (
                                <tr key={r.id}>
                                    <td>
                                        {r.pregnant_woman_name}
                                        {r.is_high_risk && (
                                            <span className="badge bg-danger-focus text-danger-main ms-2">HRP</span>
                                        )}
                                    </td>
                                    <td>{r.mobile_number}</td>
                                    <td>
                                        <span className={`badge ${VISIT_BADGE_CLASS[r.visit_label] || 'bg-neutral-200'}`}>
                                            {VISIT_LABELS[r.visit_label] || r.visit_label}
                                        </span>
                                    </td>
                                    <td>{formatDate ? formatDate(r.due_date) : r.due_date}</td>
                                    <td>
                                        <span className={`badge ${STATUS_BADGE_CLASS[r.status] || 'bg-neutral-200'}`}>
                                            {r.status?.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="text-center">
                                        <button
                                            className="btn btn-sm btn-success-600"
                                            onClick={() => openMarkModal(r)}
                                        >
                                            <Icon icon="mdi:check-circle-outline" className="me-1" />
                                            Mark Done
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <TableFooter
                    total={filteredReminders.length}
                    unfilteredTotal={reminders.length}
                    page={safePage}
                    pageSize={itemsPerPage}
                    onPageChange={setCurrentPage}
                />
            </div>

            {showMarkModal && selectedReminder && (
                <div className="modal d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h6 className="modal-title">Mark PNC Visit Done</h6>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowMarkModal(false)}
                                />
                            </div>
                            <div className="modal-body">
                                <p className="mb-2">
                                    <strong>{selectedReminder.pregnant_woman_name}</strong> — {VISIT_LABELS[selectedReminder.visit_label]}
                                </p>
                                <label className="form-label">Remarks (optional)</label>
                                <textarea
                                    className="form-control"
                                    rows="3"
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    placeholder="e.g. Visited home, mother and baby doing well"
                                />
                            </div>
                            <div className="modal-footer">
                                <button
                                    className="btn btn-outline-secondary"
                                    onClick={() => setShowMarkModal(false)}
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-success-600"
                                    onClick={handleMarkDone}
                                    disabled={submitting}
                                >
                                    {submitting ? 'Saving...' : 'Confirm Done'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PNCReminderManagementLayer;
