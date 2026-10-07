import React, { useState, useEffect } from 'react';
import { ancVisitAPI } from '../../services/api';
import { formatDate } from '../../utils/dateFormatter';

const dash = (v) => (v === null || v === undefined || v === '' ? '—' : v);

const YesNo = ({ value, danger }) =>
    value ? (
        <span className={`px-8 py-2 rounded-pill text-xs fw-medium ${danger ? 'bg-danger-focus text-danger-main' : 'bg-warning-focus text-warning-main'}`}>Yes</span>
    ) : (
        <span className="text-secondary-light">No</span>
    );

/**
 * Read-only basic details + ANC visits of a pregnant woman, for use inside the
 * PMSMA session details modal (sub-centre and PMSMA logins). Data comes from
 * GET /api/v2/anc-visits/pregnant-woman/{pwId}.
 */
const PMSMAANCDetails = ({ pwId }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!pwId) return undefined;
        let cancelled = false;
        setLoading(true);
        setError('');
        setData(null);
        ancVisitAPI
            .getVisitsForPregnantWoman(pwId)
            .then((res) => { if (!cancelled) setData(res); })
            .catch((e) => { if (!cancelled) setError(e?.message || 'Failed to load ANC details'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [pwId]);

    if (!pwId) return <div className="text-secondary-light">ANC details are not available for this session.</div>;
    if (loading) {
        return (
            <div className="text-center py-24">
                <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                <span className="ms-8 text-secondary-light">Loading ANC details...</span>
            </div>
        );
    }
    if (error) return <div className="alert alert-danger mb-0">{error}</div>;
    if (!data) return null;

    const visits = Array.isArray(data.visits) ? data.visits : [];

    const pw = data.pregnant_woman || {};
    const details = [
        ['Name', pw.full_name],
        ['Age', pw.age ? `${pw.age} yrs` : null],
        ['Husband Name', pw.husband_name],
        ['Mobile', pw.mobile_number],
        ['RCH ID', pw.rch_id],
        ['Blood Group', pw.blood_group],
        ['LMP', pw.lmp_date ? formatDate(pw.lmp_date) : null],
        ['EDD', pw.edd_date ? formatDate(pw.edd_date) : null],
        ['Gravida / Para', pw.gravida != null || pw.para != null ? `${dash(pw.gravida)} / ${dash(pw.para)}` : null],
        ['Sub-Centre', pw.sub_centre_name],
        ['Ward', pw.ward_name],
        ['Address', pw.address],
    ];

    return (
        <div>
            <h6 className="text-md fw-semibold mb-12">Basic Details</h6>
            <div className="row g-3 mb-16 p-3 bg-neutral-50 radius-8 mx-0">
                {details.map(([label, value]) => (
                    <div className={label === 'Address' ? 'col-12' : 'col-md-4 col-sm-6'} key={label}>
                        <div className="text-secondary-light text-sm">{label}</div>
                        <div className="fw-semibold">{dash(value)}</div>
                    </div>
                ))}
                <div className="col-md-4 col-sm-6">
                    <div className="text-secondary-light text-sm">High Risk</div>
                    <div><YesNo value={pw.is_high_risk} danger /></div>
                </div>
                {pw.is_high_risk && pw.risk_factors && (
                    <div className="col-12">
                        <div className="text-secondary-light text-sm">Risk Factors</div>
                        <div className="fw-semibold">{pw.risk_factors}</div>
                    </div>
                )}
            </div>

            <h6 className="text-md fw-semibold mb-12">ANC Records</h6>
            <div className="d-flex flex-wrap gap-24 mb-16">
                <div>
                    <div className="text-secondary-light text-sm">Total ANC Visits</div>
                    <div className="fw-semibold">{data.total_visits ?? visits.length}</div>
                </div>
                <div>
                    <div className="text-secondary-light text-sm">Next Due Date</div>
                    <div className="fw-semibold">{data.next_due_date ? formatDate(data.next_due_date) : '—'}</div>
                </div>
            </div>

            {visits.length === 0 ? (
                <div className="text-center text-secondary-light py-24">No ANC visits recorded yet.</div>
            ) : (
                <div className="table-responsive scroll-sm">
                    <table className="table bordered-table sm-table mb-0">
                        <thead>
                            <tr>
                                <th>ANC #</th>
                                <th>Visit Date</th>
                                <th>BP</th>
                                <th>Weight (kg)</th>
                                <th>Hb</th>
                                <th>Fundal Ht</th>
                                <th>FHR</th>
                                <th>USG Referred</th>
                                <th>Emergency</th>
                                <th>Facility</th>
                                <th>Next Visit</th>
                                <th>Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visits.map((v) => (
                                <tr key={v.id}>
                                    <td>{dash(v.visit_number)}</td>
                                    <td>{v.visit_date ? formatDate(v.visit_date) : '—'}</td>
                                    <td>{dash(v.blood_pressure)}</td>
                                    <td>{dash(v.weight)}</td>
                                    <td>{dash(v.hemoglobin)}</td>
                                    <td>{dash(v.fundal_height)}</td>
                                    <td>{dash(v.fetal_heart_rate)}</td>
                                    <td><YesNo value={v.referred_for_usg} /></td>
                                    <td><YesNo value={v.is_emergency} danger /></td>
                                    <td>{dash(v.facility_name)}</td>
                                    <td>{v.next_visit_date ? formatDate(v.next_visit_date) : '—'}</td>
                                    <td style={{ minWidth: 160 }}>{dash(v.doctor_notes)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default PMSMAANCDetails;