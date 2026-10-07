import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';
import { getUserRole } from '../services/auth';
import { reportsAPI } from '../services/api';
import ChartRenderer from './child/ChartRenderer';
import { formatDate, formatDateTime, getTodayISO } from '../utils/dateFormatter';

// USG Appointment Status Options (matches backend enum)
const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Scheduled', color: 'primary' },
  { value: 'accepted', label: 'Accepted', color: 'info' },
  { value: 'rescheduled', label: 'Rescheduled', color: 'warning' },
  { value: 'completed', label: 'Completed', color: 'success' },
  { value: 'cancelled', label: 'Cancelled', color: 'danger' }
];

// Helper to get status label (capitalized, human-readable)
const getStatusLabel = (status) => {
  const option = STATUS_OPTIONS.find(opt => opt.value === status);
  return option ? option.label : status.charAt(0).toUpperCase() + status.slice(1);
};

// Helper to get status badge color
const getStatusColor = (status) => {
  const option = STATUS_OPTIONS.find(opt => opt.value === status);
  return option ? option.color : 'secondary';
};

const ReportsLayerNew = () => {
  const [userRole, setUserRole] = useState(getUserRole());
  const [dateError, setDateError] = useState('');
  
  const allReportTabs = [
    { id: 'high-risk', label: 'High-Risk Tracking', icon: 'mdi:alert-circle', roles: ['district', 'block', 'sub_centre'] },
    { id: 'anc-compliance', label: 'ANC Compliance', icon: 'mdi:calendar-check', roles: ['district', 'block', 'sub_centre'] },
    { id: 'usg-status', label: 'USG Status', icon: 'mdi:hospital-box', roles: ['district', 'block', 'sub_centre', 'usg_centre'] },
    { id: 'pmsma', label: 'PMSMA Sessions', icon: 'mdi:stethoscope', roles: ['district', 'block', 'sub_centre', 'pmsma'] },
    { id: 'mobilisation', label: 'Mobilisation', icon: 'mdi:phone-alert', roles: ['district', 'block', 'sub_centre'] },
    { id: 'pnc-followup', label: 'PNC Follow-up', icon: 'mdi:heart-pulse', roles: ['district', 'block', 'sub_centre'] },
    { id: 'comparative', label: 'Comparative Analysis', icon: 'mdi:chart-bar', roles: ['district', 'block'] },
    { id: 'trends', label: 'Trend Analysis', icon: 'mdi:chart-line', roles: ['district', 'block'] },
    { id: 'delivery', label: 'Delivery Reports', icon: 'mdi:hospital-building', roles: ['district', 'block', 'sub_centre', 'dp'] },
    // TODO: Enable in next version
    // { id: 'user-activity', label: 'User Activity', icon: 'mdi:account-clock', roles: ['district', 'block'] },
    // { id: 'sms-delivery', label: 'SMS Delivery', icon: 'mdi:message-text', roles: ['district'] },
  ];

  const reportTabs = allReportTabs.filter(tab => tab.roles.includes(userRole));
  const [activeTab, setActiveTab] = useState(reportTabs[0]?.id || 'high-risk');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(30);
  const [statusFilter, setStatusFilter] = useState('');
  const [hrSearch, setHrSearch] = useState('');
  const [ancSearch, setAncSearch] = useState('');
  const [ancStatusFilter, setAncStatusFilter] = useState('');
  const [usgSearch, setUsgSearch] = useState('');
  const [compSearch, setCompSearch] = useState('');
  
  // Auto-select comparison type based on user role
  const getDefaultComparisonType = () => {
    if (userRole === 'district') return 'block';
    if (userRole === 'block') return 'sub_centre';
    return 'block'; // fallback
  };
  
  const [comparisonType, setComparisonType] = useState(getDefaultComparisonType());
  const [metric, setMetric] = useState('registrations');
  const [months, setMonths] = useState(6);
  const [deliverySubReport, setDeliverySubReport] = useState('delivery-summary');
  const [deliveryPage, setDeliveryPage] = useState(1);
  const deliveryPageSize = 10;

  // Advanced filters (shared vocabulary: block/sub-centre/ward, risk, age band, trimester,
  // parity, blood group, registration source, approval, risk factors, anaemia, ANC contact)
  const [filterOptions, setFilterOptions] = useState(null);
  const [advFilters, setAdvFilters] = useState({
    blockId: '', subCentreId: '', wardId: '', risk: 'all', ageBand: [], trimester: [], parity: [],
    bloodGroup: [], registrationSource: '', approval: '', riskFactor: [], anaemic: '', hasAnc: '',
  });
  const [showAdvFilters, setShowAdvFilters] = useState(false);
  // High-risk tab extras
  const [hrFollowup, setHrFollowup] = useState('');
  const [hrUsgDone, setHrUsgDone] = useState('');
  const [hrSortBy, setHrSortBy] = useState('registered');
  const [hrSortDir, setHrSortDir] = useState('desc');
  // ANC compliance tab extras
  const [ancCompliance, setAncCompliance] = useState('');
  // USG status tab extras
  const [usgOverdueOnly, setUsgOverdueOnly] = useState(false);
  const [usgCentreId, setUsgCentreId] = useState('');
  // PMSMA tab extras
  const [pmsmaSearch, setPmsmaSearch] = useState('');
  const [pmsmaStatus, setPmsmaStatus] = useState('');
  const [pmsmaCentreId, setPmsmaCentreId] = useState('');
  const [pmsmaHighRiskOnly, setPmsmaHighRiskOnly] = useState(false);
  const [pmsmaLowHb, setPmsmaLowHb] = useState(false);
  // Mobilisation tab extras
  const [mobSearch, setMobSearch] = useState('');
  const [mobStatus, setMobStatus] = useState('');
  const [mobTriggerType, setMobTriggerType] = useState('');
  const [mobEscalationLevel, setMobEscalationLevel] = useState('');
  // PNC follow-up tab extras
  const [pncSearch, setPncSearch] = useState('');
  const [pncStatus, setPncStatus] = useState('');
  const [pncVisitLabel, setPncVisitLabel] = useState('');

  useEffect(() => {
    reportsAPI.getReportFilterOptions().then(setFilterOptions).catch(() => setFilterOptions({}));
  }, []);

  const advSet = (k, v) => setAdvFilters(prev => ({ ...prev, [k]: v }));
  const advToggle = (k, v) => setAdvFilters(prev => ({
    ...prev, [k]: prev[k].includes(v) ? prev[k].filter(x => x !== v) : [...prev[k], v]
  }));
  const advActiveCount = Object.entries(advFilters).filter(([k, v]) => {
    if (k === 'risk') return v && v !== 'all';
    if (Array.isArray(v)) return v.length > 0;
    return !!v;
  }).length;

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    return getTodayISO();
  };

  // Validate date inputs
  const validateDates = (start, end) => {
    const today = getTodayDate();
    let error = '';
    
    if (!start || !end) {
      error = 'Both Start Date and End Date are required';
    } else if (start > today) {
      error = 'Start date cannot be in the future';
    } else if (end > today) {
      error = 'End date cannot be in the future';
    } else if (start > end) {
      error = 'End date cannot be earlier than start date';
    }
    
    setDateError(error);
    return error === '';
  };

  const handleStartDateChange = (e) => {
    const newStartDate = e.target.value;
    setStartDate(newStartDate);
    validateDates(newStartDate, endDate);
  };

  const handleEndDateChange = (e) => {
    const newEndDate = e.target.value;
    setEndDate(newEndDate);
    validateDates(startDate, newEndDate);
  };

  const loadReport = async () => {
    // Validate dates before loading report (only for tabs that use date range)
    if (activeTab !== 'trends') {
      if (!startDate || !endDate) {
        alert('Both Start Date and End Date are required');
        return;
      }
      if (!validateDates(startDate, endDate)) {
        alert(dateError);
        return;
      }
    }
    setLoading(true);
    try {
      let data;
      switch (activeTab) {
        case 'high-risk':
          data = await reportsAPI.getHighRiskTracking(
            { startDate, endDate, ...advFilters },
            { followup: hrFollowup, usgDone: hrUsgDone, search: hrSearch, sortBy: hrSortBy, sortDir: hrSortDir },
            page, pageSize
          );
          break;
        case 'anc-compliance':
          data = await reportsAPI.getANCCompliance(
            { startDate, endDate, ...advFilters },
            { compliance: ancCompliance, search: ancSearch },
            page, pageSize
          );
          break;
        case 'usg-status':
          data = await reportsAPI.getUSGStatus(
            { startDate, endDate, ...advFilters },
            { statusFilter, overdueOnly: usgOverdueOnly, usgCentreId, search: usgSearch },
            page, pageSize
          );
          break;
        case 'pmsma':
          data = await reportsAPI.getPMSMAReport(
            { startDate, endDate, ...advFilters },
            { status: pmsmaStatus, pmsmaCentreId, highRiskOnly: pmsmaHighRiskOnly, lowHb: pmsmaLowHb, search: pmsmaSearch },
            page, pageSize
          );
          break;
        case 'mobilisation':
          data = await reportsAPI.getMobilisationReport(
            { startDate, endDate, ...advFilters },
            { status: mobStatus, triggerType: mobTriggerType, escalationLevel: mobEscalationLevel, search: mobSearch },
            page, pageSize
          );
          break;
        case 'pnc-followup':
          data = await reportsAPI.getPNCFollowupReport(
            { startDate, endDate, ...advFilters },
            { status: pncStatus, visitLabel: pncVisitLabel, search: pncSearch },
            page, pageSize
          );
          break;
        case 'comparative':
          data = await reportsAPI.getComparativeAnalysis(startDate, endDate, comparisonType);
          break;
        case 'trends':
          data = await reportsAPI.getTrends(months, metric);
          break;
        case 'delivery':
          if (deliverySubReport === 'delivery-summary') {
            data = await reportsAPI.getDeliverySummary(startDate, endDate);
          } else if (deliverySubReport === 'delivery-outcomes') {
            data = await reportsAPI.getDeliveryOutcomeBreakdown(startDate, endDate);
          } else if (deliverySubReport === 'delivery-performance') {
            data = await reportsAPI.getDeliveryPointPerformance(startDate, endDate);
          }
          break;
        // TODO: Enable in next version
        // case 'user-activity':
        //   data = await reportsAPI.getUserActivity(startDate, endDate);
        //   break;
        // case 'sms-delivery':
        //   data = await reportsAPI.getSMSDelivery(startDate, endDate);
        //   break;
        default:
          data = null;
      }
      setReportData(data);
    } catch (error) {
      console.error('Error loading report:', error);
      alert('Error loading report: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdvancedExport = async (format) => {
    try {
      let response;
      if (activeTab === 'high-risk') {
        response = await reportsAPI.exportHighRiskTracking(format, { startDate, endDate, ...advFilters },
          { followup: hrFollowup, usgDone: hrUsgDone, search: hrSearch, sortBy: hrSortBy, sortDir: hrSortDir });
      } else if (activeTab === 'anc-compliance') {
        response = await reportsAPI.exportANCCompliance(format, { startDate, endDate, ...advFilters },
          { compliance: ancCompliance, search: ancSearch });
      } else if (activeTab === 'usg-status') {
        response = await reportsAPI.exportUSGStatus(format, { startDate, endDate, ...advFilters },
          { statusFilter, overdueOnly: usgOverdueOnly, usgCentreId, search: usgSearch });
      } else if (activeTab === 'pmsma') {
        response = await reportsAPI.exportPMSMAReport(format, { startDate, endDate, ...advFilters },
          { status: pmsmaStatus, pmsmaCentreId, highRiskOnly: pmsmaHighRiskOnly, lowHb: pmsmaLowHb, search: pmsmaSearch });
      } else if (activeTab === 'mobilisation') {
        response = await reportsAPI.exportMobilisationReport(format, { startDate, endDate, ...advFilters },
          { status: mobStatus, triggerType: mobTriggerType, escalationLevel: mobEscalationLevel, search: mobSearch });
      } else if (activeTab === 'pnc-followup') {
        response = await reportsAPI.exportPNCFollowupReport(format, { startDate, endDate, ...advFilters },
          { status: pncStatus, visitLabel: pncVisitLabel, search: pncSearch });
      }
      if (!response || !response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeTab}_${startDate || 'all'}_to_${endDate || 'now'}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Error exporting report. Please try again.');
    }
  };

  const renderHighRiskReport = () => {
    const filtered = (reportData?.cases || []).filter(c =>
      !hrSearch || [c.full_name, c.mobile_number, c.risk_factors].some(v => v?.toLowerCase().includes(hrSearch.toLowerCase()))
    );
    return (
    <div className="card">
      <div className="card-body">
        {reportData?.summary && (
          <div className="row mb-4">
            <div className="col-md-4">
              <div className="text-center p-3 bg-danger-50 rounded">
                <h4 className="text-danger">{reportData.summary.total_high_risk_cases}</h4>
                <p className="mb-0">Total High Risk</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="text-center p-3 bg-success-50 rounded">
                <h4 className="text-success">{reportData.summary.cases_with_recent_followup}</h4>
                <p className="mb-0">Recent Follow-up</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="text-center p-3 bg-warning-50 rounded">
                <h4 className="text-warning">{reportData.summary.cases_needing_attention}</h4>
                <p className="mb-0">Need Attention</p>
              </div>
            </div>
          </div>
        )}
        {reportData?.cases && (
          <>
            <div className="d-flex align-items-center gap-2 mb-3">
              <div className="input-group" style={{maxWidth: 320}}>
                <span className="input-group-text"><Icon icon="mdi:magnify" /></span>
                <input type="text" className="form-control" placeholder="Search by name, mobile, risk factors..." value={hrSearch} onChange={e => setHrSearch(e.target.value)} />
              </div>
              <small className="text-muted">{filtered.length} record(s)</small>
            </div>
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Age</th>
                  <th>Risk Factors</th>
                  <th>EDD</th>
                  <th>Last ANC</th>
                  <th>ANC Visits</th>
                  <th>USG Scans</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? filtered.map((c, i) => (
                  <tr key={i}>
                    <td>{c.full_name}</td>
                    <td>{c.mobile_number}</td>
                    <td>{c.age}</td>
                    <td>{c.risk_factors}</td>
                    <td>{formatDate(c.edd_date)}</td>
                    <td>{formatDate(c.last_anc_visit)}</td>
                    <td>{c.total_anc_visits}</td>
                    <td>{c.usg_scans_completed}</td>
                  </tr>
                )) : <tr><td colSpan={8} className="text-center text-muted">No matching records</td></tr>}
              </tbody>
            </table>
          </div>
          </>
        )}
        {reportData?.pagination && reportData.pagination.total_count > 0 && (
          <div className="d-flex justify-content-between align-items-center mt-3">
            <span>Showing page {reportData.pagination.page} of {reportData.pagination.total_pages} ({reportData.pagination.total_count} total records)</span>
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-outline-primary" disabled={page === 1} onClick={() => { setPage(page - 1); }}>Previous</button>
              <button className="btn btn-sm btn-outline-primary" disabled={page === reportData.pagination.total_pages} onClick={() => { setPage(page + 1); }}>Next</button>
            </div>
          </div>
        )}
        {reportData?.cases && reportData.cases.length === 0 && (
          <div className="alert alert-info text-center mt-3">
            <Icon icon="mdi:information" className="me-2" />
            No high-risk cases found for the selected date range.
          </div>
        )}
      </div>
    </div>
    );
  };

  const renderANCComplianceReport = () => {
    const filtered = (reportData?.compliance_data || []).filter(c =>
      (!ancSearch || [c.full_name, c.mobile_number].some(v => v?.toLowerCase().includes(ancSearch.toLowerCase()))) &&
      (!ancStatusFilter || c.compliance_status === ancStatusFilter)
    );
    return (
    <div className="card">
      <div className="card-body">
        {reportData?.summary && (
          <div className="row mb-4">
            <div className="col-md-3">
              <div className="text-center p-3 bg-primary-50 rounded">
                <h4 className="text-primary">{reportData.summary.total_active_pregnancies}</h4>
                <p className="mb-0">Active Pregnancies</p>
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-center p-3 bg-success-50 rounded">
                <h4 className="text-success">{reportData.summary.compliant}</h4>
                <p className="mb-0">Compliant</p>
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-center p-3 bg-danger-50 rounded">
                <h4 className="text-danger">{reportData.summary.non_compliant}</h4>
                <p className="mb-0">Non-Compliant</p>
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-center p-3 bg-info-50 rounded">
                <h4 className="text-info">{reportData.summary.compliance_rate}%</h4>
                <p className="mb-0">Compliance Rate</p>
              </div>
            </div>
          </div>
        )}
        {reportData?.compliance_data && reportData.compliance_data.length > 0 ? (
          <>
            <div className="d-flex align-items-center gap-2 mb-3">
              <div className="input-group" style={{maxWidth: 280}}>
                <span className="input-group-text"><Icon icon="mdi:magnify" /></span>
                <input type="text" className="form-control" placeholder="Search by name, mobile..." value={ancSearch} onChange={e => setAncSearch(e.target.value)} />
              </div>
              <select className="form-select" style={{maxWidth: 180}} value={ancStatusFilter} onChange={e => setAncStatusFilter(e.target.value)}>
                <option value="">All Status</option>
                <option value="Compliant">Compliant</option>
                <option value="Non-Compliant">Non-Compliant</option>
              </select>
              <small className="text-muted">{filtered.length} record(s)</small>
            </div>
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Expected Visits</th>
                  <th>Actual Visits</th>
                  <th>Status</th>
                  <th>Last Visit</th>
                  <th>Days Since</th>
                  <th>Next Due</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? filtered.map((c, i) => (
                  <tr key={i}>
                    <td>{c.full_name}</td>
                    <td>{c.mobile_number}</td>
                    <td>{c.expected_visits}</td>
                    <td>{c.actual_visits}</td>
                    <td><span className={`badge ${c.compliance_status === 'Compliant' ? 'bg-success' : 'bg-danger'}`}>{c.compliance_status}</span></td>
                    <td>{formatDate(c.last_visit_date)}</td>
                    <td>{c.days_since_last_visit}</td>
                    <td>{formatDate(c.next_visit_due)}</td>
                  </tr>
                )) : <tr><td colSpan={8} className="text-center text-muted">No matching records</td></tr>}
              </tbody>
            </table>
          </div>
          </>
        ) : (
          <div className="alert alert-info text-center mt-3">
            <Icon icon="mdi:information" className="me-2" />
            No compliance data found for the selected date range.
          </div>
        )}
        {reportData?.pagination && reportData.pagination.total_count > 0 && (
          <div className="d-flex justify-content-between align-items-center mt-3">
            <span>Showing page {reportData.pagination.page} of {reportData.pagination.total_pages} ({reportData.pagination.total_count} total records)</span>
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-outline-primary" disabled={page === 1} onClick={() => { setPage(page - 1); }}>Previous</button>
              <button className="btn btn-sm btn-outline-primary" disabled={page === reportData.pagination.total_pages} onClick={() => { setPage(page + 1); }}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
    );
  };

  const renderUSGStatusReport = () => {
    const filtered = (reportData?.appointments || []).filter(a =>
      !usgSearch || [a.pregnant_woman_name, a.mobile_number, a.usg_centre_name].some(v => v?.toLowerCase().includes(usgSearch.toLowerCase()))
    );
    return (
    <div className="card">
      <div className="card-body">
        {reportData?.summary && (
          <div className="row mb-4">
            <div className="col-md-3">
              <div className="text-center p-3 bg-primary-50 rounded">
                <h4 className="text-primary">{reportData.summary.total_appointments}</h4>
                <p className="mb-0">Total Appointments</p>
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-center p-3 bg-danger-50 rounded">
                <h4 className="text-danger">{reportData.summary.overdue_appointments}</h4>
                <p className="mb-0">Overdue</p>
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-center p-3 bg-success-50 rounded">
                <h4 className="text-success">{reportData.summary.completion_rate}%</h4>
                <p className="mb-0">Completion Rate</p>
              </div>
            </div>
          </div>
        )}
        {reportData?.appointments && reportData.appointments.length > 0 ? (
          <>
            <div className="d-flex align-items-center gap-2 mb-3">
              <div className="input-group" style={{maxWidth: 320}}>
                <span className="input-group-text"><Icon icon="mdi:magnify" /></span>
                <input type="text" className="form-control" placeholder="Search by name, mobile, USG centre..." value={usgSearch} onChange={e => setUsgSearch(e.target.value)} />
              </div>
              <small className="text-muted">{filtered.length} record(s)</small>
            </div>
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>USG Centre</th>
                  <th>Scheduled Date</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Days Pending</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? filtered.map((a, i) => (
                  <tr key={i}>
                    <td>{a.pregnant_woman_name}</td>
                    <td>{a.mobile_number}</td>
                    <td>{a.usg_centre_name}</td>
                    <td>{formatDateTime(a.scheduled_date)}</td>
                    <td><span className={`badge bg-${getStatusColor(a.status)}`}>{getStatusLabel(a.status)}</span></td>
                    <td>
                      <span className={`px-24 py-4 rounded-pill fw-medium text-sm ${
                        a.appointment_type === 'emergency'
                          ? 'bg-danger-focus text-danger-main'
                          : 'bg-neutral-200 text-neutral-600'
                      }`}>
                        {a.appointment_type === 'emergency' ? 'Emergency' : 'Regular'}
                      </span>
                    </td>
                    <td>{a.days_pending}</td>
                  </tr>
                )) : <tr><td colSpan={7} className="text-center text-muted">No matching records</td></tr>}
              </tbody>
            </table>
          </div>
          </>
        ) : (
          <div className="alert alert-info text-center mt-3">
            <Icon icon="mdi:information" className="me-2" />
            No USG appointments found for the selected date range.
          </div>
        )}
        {reportData?.pagination && reportData.pagination.total_count > 0 && (
          <div className="d-flex justify-content-between align-items-center mt-3">
            <span>Showing page {reportData.pagination.page} of {reportData.pagination.total_pages} ({reportData.pagination.total_count} total records)</span>
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-outline-primary" disabled={page === 1} onClick={() => { setPage(page - 1); }}>Previous</button>
              <button className="btn btn-sm btn-outline-primary" disabled={page === reportData.pagination.total_pages} onClick={() => { setPage(page + 1); }}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
    );
  };

  const renderPMSMAReport = () => {
    const filtered = (reportData?.sessions || []).filter(s =>
      !pmsmaSearch || [s.full_name, s.mobile_number, s.centre_name].some(v => v?.toLowerCase().includes(pmsmaSearch.toLowerCase()))
    );
    const statusColor = { completed: 'success', missed: 'danger', scheduled: 'primary', rescheduled: 'warning', cancelled: 'secondary' };
    return (
      <div className="card">
        <div className="card-body">
          {reportData?.summary && (
            <div className="row mb-4">
              <div className="col-md-2 col-sm-4 mb-3">
                <div className="text-center p-3 bg-primary-50 rounded">
                  <h4 className="text-primary">{reportData.summary.total_sessions}</h4>
                  <p className="mb-0 text-sm">Total Sessions</p>
                </div>
              </div>
              <div className="col-md-2 col-sm-4 mb-3">
                <div className="text-center p-3 bg-success-50 rounded">
                  <h4 className="text-success">{reportData.summary.completed}</h4>
                  <p className="mb-0 text-sm">Completed</p>
                </div>
              </div>
              <div className="col-md-2 col-sm-4 mb-3">
                <div className="text-center p-3 bg-danger-50 rounded">
                  <h4 className="text-danger">{reportData.summary.missed}</h4>
                  <p className="mb-0 text-sm">Missed</p>
                </div>
              </div>
              <div className="col-md-2 col-sm-4 mb-3">
                <div className="text-center p-3 bg-warning-50 rounded">
                  <h4 className="text-warning">{reportData.summary.upcoming}</h4>
                  <p className="mb-0 text-sm">Upcoming</p>
                </div>
              </div>
              <div className="col-md-2 col-sm-4 mb-3">
                <div className="text-center p-3 bg-info-50 rounded">
                  <h4 className="text-info">{reportData.summary.completion_rate}%</h4>
                  <p className="mb-0 text-sm">Completion Rate</p>
                </div>
              </div>
              <div className="col-md-2 col-sm-4 mb-3">
                <div className="text-center p-3 bg-neutral-100 rounded">
                  <h4>{reportData.summary.high_risk}</h4>
                  <p className="mb-0 text-sm">High-Risk</p>
                </div>
              </div>
            </div>
          )}
          {reportData?.clinical && (
            <div className="mb-4 p-3 bg-neutral-50 rounded border">
              <h6 className="fw-semibold mb-2">Clinical findings (completed sessions)</h6>
              <div className="row text-sm">
                <div className="col-md-3">Avg Hb: <strong>{reportData.clinical.avg_hb ?? '—'}</strong></div>
                <div className="col-md-3">Anaemic: <strong>{reportData.clinical.anaemic}</strong> / {reportData.clinical.completed_with_hb}</div>
                <div className="col-md-3">High BP: <strong>{reportData.clinical.high_bp}</strong> / {reportData.clinical.bp_recorded}</div>
                <div className="col-md-3">Avg blood sugar: <strong>{reportData.clinical.avg_blood_sugar ?? '—'}</strong></div>
              </div>
            </div>
          )}
          {reportData?.sessions && (
            <>
              <div className="d-flex align-items-center gap-2 mb-3">
                <div className="input-group" style={{maxWidth: 320}}>
                  <span className="input-group-text"><Icon icon="mdi:magnify" /></span>
                  <input type="text" className="form-control" placeholder="Search by name, mobile, centre..." value={pmsmaSearch} onChange={e => setPmsmaSearch(e.target.value)} />
                </div>
                <small className="text-muted">{filtered.length} record(s)</small>
              </div>
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Name</th><th>Mobile</th><th>Scheduled</th><th>Status</th><th>Centre</th>
                      <th>BP</th><th>Hb</th><th>High Risk</th><th>Days Overdue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length > 0 ? filtered.map((s, i) => (
                      <tr key={i}>
                        <td>{s.full_name}</td>
                        <td>{s.mobile_number}</td>
                        <td>{formatDateTime(s.scheduled_date)}</td>
                        <td><span className={`badge bg-${statusColor[s.status] || 'secondary'}`}>{s.status}</span></td>
                        <td>{s.centre_name}</td>
                        <td>{s.bp || '-'}</td>
                        <td>{s.hb ?? '-'}</td>
                        <td>{s.is_high_risk ? <span className="badge bg-danger">Yes</span> : 'No'}</td>
                        <td>{s.days_overdue || 0}</td>
                      </tr>
                    )) : <tr><td colSpan={9} className="text-center text-muted">No matching records</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {reportData?.pagination && reportData.pagination.total_count > 0 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <span>Showing page {reportData.pagination.page} of {reportData.pagination.total_pages} ({reportData.pagination.total_count} total records)</span>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-outline-primary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
                <button className="btn btn-sm btn-outline-primary" disabled={page === reportData.pagination.total_pages} onClick={() => setPage(page + 1)}>Next</button>
              </div>
            </div>
          )}
          {reportData?.sessions && reportData.sessions.length === 0 && (
            <div className="alert alert-info text-center mt-3">
              <Icon icon="mdi:information" className="me-2" />
              No PMSMA sessions found for the selected filters.
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMobilisationReport = () => {
    const filtered = (reportData?.cases || []).filter(c =>
      !mobSearch || [c.full_name, c.mobile_number, c.trigger_detail].some(v => v?.toLowerCase().includes(mobSearch.toLowerCase()))
    );
    const statusColor = { pending: 'warning', escalated: 'danger', mobilised: 'success', closed: 'secondary' };
    return (
      <div className="card">
        <div className="card-body">
          {reportData?.summary && (
            <div className="row mb-4">
              <div className="col-md-2 col-sm-4 mb-3">
                <div className="text-center p-3 bg-primary-50 rounded">
                  <h4 className="text-primary">{reportData.summary.total_cases}</h4>
                  <p className="mb-0 text-sm">Total Cases</p>
                </div>
              </div>
              <div className="col-md-2 col-sm-4 mb-3">
                <div className="text-center p-3 bg-warning-50 rounded">
                  <h4 className="text-warning">{reportData.summary.open}</h4>
                  <p className="mb-0 text-sm">Open</p>
                </div>
              </div>
              <div className="col-md-2 col-sm-4 mb-3">
                <div className="text-center p-3 bg-danger-50 rounded">
                  <h4 className="text-danger">{reportData.summary.escalated}</h4>
                  <p className="mb-0 text-sm">Escalated</p>
                </div>
              </div>
              <div className="col-md-2 col-sm-4 mb-3">
                <div className="text-center p-3 bg-success-50 rounded">
                  <h4 className="text-success">{reportData.summary.mobilised}</h4>
                  <p className="mb-0 text-sm">Mobilised</p>
                </div>
              </div>
              <div className="col-md-2 col-sm-4 mb-3">
                <div className="text-center p-3 bg-info-50 rounded">
                  <h4 className="text-info">{reportData.summary.mobilisation_rate}%</h4>
                  <p className="mb-0 text-sm">Mobilisation Rate</p>
                </div>
              </div>
              <div className="col-md-2 col-sm-4 mb-3">
                <div className="text-center p-3 bg-neutral-100 rounded">
                  <h4>{reportData.summary.median_hours_to_mobilise ?? '—'}</h4>
                  <p className="mb-0 text-sm">Median Hours to Mobilise</p>
                </div>
              </div>
            </div>
          )}
          {reportData?.cases && (
            <>
              <div className="d-flex align-items-center gap-2 mb-3">
                <div className="input-group" style={{maxWidth: 320}}>
                  <span className="input-group-text"><Icon icon="mdi:magnify" /></span>
                  <input type="text" className="form-control" placeholder="Search by name, mobile, trigger..." value={mobSearch} onChange={e => setMobSearch(e.target.value)} />
                </div>
                <small className="text-muted">{filtered.length} record(s)</small>
              </div>
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Name</th><th>Mobile</th><th>Trigger</th><th>Detail</th><th>Status</th><th>Level</th><th>Raised</th><th>Age (days)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length > 0 ? filtered.map((c, i) => (
                      <tr key={i}>
                        <td>{c.full_name}</td>
                        <td>{c.mobile_number}</td>
                        <td>{c.trigger_label}</td>
                        <td>{c.trigger_detail}</td>
                        <td><span className={`badge bg-${statusColor[c.status] || 'secondary'}`}>{c.status}</span></td>
                        <td>{c.escalation_level}</td>
                        <td>{formatDateTime(c.created_at)}</td>
                        <td>{c.age_days ?? '-'}</td>
                      </tr>
                    )) : <tr><td colSpan={8} className="text-center text-muted">No matching records</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {reportData?.pagination && reportData.pagination.total_count > 0 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <span>Showing page {reportData.pagination.page} of {reportData.pagination.total_pages} ({reportData.pagination.total_count} total records)</span>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-outline-primary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
                <button className="btn btn-sm btn-outline-primary" disabled={page === reportData.pagination.total_pages} onClick={() => setPage(page + 1)}>Next</button>
              </div>
            </div>
          )}
          {reportData?.cases && reportData.cases.length === 0 && (
            <div className="alert alert-info text-center mt-3">
              <Icon icon="mdi:information" className="me-2" />
              No mobilisation cases found for the selected filters.
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPNCFollowupReport = () => {
    const filtered = (reportData?.visits || []).filter(v =>
      !pncSearch || [v.full_name, v.mobile_number].some(x => x?.toLowerCase().includes(pncSearch.toLowerCase()))
    );
    const statusColor = { completed: 'success', overdue: 'danger', due_today: 'warning', upcoming: 'secondary' };
    return (
      <div className="card">
        <div className="card-body">
          {reportData?.summary && (
            <div className="row mb-4">
              <div className="col-md-2 col-sm-4 mb-3">
                <div className="text-center p-3 bg-primary-50 rounded">
                  <h4 className="text-primary">{reportData.summary.total_visits}</h4>
                  <p className="mb-0 text-sm">Total Visits</p>
                </div>
              </div>
              <div className="col-md-2 col-sm-4 mb-3">
                <div className="text-center p-3 bg-success-50 rounded">
                  <h4 className="text-success">{reportData.summary.completed}</h4>
                  <p className="mb-0 text-sm">Completed</p>
                </div>
              </div>
              <div className="col-md-2 col-sm-4 mb-3">
                <div className="text-center p-3 bg-danger-50 rounded">
                  <h4 className="text-danger">{reportData.summary.overdue}</h4>
                  <p className="mb-0 text-sm">Overdue</p>
                </div>
              </div>
              <div className="col-md-2 col-sm-4 mb-3">
                <div className="text-center p-3 bg-warning-50 rounded">
                  <h4 className="text-warning">{reportData.summary.due_today}</h4>
                  <p className="mb-0 text-sm">Due Today</p>
                </div>
              </div>
              <div className="col-md-2 col-sm-4 mb-3">
                <div className="text-center p-3 bg-info-50 rounded">
                  <h4 className="text-info">{reportData.summary.completion_rate}%</h4>
                  <p className="mb-0 text-sm">Completion Rate</p>
                </div>
              </div>
              <div className="col-md-2 col-sm-4 mb-3">
                <div className="text-center p-3 bg-neutral-100 rounded">
                  <h4>{reportData.summary.on_time_rate}%</h4>
                  <p className="mb-0 text-sm">On-Time Rate</p>
                </div>
              </div>
            </div>
          )}
          {reportData?.visits && (
            <>
              <div className="d-flex align-items-center gap-2 mb-3">
                <div className="input-group" style={{maxWidth: 320}}>
                  <span className="input-group-text"><Icon icon="mdi:magnify" /></span>
                  <input type="text" className="form-control" placeholder="Search by name, mobile..." value={pncSearch} onChange={e => setPncSearch(e.target.value)} />
                </div>
                <small className="text-muted">{filtered.length} record(s)</small>
              </div>
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Name</th><th>Mobile</th><th>Visit</th><th>Due Date</th><th>Status</th><th>Days Overdue</th><th>Delivery Point</th><th>Completed By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length > 0 ? filtered.map((v, i) => (
                      <tr key={i}>
                        <td>{v.full_name}</td>
                        <td>{v.mobile_number}</td>
                        <td>{v.visit_label}</td>
                        <td>{formatDate(v.due_date)}</td>
                        <td><span className={`badge bg-${statusColor[v.status] || 'secondary'}`}>{v.status.replace('_', ' ')}</span></td>
                        <td>{v.days_overdue || 0}</td>
                        <td>{v.delivery_point_name}</td>
                        <td>{v.completed_by_name || '-'}</td>
                      </tr>
                    )) : <tr><td colSpan={8} className="text-center text-muted">No matching records</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {reportData?.pagination && reportData.pagination.total_count > 0 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <span>Showing page {reportData.pagination.page} of {reportData.pagination.total_pages} ({reportData.pagination.total_count} total records)</span>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-outline-primary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
                <button className="btn btn-sm btn-outline-primary" disabled={page === reportData.pagination.total_pages} onClick={() => setPage(page + 1)}>Next</button>
              </div>
            </div>
          )}
          {reportData?.visits && reportData.visits.length === 0 && (
            <div className="alert alert-info text-center mt-3">
              <Icon icon="mdi:information" className="me-2" />
              No PNC follow-up visits found for the selected filters.
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderComparativeReport = () => {
    const filtered = (reportData?.data || []).filter(d =>
      !compSearch || d.name?.toLowerCase().includes(compSearch.toLowerCase())
    );
    return (
    <div className="card mt-3">
      <div className="card-body">
        {reportData?.data && reportData.data.length > 0 ? (
          <>
            <div className="d-flex align-items-center gap-2 mb-3">
              <div className="input-group" style={{maxWidth: 280}}>
                <span className="input-group-text"><Icon icon="mdi:magnify" /></span>
                <input type="text" className="form-control" placeholder="Search by name..." value={compSearch} onChange={e => setCompSearch(e.target.value)} />
              </div>
              <small className="text-muted">{filtered.length} record(s)</small>
            </div>
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Total Women</th>
                  <th>High Risk</th>
                  <th>ANC Visits</th>
                  <th>USG Completed</th>
                  <th>Performance Score</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? filtered.map((d, i) => (
                  <tr key={i}>
                    <td>{d.name}</td>
                    <td>{d.total_pregnant_women}</td>
                    <td>{d.high_risk_cases}</td>
                    <td>{d.anc_visits}</td>
                    <td>{d.usg_completed}</td>
                    <td><span className="badge bg-success">{d.performance_score}</span></td>
                  </tr>
                )) : <tr><td colSpan={6} className="text-center text-muted">No matching records</td></tr>}
              </tbody>
            </table>
          </div>
          </>
        ) : (
          <div className="alert alert-info">No data available for the selected period</div>
        )}
        {reportData?.visualization && <ChartRenderer visualization={reportData.visualization} />}
      </div>
    </div>
    );
  };

  const renderTrendsReport = () => (
    <div className="card">
      <div className="card-body">
        {reportData?.summary && (
          <div className="row mb-4">
            <div className="col-md-6">
              <div className="text-center p-3 bg-primary-50 rounded">
                <h4 className="text-primary">{reportData.summary.total}</h4>
                <p className="mb-0">Total</p>
              </div>
            </div>
            <div className="col-md-6">
              <div className="text-center p-3 bg-info-50 rounded">
                <h4 className="text-info">{reportData.summary.average_per_month}</h4>
                <p className="mb-0">Average per Month</p>
              </div>
            </div>
          </div>
        )}
        {reportData?.visualization && <ChartRenderer visualization={reportData.visualization} />}
      </div>
    </div>
  );

  const renderUserActivityReport = () => (
    <div className="card">
      <div className="card-body">
        {reportData?.user_activity && (
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>User Name</th>
                  <th>Role</th>
                  <th>Registrations</th>
                  <th>ANC Visits</th>
                  <th>Total Actions</th>
                </tr>
              </thead>
              <tbody>
                {reportData.user_activity.map((u, i) => (
                  <tr key={i}>
                    <td>{u.user_name}</td>
                    <td><span className="badge bg-primary">{u.role}</span></td>
                    <td>{u.registrations}</td>
                    <td>{u.anc_visits}</td>
                    <td>{u.total_actions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderSMSDeliveryReport = () => (
    <div className="card">
      <div className="card-body">
        {reportData?.summary && (
          <div className="row mb-4">
            <div className="col-md-3">
              <div className="text-center p-3 bg-primary-50 rounded">
                <h4 className="text-primary">{reportData.summary.total_sms}</h4>
                <p className="mb-0">Total SMS</p>
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-center p-3 bg-success-50 rounded">
                <h4 className="text-success">{reportData.summary.delivered}</h4>
                <p className="mb-0">Delivered</p>
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-center p-3 bg-danger-50 rounded">
                <h4 className="text-danger">{reportData.summary.failed}</h4>
                <p className="mb-0">Failed</p>
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-center p-3 bg-info-50 rounded">
                <h4 className="text-info">{reportData.summary.delivery_rate}%</h4>
                <p className="mb-0">Delivery Rate</p>
              </div>
            </div>
          </div>
        )}
        {reportData?.visualization && <ChartRenderer visualization={reportData.visualization} />}
      </div>
    </div>
  );

  const renderDeliverySummaryReport = () => {
    const rs = reportData && reportData.referral_summary ? reportData.referral_summary : {};
    const os = reportData && reportData.outcome_summary ? reportData.outcome_summary : {};
    const byType = os.by_type || {};
    const OUTCOME_COLORS = {
      safe_delivery: 'bg-success-50 text-success',
      live_birth: 'bg-success-50 text-success',
      still_birth: 'bg-warning-50 text-warning',
      infant_death: 'bg-danger-50 text-danger',
      maternal_death: 'bg-danger-50 text-danger',
    };
    return (
      <div className="card">
        <div className="card-body">
          <h6 className="fw-semibold mb-3">Referral Summary</h6>
          <div className="row mb-4">
            <div className="col-md-2 col-sm-4 mb-3">
              <div className="text-center p-3 bg-primary-50 rounded">
                <h4 className="text-primary">{rs.total_referrals || 0}</h4>
                <p className="mb-0 text-sm">Total Referrals</p>
              </div>
            </div>
            <div className="col-md-2 col-sm-4 mb-3">
              <div className="text-center p-3 bg-warning-50 rounded">
                <h4 className="text-warning">{rs.pending || 0}</h4>
                <p className="mb-0 text-sm">Pending</p>
              </div>
            </div>
            <div className="col-md-2 col-sm-4 mb-3">
              <div className="text-center p-3 bg-info-50 rounded">
                <h4 className="text-info">{rs.accepted || 0}</h4>
                <p className="mb-0 text-sm">Accepted</p>
              </div>
            </div>
            <div className="col-md-2 col-sm-4 mb-3">
              <div className="text-center p-3 bg-neutral-100 rounded">
                <h4 className="text-secondary">{rs.re_referred || 0}</h4>
                <p className="mb-0 text-sm">Re-referred</p>
              </div>
            </div>
            <div className="col-md-2 col-sm-4 mb-3">
              <div className="text-center p-3 bg-success-50 rounded">
                <h4 className="text-success">{rs.completed || 0}</h4>
                <p className="mb-0 text-sm">Completed</p>
              </div>
            </div>
            <div className="col-md-2 col-sm-4 mb-3">
              <div className="text-center p-3 bg-danger-50 rounded">
                <h4 className="text-danger">{os.adverse_outcome_rate || 0}%</h4>
                <p className="mb-0 text-sm">Adverse Rate</p>
              </div>
            </div>
          </div>
          <h6 className="fw-semibold mb-3">Outcome Breakdown</h6>
          {Object.keys(byType).length > 0 ? (
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr><th>Delivery Type</th><th>Count</th></tr>
                </thead>
                <tbody>
                  {Object.entries(byType).map(([type, count]) => (
                    <tr key={type}>
                      <td>
                        <span className={`px-12 py-4 rounded-pill fw-medium text-xs ${OUTCOME_COLORS[type] || 'bg-neutral-100 text-secondary'}`}>
                          {type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                      </td>
                      <td>{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="alert alert-info">No outcome data for the selected period.</div>
          )}
        </div>
      </div>
    );
  };

  const renderDeliveryOutcomesReport = () => {
    const adv = reportData && reportData.adverse_summary ? reportData.adverse_summary : {};
    const breakdown = reportData && reportData.outcome_breakdown ? reportData.outcome_breakdown : [];
    const OUTCOME_COLORS = {
      safe_delivery: 'bg-success-focus text-success-main',
      live_birth: 'bg-success-focus text-success-main',
      still_birth: 'bg-warning-focus text-warning-main',
      infant_death: 'bg-danger-focus text-danger-main',
      maternal_death: 'bg-danger-focus text-danger-main',
    };
    return (
      <div className="card">
        <div className="card-body">
          <h6 className="fw-semibold mb-3">Adverse Outcomes</h6>
          <div className="row mb-4">
            <div className="col-md-3 col-sm-6 mb-3">
              <div className="text-center p-3 bg-warning-50 rounded">
                <h4 className="text-warning">{adv.still_birth || 0}</h4>
                <p className="mb-0 text-sm">Still Birth</p>
              </div>
            </div>
            <div className="col-md-3 col-sm-6 mb-3">
              <div className="text-center p-3 bg-danger-50 rounded">
                <h4 className="text-danger">{adv.infant_death || 0}</h4>
                <p className="mb-0 text-sm">Infant Death</p>
              </div>
            </div>
            <div className="col-md-3 col-sm-6 mb-3">
              <div className="text-center p-3 bg-danger-50 rounded">
                <h4 className="text-danger">{adv.maternal_death || 0}</h4>
                <p className="mb-0 text-sm">Maternal Death</p>
              </div>
            </div>
            <div className="col-md-3 col-sm-6 mb-3">
              <div className="text-center p-3 bg-neutral-100 rounded">
                <h4 className="text-secondary">{adv.adverse_rate || 0}%</h4>
                <p className="mb-0 text-sm">Adverse Rate</p>
              </div>
            </div>
          </div>
          <h6 className="fw-semibold mb-3">Full Breakdown ({(reportData && reportData.total_outcomes) || 0} total outcomes)</h6>
          {breakdown.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr><th>Delivery Type</th><th>Count</th><th>Percentage</th></tr>
                </thead>
                <tbody>
                  {breakdown.map((row, i) => (
                    <tr key={i}>
                      <td>
                        <span className={`px-12 py-4 rounded-pill fw-medium text-xs ${OUTCOME_COLORS[row.delivery_type] || 'bg-neutral-100 text-secondary'}`}>
                          {row.delivery_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                      </td>
                      <td>{row.count}</td>
                      <td>{row.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="alert alert-info">No outcome data for the selected period.</div>
          )}
        </div>
      </div>
    );
  };

  const renderDeliveryPerformanceReport = () => {
    const dps = reportData && reportData.dp_performance ? reportData.dp_performance : [];
    const totalPages = Math.ceil(dps.length / deliveryPageSize);
    const paginated = dps.slice((deliveryPage - 1) * deliveryPageSize, deliveryPage * deliveryPageSize);
    return (
      <div className="card">
        <div className="card-body">
          {dps.length > 0 ? (
            <>
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Delivery Point</th>
                    <th>Total Received</th>
                    <th>Accepted</th>
                    <th>Re-referred</th>
                    <th>Completed</th>
                    <th>Acceptance Rate</th>
                    <th>Re-referral Rate</th>
                    <th>Avg Accept Time (hrs)</th>
                    <th>Safe / Live</th>
                    <th>Adverse</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((dp, i) => {
                    const out = dp.outcomes || {};
                    const safeLive = (out.safe_delivery || 0) + (out.live_birth || 0);
                    const adverse = (out.still_birth || 0) + (out.infant_death || 0) + (out.maternal_death || 0);
                    return (
                      <tr key={i}>
                        <td className="fw-medium">{dp.dp_name}</td>
                        <td>{dp.total_referrals_received}</td>
                        <td>{dp.accepted}</td>
                        <td>{dp.re_referred}</td>
                        <td>{dp.completed}</td>
                        <td>
                          <span className={'badge ' + (dp.acceptance_rate >= 70 ? 'bg-success' : dp.acceptance_rate >= 40 ? 'bg-warning' : 'bg-danger')}>
                            {dp.acceptance_rate}%
                          </span>
                        </td>
                        <td>
                          <span className={'badge ' + (dp.re_referral_rate <= 20 ? 'bg-success' : dp.re_referral_rate <= 40 ? 'bg-warning' : 'bg-danger')}>
                            {dp.re_referral_rate}%
                          </span>
                        </td>
                        <td>{dp.avg_acceptance_time_hours}</td>
                        <td><span className="badge bg-success">{safeLive}</span></td>
                        <td><span className={'badge ' + (adverse > 0 ? 'bg-danger' : 'bg-success')}>{adverse}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {dps.length > deliveryPageSize && (
              <div className="d-flex justify-content-between align-items-center mt-3">
                <span>Showing page {deliveryPage} of {totalPages} ({dps.length} total records)</span>
                <div className="d-flex gap-2">
                  <button className="btn btn-sm btn-outline-primary" disabled={deliveryPage === 1} onClick={() => setDeliveryPage(deliveryPage - 1)}>Previous</button>
                  <button className="btn btn-sm btn-outline-primary" disabled={deliveryPage === totalPages} onClick={() => setDeliveryPage(deliveryPage + 1)}>Next</button>
                </div>
              </div>
            )}
            </>
          ) : (
            <div className="alert alert-info">No delivery point performance data for the selected period.</div>
          )}
        </div>
      </div>
    );
  };

  useEffect(() => {
    setReportData(null);
    setPage(1);
    setDeliveryPage(1);
    setHrSearch('');
    setAncSearch('');
    setAncStatusFilter('');
    setUsgSearch('');
    setCompSearch('');
    setPmsmaSearch('');
    setMobSearch('');
    setPncSearch('');
  }, [activeTab]);

  useEffect(() => {
    if (page > 1) loadReport();
  }, [page]);

  return (
    <div className="card h-100 p-0 radius-12">
      <div className="card-body p-24">
        <div className="d-flex justify-content-between align-items-center mb-20">
          <ul className="nav border-gradient-tab nav-pills flex-nowrap overflow-auto" id="pills-tab" role="tablist" style={{whiteSpace: 'nowrap'}}>
            {reportTabs.map(tab => (
              <li key={tab.id} className="nav-item" role="presentation">
                <button
                  className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                  type="button"
                >
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
              
              <div className="row g-3">
                {(activeTab !== 'trends') && (
                  <>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">
                        Start Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className={`form-control ${(!startDate || (dateError && startDate)) ? 'is-invalid' : ''}`}
                        value={startDate}
                        max={getTodayDate()}
                        onChange={handleStartDateChange}
                        required
                      />
                      {!startDate && (
                        <div className="invalid-feedback">
                          Start date is required
                        </div>
                      )}
                      {startDate && dateError && startDate > getTodayDate() && (
                        <div className="invalid-feedback">
                          Start date cannot be in the future
                        </div>
                      )}
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">
                        End Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className={`form-control ${(!endDate || (dateError && endDate)) ? 'is-invalid' : ''}`}
                        value={endDate}
                        max={getTodayDate()}
                        min={startDate || undefined}
                        onChange={handleEndDateChange}
                        required
                      />
                      {!endDate && (
                        <div className="invalid-feedback">
                          End date is required
                        </div>
                      )}
                      {endDate && dateError && (
                        <div className="invalid-feedback">
                          {dateError}
                        </div>
                      )}
                    </div>
                  </>
                )}
                
                {activeTab === 'usg-status' && (
                  <>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Status Filter</label>
                      <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="">All Statuses</option>
                        {STATUS_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {filterOptions?.usg_centres?.length > 0 && (
                      <div className="col-md-3">
                        <label className="form-label fw-semibold">USG Centre</label>
                        <select className="form-select" value={usgCentreId} onChange={e => setUsgCentreId(e.target.value)}>
                          <option value="">All centres</option>
                          {filterOptions.usg_centres.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="col-md-3 d-flex align-items-end">
                      <div className="form-check">
                        <input className="form-check-input" type="checkbox" id="usgOverdueOnly" checked={usgOverdueOnly} onChange={e => setUsgOverdueOnly(e.target.checked)} />
                        <label className="form-check-label" htmlFor="usgOverdueOnly">Overdue only</label>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'high-risk' && (
                  <>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Follow-up status</label>
                      <select className="form-select" value={hrFollowup} onChange={e => setHrFollowup(e.target.value)}>
                        <option value="">All</option>
                        <option value="recent">Recent follow-up</option>
                        <option value="attention">Needs attention</option>
                        <option value="never">Never seen for ANC</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Completed USG</label>
                      <select className="form-select" value={hrUsgDone} onChange={e => setHrUsgDone(e.target.value)}>
                        <option value="">Any</option>
                        <option value="yes">Has a completed scan</option>
                        <option value="no">No completed scan</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Sort by</label>
                      <div className="d-flex gap-1">
                        <select className="form-select" value={hrSortBy} onChange={e => setHrSortBy(e.target.value)}>
                          <option value="registered">Registered date</option>
                          <option value="name">Name</option>
                          <option value="age">Age</option>
                          <option value="edd">EDD</option>
                          <option value="last_anc">Last ANC visit</option>
                          <option value="anc_visits">ANC visits</option>
                          <option value="usg_scans">USG scans</option>
                        </select>
                        <select className="form-select" style={{ maxWidth: 90 }} value={hrSortDir} onChange={e => setHrSortDir(e.target.value)}>
                          <option value="desc">Desc</option>
                          <option value="asc">Asc</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'anc-compliance' && (
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">Compliance</label>
                    <select className="form-select" value={ancCompliance} onChange={e => setAncCompliance(e.target.value)}>
                      <option value="">All</option>
                      <option value="compliant">Compliant only</option>
                      <option value="non_compliant">Non-compliant only</option>
                    </select>
                  </div>
                )}
                
                {activeTab === 'pmsma' && (
                  <>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Status</label>
                      <select className="form-select" value={pmsmaStatus} onChange={e => setPmsmaStatus(e.target.value)}>
                        <option value="">All statuses</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="rescheduled">Rescheduled</option>
                        <option value="completed">Completed</option>
                        <option value="missed">Missed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    {filterOptions?.pmsma_centres?.length > 0 && (
                      <div className="col-md-3">
                        <label className="form-label fw-semibold">PMSMA Centre</label>
                        <select className="form-select" value={pmsmaCentreId} onChange={e => setPmsmaCentreId(e.target.value)}>
                          <option value="">All centres</option>
                          {filterOptions.pmsma_centres.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="col-md-3 d-flex align-items-end gap-3">
                      <div className="form-check">
                        <input className="form-check-input" type="checkbox" id="pmsmaHighRiskOnly" checked={pmsmaHighRiskOnly} onChange={e => setPmsmaHighRiskOnly(e.target.checked)} />
                        <label className="form-check-label" htmlFor="pmsmaHighRiskOnly">High-risk only</label>
                      </div>
                      <div className="form-check">
                        <input className="form-check-input" type="checkbox" id="pmsmaLowHb" checked={pmsmaLowHb} onChange={e => setPmsmaLowHb(e.target.checked)} />
                        <label className="form-check-label" htmlFor="pmsmaLowHb">Low Hb (&lt; 11)</label>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Search</label>
                      <input type="text" className="form-control" placeholder="Name, mobile, RCH ID..." value={pmsmaSearch} onChange={e => setPmsmaSearch(e.target.value)} />
                    </div>
                  </>
                )}

                {activeTab === 'mobilisation' && (
                  <>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Status</label>
                      <select className="form-select" value={mobStatus} onChange={e => setMobStatus(e.target.value)}>
                        <option value="">All</option>
                        <option value="open">Open (pending + escalated)</option>
                        <option value="pending">Pending</option>
                        <option value="escalated">Escalated</option>
                        <option value="mobilised">Mobilised</option>
                        <option value="closed">Auto-closed</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Trigger</label>
                      <select className="form-select" value={mobTriggerType} onChange={e => setMobTriggerType(e.target.value)}>
                        <option value="">All triggers</option>
                        <option value="missed_anc">Missed ANC</option>
                        <option value="missed_pmsma">Missed PMSMA</option>
                        <option value="missed_usg">Missed USG</option>
                        <option value="near_edd">Near EDD</option>
                        <option value="hrp_unreferred">High-risk, not referred</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Escalation level</label>
                      <select className="form-select" value={mobEscalationLevel} onChange={e => setMobEscalationLevel(e.target.value)}>
                        <option value="">Any</option>
                        <option value="anm">ANM</option>
                        <option value="block">Block</option>
                        <option value="district">District</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Search</label>
                      <input type="text" className="form-control" placeholder="Name, mobile, RCH ID..." value={mobSearch} onChange={e => setMobSearch(e.target.value)} />
                    </div>
                  </>
                )}

                {activeTab === 'pnc-followup' && (
                  <>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Status</label>
                      <select className="form-select" value={pncStatus} onChange={e => setPncStatus(e.target.value)}>
                        <option value="">All</option>
                        <option value="upcoming">Upcoming</option>
                        <option value="due_today">Due today</option>
                        <option value="overdue">Overdue</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Visit</label>
                      <select className="form-select" value={pncVisitLabel} onChange={e => setPncVisitLabel(e.target.value)}>
                        <option value="">All visits</option>
                        <option value="48hr">48 hours</option>
                        <option value="day7">Day 7</option>
                        <option value="day42">Day 42</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Search</label>
                      <input type="text" className="form-control" placeholder="Name, mobile, RCH ID..." value={pncSearch} onChange={e => setPncSearch(e.target.value)} />
                    </div>
                  </>
                )}

                {activeTab === 'comparative' && (
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">Comparison Type</label>
                    <select className="form-select" value={comparisonType} disabled>
                      {userRole === 'district' && (
                        <option value="block">Block</option>
                      )}
                      {userRole === 'block' && (
                        <option value="sub_centre">Sub-Centre</option>
                      )}
                    </select>
                    <div className="form-text">Auto-selected based on your role</div>
                  </div>
                )}
                
                {activeTab === 'trends' && (
                  <>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Months</label>
                      <input type="number" className="form-control" value={months} onChange={(e) => setMonths(e.target.value)} min="1" max="12" />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Metric</label>
                      <select className="form-select" value={metric} onChange={(e) => setMetric(e.target.value)}>
                        <option value="registrations">Registrations</option>
                        <option value="anc_visits">ANC Visits</option>
                        <option value="usg_appointments">USG Appointments</option>
                      </select>
                    </div>
                  </>
                )}

                {activeTab === 'delivery' && (
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">Report Type</label>
                    <select
                      className="form-select"
                      value={deliverySubReport}
                      onChange={(e) => { setDeliverySubReport(e.target.value); setReportData(null); setDeliveryPage(1); }}
                    >
                      <option value="delivery-summary">Delivery Summary</option>
                      <option value="delivery-outcomes" disabled={userRole === 'sub_centre'}>Delivery Outcomes</option>
                      {(userRole === 'district' || userRole === 'block') && (
                        <option value="delivery-performance">Delivery Point Performance</option>
                      )}
                    </select>
                  </div>
                )}
              </div>
              
              {['high-risk', 'anc-compliance', 'usg-status', 'pmsma', 'mobilisation', 'pnc-followup'].includes(activeTab) && (
                <div className="mt-3">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2 mb-2"
                    onClick={() => setShowAdvFilters(s => !s)}
                  >
                    <Icon icon="mdi:filter-variant" />
                    Advanced filters
                    {advActiveCount > 0 && <span className="badge bg-primary">{advActiveCount}</span>}
                    <Icon icon={showAdvFilters ? 'mdi:chevron-up' : 'mdi:chevron-down'} />
                  </button>
                  {showAdvFilters && (
                    <div className="row g-3 p-3 bg-neutral-50 rounded border">
                      {filterOptions?.blocks?.length > 0 && (
                        <div className="col-md-3">
                          <label className="form-label small fw-semibold">Block</label>
                          <select className="form-select form-select-sm" value={advFilters.blockId} onChange={e => advSet('blockId', e.target.value)}>
                            <option value="">All blocks</option>
                            {filterOptions.blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </select>
                        </div>
                      )}
                      {filterOptions?.sub_centres?.length > 0 && (
                        <div className="col-md-3">
                          <label className="form-label small fw-semibold">Sub-centre</label>
                          <select className="form-select form-select-sm" value={advFilters.subCentreId} onChange={e => advSet('subCentreId', e.target.value)}>
                            <option value="">All sub-centres</option>
                            {filterOptions.sub_centres.filter(s => !advFilters.blockId || String(s.block_id) === String(advFilters.blockId)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                      )}
                      {filterOptions?.wards?.length > 0 && (
                        <div className="col-md-3">
                          <label className="form-label small fw-semibold">Ward</label>
                          <select className="form-select form-select-sm" value={advFilters.wardId} onChange={e => advSet('wardId', e.target.value)}>
                            <option value="">All wards</option>
                            {filterOptions.wards.filter(w => !advFilters.blockId || String(w.block_id) === String(advFilters.blockId)).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                          </select>
                        </div>
                      )}
                      {activeTab !== 'high-risk' && (
                        <div className="col-md-3">
                          <label className="form-label small fw-semibold">Risk</label>
                          <select className="form-select form-select-sm" value={advFilters.risk} onChange={e => advSet('risk', e.target.value)}>
                            <option value="all">All</option>
                            <option value="high">High-risk only</option>
                            <option value="normal">Normal-risk only</option>
                          </select>
                        </div>
                      )}
                      <div className="col-md-3">
                        <label className="form-label small fw-semibold">Registration source</label>
                        <select className="form-select form-select-sm" value={advFilters.registrationSource} onChange={e => advSet('registrationSource', e.target.value)}>
                          <option value="">Any</option>
                          <option value="self">Self-registered</option>
                          <option value="staff">Registered by staff</option>
                        </select>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label small fw-semibold">Approval</label>
                        <select className="form-select form-select-sm" value={advFilters.approval} onChange={e => advSet('approval', e.target.value)}>
                          <option value="">Any</option>
                          <option value="approved">Approved</option>
                          <option value="pending">Pending approval</option>
                        </select>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label small fw-semibold">Anaemia (latest Hb)</label>
                        <select className="form-select form-select-sm" value={advFilters.anaemic} onChange={e => advSet('anaemic', e.target.value)}>
                          <option value="">Any</option>
                          <option value="true">Anaemic (Hb &lt; 11)</option>
                          <option value="false">Normal Hb</option>
                        </select>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label small fw-semibold">ANC contact</label>
                        <select className="form-select form-select-sm" value={advFilters.hasAnc} onChange={e => advSet('hasAnc', e.target.value)}>
                          <option value="">Any</option>
                          <option value="true">Has had an ANC visit</option>
                          <option value="false">No ANC visit yet</option>
                        </select>
                      </div>
                      {filterOptions?.age_bands?.length > 0 && (
                        <div className="col-md-6">
                          <label className="form-label small fw-semibold d-block">Age band</label>
                          <div className="d-flex flex-wrap gap-1">
                            {filterOptions.age_bands.map(a => (
                              <button key={a.key} type="button"
                                className={`btn btn-sm ${advFilters.ageBand.includes(a.key) ? 'btn-primary' : 'btn-outline-secondary'}`}
                                style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                                onClick={() => advToggle('ageBand', a.key)}>
                                {a.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold d-block">Trimester</label>
                        <div className="d-flex flex-wrap gap-1">
                          {[['1', '1st'], ['2', '2nd'], ['3', '3rd'], ['unknown', 'Not recorded']].map(([v, l]) => (
                            <button key={v} type="button"
                              className={`btn btn-sm ${advFilters.trimester.includes(v) ? 'btn-primary' : 'btn-outline-secondary'}`}
                              style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                              onClick={() => advToggle('trimester', v)}>
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>
                      {filterOptions?.blood_groups?.length > 0 && (
                        <div className="col-md-6">
                          <label className="form-label small fw-semibold d-block">Blood group</label>
                          <div className="d-flex flex-wrap gap-1">
                            {filterOptions.blood_groups.map(g => (
                              <button key={g} type="button"
                                className={`btn btn-sm ${advFilters.bloodGroup.includes(g) ? 'btn-primary' : 'btn-outline-secondary'}`}
                                style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                                onClick={() => advToggle('bloodGroup', g)}>
                                {g}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {filterOptions?.risk_factors?.length > 0 && (
                        <div className="col-md-12">
                          <label className="form-label small fw-semibold d-block">Risk factors</label>
                          <div className="d-flex flex-wrap gap-1">
                            {filterOptions.risk_factors.slice(0, 15).map(r => (
                              <button key={r.name} type="button"
                                className={`btn btn-sm ${advFilters.riskFactor.includes(r.name) ? 'btn-primary' : 'btn-outline-secondary'}`}
                                style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                                onClick={() => advToggle('riskFactor', r.name)}>
                                {r.name} ({r.count})
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="row mt-3">
                <div className="col-12">
                  <button 
                    className="btn btn-primary btn-sm px-20 py-11 radius-8 d-flex align-items-center gap-2" 
                    onClick={loadReport} 
                    disabled={loading || (activeTab !== 'trends' && (!startDate || !endDate || dateError))}
                    title={(activeTab !== 'trends' && (!startDate || !endDate)) ? 'Please select both Start Date and End Date' : ''}
                  >
                    {loading ? <><span className="spinner-border spinner-border-sm" />Loading...</> : <><Icon icon="solar:refresh-outline" className="text-xl" />Generate Report</>}
                  </button>
                  {['high-risk', 'anc-compliance', 'usg-status', 'pmsma', 'mobilisation', 'pnc-followup'].includes(activeTab) && reportData && (
                    <div className="btn-group ms-2">
                      <button className="btn btn-outline-success btn-sm" onClick={() => handleAdvancedExport('excel')}>
                        <Icon icon="mdi:file-excel" className="me-1" />Export Excel
                      </button>
                      <button className="btn btn-outline-secondary btn-sm" onClick={() => handleAdvancedExport('csv')}>
                        <Icon icon="mdi:file-delimited" className="me-1" />CSV
                      </button>
                    </div>
                  )}
                </div>
              </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
          <p className="mt-2">Loading report data...</p>
        </div>
      ) : reportData ? (
        <>
          {activeTab === 'high-risk' && renderHighRiskReport()}
          {activeTab === 'anc-compliance' && renderANCComplianceReport()}
          {activeTab === 'usg-status' && renderUSGStatusReport()}
          {activeTab === 'pmsma' && renderPMSMAReport()}
          {activeTab === 'mobilisation' && renderMobilisationReport()}
          {activeTab === 'pnc-followup' && renderPNCFollowupReport()}
          {activeTab === 'comparative' && renderComparativeReport()}
          {activeTab === 'trends' && renderTrendsReport()}
          {activeTab === 'delivery' && deliverySubReport === 'delivery-summary' && renderDeliverySummaryReport()}
          {activeTab === 'delivery' && deliverySubReport === 'delivery-outcomes' && renderDeliveryOutcomesReport()}
          {activeTab === 'delivery' && deliverySubReport === 'delivery-performance' && renderDeliveryPerformanceReport()}
          {/* TODO: Enable in next version */}
          {/* {activeTab === 'user-activity' && renderUserActivityReport()} */}
          {/* {activeTab === 'sms-delivery' && renderSMSDeliveryReport()} */}
        </>
      ) : (
        <div className="text-center py-5">
          <Icon icon="solar:chart-outline" className="text-muted" style={{fontSize: '4rem'}} />
          <p className="text-muted mt-2">Click "Generate Report" to view data</p>
        </div>
      )}
      </div>
    </div>
  );
};

export default ReportsLayerNew;