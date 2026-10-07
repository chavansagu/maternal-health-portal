import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';
import {
    ListToolbar, ToolbarLeft, ToolbarRight, EntriesSelect, SearchBox, FilterSelect, RefreshButton, TableFooter, PAGE_SIZE_OPTIONS,
} from './common/ListControls';
import { mobilisationAPI } from '../services/api';
import { getUserRole } from '../services/auth';
import { formatDate, formatDateTime } from '../utils/dateFormatter';

const TRIGGER_LABELS = {
    near_edd: 'Near EDD',
    missed_anc: 'Missed ANC Visit',
    missed_pmsma: 'Missed PMSMA Session',
    missed_usg: 'Missed USG Appointment',
    hrp_unreferred: 'HRP Not Referred',
};

const TRIGGER_BADGE_CLASS = {
    near_edd: 'bg-info-focus text-info-main',
    missed_anc: 'bg-warning-focus text-warning-main',
    missed_pmsma: 'bg-warning-focus text-warning-main',
    missed_usg: 'bg-warning-focus text-warning-main',
    hrp_unreferred: 'bg-danger-focus text-danger-main',
};

const ESCALATION_BADGE_CLASS = {
    anm: 'bg-neutral-200 text-neutral-700',
    block: 'bg-warning-focus text-warning-main',
    district: 'bg-danger-focus text-danger-main',
};

const MobilisationManagementLayer = () => {
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(PAGE_SIZE_OPTIONS[0]);
    const [currentPage, setCurrentPage] = useState(1);
    const [triggerFilter, setTriggerFilter] = useState('');
    const [showMarkModal, setShowMarkModal] = useState(false);
    const [selectedCase, setSelectedCase] = useState(null);
    const [remarks, setRemarks] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const userRole = getUserRole();

    useEffect(() => {
        fetchCases();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [triggerFilter]);

    // Go back to page 1 whenever the visible result set changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, triggerFilter, itemsPerPage]);

    const fetchCases = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await mobilisationAPI.getCases({
                triggerType: triggerFilter || undefined,
            });
            setCases(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message || 'Failed to load mobilisation cases');
        } finally {
            setLoading(false);
        }
    };

    const openMarkModal = (mobilisationCase) => {
        setSelectedCase(mobilisationCase);
        setRemarks('');
        setShowMarkModal(true);
    };

    const handleMarkMobilised = async () => {
        if (!selectedCase) return;
        setSubmitting(true);
        try {
            await mobilisationAPI.markMobilised(selectedCase.id, remarks);
            setShowMarkModal(false);
            setSelectedCase(null);
            fetchCases();
        } catch (err) {
            setError(err.message || 'Failed to mark as mobilised');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredCases = cases.filter((c) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            c.pregnant_woman_name?.toLowerCase().includes(term) ||
            c.mobile_number?.includes(term)
        );
    });

    const totalPages = Math.max(Math.ceil(filteredCases.length / itemsPerPage), 1);
    const safePage = Math.min(currentPage, totalPages);
    const pagedRows = filteredCases.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

    return (
        <div className="card basic-data-table">
            <div className="card-header">
                <h5 className="card-title mb-0">Mobilisation List</h5>
            </div>

            <div className="card-body">
                <ListToolbar>
                    <ToolbarLeft>
                        <EntriesSelect value={itemsPerPage} onChange={setItemsPerPage} />
                        <SearchBox value={searchTerm} onChange={setSearchTerm} placeholder="Search name / mobile" />
                        <FilterSelect value={triggerFilter} onChange={setTriggerFilter} ariaLabel="Filter by trigger">
                            <option value="">All Triggers</option>
                            {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </FilterSelect>
                    </ToolbarLeft>
                    <ToolbarRight>
                        <RefreshButton onClick={fetchCases} disabled={loading} />
                    </ToolbarRight>
                </ListToolbar>

                {error && <div className="alert alert-danger py-2">{error}</div>}

                <div className="table-responsive">
                    <table className="table bordered-table mb-0">
                        <thead>
                            <tr>
                                <th>Pregnant Woman</th>
                                <th>Mobile</th>
                                <th>Trigger</th>
                                <th>Detail</th>
                                <th>Escalation</th>
                                <th>Raised On</th>
                                <th className="text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr><td colSpan="7" className="text-center py-4">Loading...</td></tr>
                            )}
                            {!loading && filteredCases.length === 0 && (
                                <tr><td colSpan="7" className="text-center py-4 text-secondary-light">
                                    No open mobilisation cases.
                                </td></tr>
                            )}
                            {!loading && pagedRows.map((c) => (
                                <tr key={c.id}>
                                    <td>
                                        {c.pregnant_woman_name}
                                        {c.is_high_risk && (
                                            <span className="badge bg-danger-focus text-danger-main ms-2">HRP</span>
                                        )}
                                    </td>
                                    <td>{c.mobile_number}</td>
                                    <td>
                                        <span className={`badge ${TRIGGER_BADGE_CLASS[c.trigger_type] || 'bg-neutral-200'}`}>
                                            {TRIGGER_LABELS[c.trigger_type] || c.trigger_type}
                                        </span>
                                    </td>
                                    <td>{c.trigger_detail}</td>
                                    <td>
                                        <span className={`badge ${ESCALATION_BADGE_CLASS[c.escalation_level] || 'bg-neutral-200'}`}>
                                            {c.escalation_level?.toUpperCase()}
                                        </span>
                                    </td>
                                    <td>{formatDate ? formatDate(c.created_at) : c.created_at}</td>
                                    <td className="text-center">
                                        <button
                                            className="btn btn-sm btn-success-600"
                                            onClick={() => openMarkModal(c)}
                                        >
                                            <Icon icon="mdi:check-circle-outline" className="me-1" />
                                            Mark Mobilised
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <TableFooter
                    total={filteredCases.length}
                    unfilteredTotal={cases.length}
                    page={safePage}
                    pageSize={itemsPerPage}
                    onPageChange={setCurrentPage}
                />
            </div>

            {showMarkModal && selectedCase && (
                <div className="modal d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h6 className="modal-title">Mark as Mobilised</h6>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowMarkModal(false)}
                                />
                            </div>
                            <div className="modal-body">
                                <p className="mb-2">
                                    <strong>{selectedCase.pregnant_woman_name}</strong> — {TRIGGER_LABELS[selectedCase.trigger_type]}
                                </p>
                                <p className="text-secondary-light mb-3">{selectedCase.trigger_detail}</p>
                                <label className="form-label">Remarks (optional)</label>
                                <textarea
                                    className="form-control"
                                    rows="3"
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    placeholder="e.g. Visited home, counselled family, will attend next camp"
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
                                    onClick={handleMarkMobilised}
                                    disabled={submitting}
                                >
                                    {submitting ? 'Saving...' : 'Confirm Mobilised'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MobilisationManagementLayer;
