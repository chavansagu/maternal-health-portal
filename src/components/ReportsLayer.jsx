import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';
import { getUserRole } from '../services/auth';
import { reportsAPI, adminAPI, authAPI } from '../services/api';
import { getRoleLabels } from '../utils/roleBasedLabels';
import { getTodayISO } from '../utils/dateFormatter';

const ReportsLayer = () => {
  const [userRole, setUserRole] = useState(getUserRole());
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateError, setDateError] = useState('');
  const [blockId, setBlockId] = useState('');
  const [wardId, setWardId] = useState('');
  const [exportFormat, setExportFormat] = useState('excel');
  const [blocks, setBlocks] = useState([]);
  const [wards, setWards] = useState([]);
  
  // Get role-based labels
  const roleLabels = getRoleLabels(userRole);

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

  useEffect(() => {
    if (userRole === 'district') {
      loadBlocks();
    } else if (userRole === 'block') {
      loadWards();
    }
  }, [userRole]);

  const loadBlocks = async () => {
    try {
      const response = await adminAPI.getBlocks(0, 100, null, true);
      // console.log('Blocks API response:', response); // Debug log
      setBlocks(response.items || response.blocks || response.data || response || []);
    } catch (error) {
      console.error('Error loading blocks:', error);
    }
  };

  const loadWards = async () => {
    try {
      const userData = await authAPI.getCurrentUser();
      console.log('Current User Data:', userData);
      
      const blockIdFilter = userData?.block_id ? Number(userData.block_id) : null;
      console.log('Block ID Filter:', blockIdFilter);
      
      const response = await adminAPI.getWards(0, 100, blockIdFilter, true);
      console.log('Wards API response:', response);
      
      setWards(response.items || response.wards || response.data || response || []);
    } catch (error) {
      console.error('Error loading wards:', error);
    }
  };

  const loadReport = async () => {
    // Validate dates before loading report
    if (!validateDates(startDate, endDate)) {
      alert(dateError);
      return;
    }
    
    setLoading(true);
    try {
      let data;
      switch (userRole) {
        case 'district':
          data = await reportsAPI.getDistrictPerformance(startDate, endDate, blockId);
          break;
        case 'block':
          data = await reportsAPI.getBlockWardWise(startDate, endDate, wardId);
          break;
        case 'sub_centre':
          data = await reportsAPI.getSubCentreActivity(startDate, endDate);
          break;
        case 'usg_centre':
          data = await reportsAPI.getUSGCentreAppointments(startDate, endDate);
          break;
        default:
          // pmsma, dp and other roles don't have a legacy report — use "New Reports" instead
          data = null;
      }
      setReportData(data);
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!exportFormat || (exportFormat !== 'excel' && exportFormat !== 'csv')) {
      alert('Format must be "excel" or "csv"');
      return;
    }
    
    try {
      let response;
      if (userRole === 'district') {
        response = await reportsAPI.exportDistrictReport(exportFormat, startDate, endDate, blockId);
      } else if (userRole === 'block') {
        response = await reportsAPI.exportBlockReport(exportFormat, startDate, endDate, wardId);
      }
      
      if (response) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Generate filename based on dates
        let filename;
        if (startDate && endDate) {
          filename = `${startDate}_to_${endDate}_report.${exportFormat === 'excel' ? 'xlsx' : 'csv'}`;
        } else if (startDate) {
          filename = `${startDate}_report.${exportFormat === 'excel' ? 'xlsx' : 'csv'}`;
        } else {
          const today = new Date().toISOString().split('T')[0];
          filename = `${today}_report.${exportFormat === 'excel' ? 'xlsx' : 'csv'}`;
        }
        
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Error exporting report. Please try again.');
    }
  };

  const renderDistrictReport = () => (
    <div className="row">
      <div className="col-12">
        <div className="card">
          <div className="card-header">
            <h5>District Performance Report</h5>
          </div>
          <div className="card-body">
            {reportData?.district_summary && (
              <div className="row mb-4">
                <div className="col-md-3">
                  <div className="text-center p-3 bg-primary-50 rounded">
                    <h4 className="text-primary">{reportData.district_summary.total_pregnant_women}</h4>
                    <p className="mb-0">Total Women</p>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-center p-3 bg-danger-50 rounded">
                    <h4 className="text-danger">{reportData.district_summary.high_risk_cases}</h4>
                    <p className="mb-0">High Risk Cases</p>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-center p-3 bg-success-50 rounded">
                    <h4 className="text-success">{reportData.district_summary.self_registered}</h4>
                    <p className="mb-0">Self Registered</p>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-center p-3 bg-info-50 rounded">
                    <h4 className="text-info">{reportData.usg_statistics?.total_appointments || 0}</h4>
                    <p className="mb-0">USG Appointments</p>
                  </div>
                </div>
              </div>
            )}
            
            {reportData?.block_wise_data && reportData.block_wise_data.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Block Name</th>
                      <th>Total Women</th>
                      <th>High Risk</th>
                      <th>ANC Visits</th>
                      <th>USG Referrals</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.block_wise_data.map((block, index) => (
                      <tr key={index}>
                        <td>{block.block_name}</td>
                        <td>{block.total_women}</td>
                        <td>{block.high_risk}</td>
                        <td>{block.anc_visits || 0}</td>
                        <td>{block.usg_referrals || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="alert alert-info text-center">
                <Icon icon="mdi:information" className="me-2" />
                No data available for the selected block and date range.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderBlockReport = () => (
    <div className="row">
      <div className="col-12">
        <div className="card">
          <div className="card-header">
            <h5>{roleLabels.reportTitle}</h5>
          </div>
          <div className="card-body">
            {reportData?.block_summary && (
              <div className="row mb-4">
                <div className="col-md-4">
                  <div className="text-center p-3 bg-primary-50 rounded">
                    <h4 className="text-primary">{reportData.block_summary.total_wards}</h4>
                    <p className="mb-0">{roleLabels.summaryLabel}</p>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="text-center p-3 bg-success-50 rounded">
                    <h4 className="text-success">{reportData.block_summary.total_pregnant_women}</h4>
                    <p className="mb-0">Pregnant Women</p>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="text-center p-3 bg-info-50 rounded">
                    <h4 className="text-info">{reportData.block_summary.total_anc_visits}</h4>
                    <p className="mb-0">ANC Visits</p>
                  </div>
                </div>
              </div>
            )}
            
            {reportData?.ward_wise_data && reportData.ward_wise_data.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>{roleLabels.tableHeader}</th>
                      <th>Registrations</th>
                      <th>ANC Visits</th>
                      <th>USG Referrals</th>
                      <th>Emergency Visits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.ward_wise_data.map((ward, index) => (
                      <tr key={index}>
                        <td>{ward.ward_name}</td>
                        <td>{ward.approved_registrations ?? 0}</td>
                        <td>{ward.total_anc_visits ?? 0}</td>
                        <td>{ward.usg_referrals ?? 0}</td>
                        <td>{ward.emergency_visits ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="alert alert-info text-center">
                <Icon icon="mdi:information" className="me-2" />
                No data available for the selected {roleLabels.administrativeUnit.toLowerCase()} and date range.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSubCentreReport = () => (
    <div className="row">
      <div className="col-12">
        <div className="card">
          <div className="card-header">
            <h5>Sub-Centre Activity Report</h5>
          </div>
          <div className="card-body">
            {reportData && (
              <div className="row">
                <div className="col-md-3">
                  <div className="text-center p-3 bg-primary-50 rounded">
                    <h4 className="text-primary">{reportData.pregnant_women_under_care}</h4>
                    <p className="mb-0">Women Under Care</p>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-center p-3 bg-success-50 rounded">
                    <h4 className="text-success">{reportData.anc_visits_conducted}</h4>
                    <p className="mb-0">ANC Visits</p>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-center p-3 bg-info-50 rounded">
                    <h4 className="text-info">{reportData.usg_referrals_made}</h4>
                    <p className="mb-0">USG Referrals</p>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-center p-3 bg-warning-50 rounded">
                    <h4 className="text-warning">{reportData.average_visits_per_day}</h4>
                    <p className="mb-0">Avg Visits/Day</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderUSGCentreReport = () => (
    <div className="row">
      <div className="col-12">
        <div className="card">
          <div className="card-header">
            <h5>USG Centre Appointments Report</h5>
          </div>
          <div className="card-body">
            {reportData && (
              <div className="row">
                <div className="col-md-3">
                  <div className="text-center p-3 bg-primary-50 rounded">
                    <h4 className="text-primary">{reportData.total_appointments}</h4>
                    <p className="mb-0">Total Appointments</p>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-center p-3 bg-success-50 rounded">
                    <h4 className="text-success">{reportData.completed_appointments}</h4>
                    <p className="mb-0">Completed</p>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-center p-3 bg-danger-50 rounded">
                    <h4 className="text-danger">{reportData.emergency_appointments}</h4>
                    <p className="mb-0">Emergency</p>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-center p-3 bg-info-50 rounded">
                    <h4 className="text-info">{reportData.completion_rate}%</h4>
                    <p className="mb-0">Completion Rate</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const legacySupportedRoles = ['district', 'block', 'sub_centre', 'usg_centre'];

  if (!legacySupportedRoles.includes(userRole)) {
    return (
      <div className="container-fluid">
        <div className="alert alert-info text-center py-5">
          <Icon icon="mdi:information" className="text-muted mb-2" style={{ fontSize: '3rem' }} />
          <p className="mb-0">Legacy Reports aren't available for your role yet. Please switch to the <strong>"New Reports"</strong> tab above — it has Delivery and ECG reports scoped to your PMSMA cases.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="row g-3">
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
                {userRole === 'district' && (
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">Block</label>
                    <select
                      className="form-select"
                      value={blockId}
                      onChange={(e) => setBlockId(e.target.value)}
                    >
                      <option value="">All Blocks</option>
                      {blocks.map(block => (
                        <option key={block.id} value={block.id}>{block.block_name || block.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {userRole === 'block' && (
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">{roleLabels.filterLabel}</label>
                    <select
                      className="form-select"
                      value={wardId}
                      onChange={(e) => setWardId(e.target.value)}
                    >
                      <option value="">All {roleLabels.administrativeUnitPlural}</option>
                      {wards.map(ward => (
                        <option key={ward.id} value={ward.id}>{ward.ward_name || ward.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {(userRole === 'district' || userRole === 'block') && (
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">Export Format</label>
                    <select
                      className="form-select"
                      value={exportFormat}
                      onChange={(e) => setExportFormat(e.target.value)}
                    >
                      <option value="excel">Excel (.xlsx)</option>
                      <option value="csv">CSV (.csv)</option>
                    </select>
                    <div className="form-text">Format must be 'excel' or 'csv'</div>
                  </div>
                )}
              </div>
              <div className="row mt-3">
                <div className="col-12">
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-primary btn-sm px-20 py-11 radius-8 d-flex align-items-center gap-2"
                      onClick={loadReport}
                      disabled={loading || !startDate || !endDate || dateError}
                      title={!startDate || !endDate ? 'Please select both Start Date and End Date' : ''}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Icon icon="solar:refresh-outline" className="text-xl" />
                          Generate Report
                        </>
                      )}
                    </button>
                    {(userRole === 'district' || userRole === 'block') && reportData && (
                      <button 
                        className="btn btn-success btn-sm px-20 py-11 radius-8 d-flex align-items-center gap-2"
                        onClick={handleExport}
                        disabled={loading}
                      >
                        <Icon icon="solar:download-outline" className="text-xl" />
                        Export {exportFormat.toUpperCase()}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
          <p className="mt-2">Loading report data...</p>
        </div>
      ) : reportData ? (
        <>
          {userRole === 'district' && renderDistrictReport()}
          {userRole === 'block' && renderBlockReport()}
          {userRole === 'sub_centre' && renderSubCentreReport()}
          {userRole === 'usg_centre' && renderUSGCentreReport()}
        </>
      ) : (
        <div className="text-center py-5">
          <Icon icon="solar:chart-outline" className="text-muted" style={{fontSize: '4rem'}} />
          <p className="text-muted mt-2">Click "Generate Report" to view data</p>
        </div>
      )}
    </div>
  );
};

export default ReportsLayer;