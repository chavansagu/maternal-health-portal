import React, { useState, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { ecgReportAPI, pregnantWomenAPI } from "../services/api";
import { getUserRole } from "../services/auth";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "./Breadcrumb";

const ECGReportManagementLayer = () => {
  const userRole = getUserRole();
  const isDP = userRole === "dp";

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterResult, setFilterResult] = useState("");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [form, setForm] = useState({
    pregnant_woman_id: "",
    ecg_date: "",
    result: "normal",
    notes: "",
  });
  const [reportFile, setReportFile] = useState(null);
  const [pregnantWomen, setPregnantWomen] = useState([]);
  const [pwSearch, setPwSearch] = useState('');
  const [showPwDropdown, setShowPwDropdown] = useState(false);

  // View modal state
  const [viewReport, setViewReport] = useState(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ecgReportAPI.getReports(
        filterResult || null,
        filterStart || null,
        filterEnd || null
      );
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch ECG reports:", err);
    } finally {
      setLoading(false);
    }
  }, [filterResult, filterStart, filterEnd]);

  useEffect(() => {
    fetchReports();
    fetchPregnantWomen();
  }, [fetchReports]);

  const fetchPregnantWomen = async () => {
    try {
      const res = await pregnantWomenAPI.getPregnantWomen(0, 200, null, null, null, null, true, true);
      setPregnantWomen(res.data || []);
    } catch (err) {
      console.error("Failed to fetch pregnant women:", err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError("");
    if (!form.pregnant_woman_id) { setCreateError("Please select a pregnant woman."); return; }
    if (!form.ecg_date) { setCreateError("ECG date is required."); return; }
    setCreating(true);
    try {
      const fd = new FormData();
      fd.append("pregnant_woman_id", form.pregnant_woman_id);
      fd.append("ecg_date", form.ecg_date);
      fd.append("result", form.result);
      if (form.notes) fd.append("notes", form.notes);
      if (reportFile) fd.append("report_file", reportFile);

      await ecgReportAPI.createReport(fd);
      setShowCreate(false);
      resetForm();
      fetchReports();
    } catch (err) {
      setCreateError(err.message || "Failed to create ECG report.");
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setForm({ pregnant_woman_id: "", ecg_date: "", result: "normal", notes: "" });
    setReportFile(null);
    setCreateError("");
    setPwSearch('');
    setShowPwDropdown(false);
  };

  const getVisiblePages = (currentPage, totalPages) => {
    const delta = 2;
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  };

  const filteredReports = reports.filter(r =>
    !searchTerm ||
    r.pregnant_woman_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.mobile_number?.includes(searchTerm) ||
    r.dp_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.recorded_by_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resultBadge = (result) => (
    <span
      className={`badge ${result === "abnormal" ? "bg-danger-focus text-danger-main" : "bg-success-focus text-success-main"}`}
    >
      {result === "abnormal" ? "⚠️ Abnormal" : "✓ Normal"}
    </span>
  );

  return (
    <MasterLayout>
      <Breadcrumb title="ECG Report Management" />

      <div className="card h-100 p-0 radius-12">
        <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between">
          <div className="d-flex align-items-center flex-wrap gap-3">
            <select
              className="form-select form-select-sm w-auto"
              value={filterResult}
              onChange={(e) => { setFilterResult(e.target.value); setCurrentPage(1); }}
            >
              <option value="">All Results</option>
              <option value="normal">Normal</option>
              <option value="abnormal">Abnormal</option>
            </select>
            <input
              type="date"
              className="form-control form-control-sm w-auto"
              value={filterStart}
              onChange={(e) => { setFilterStart(e.target.value); setCurrentPage(1); }}
              placeholder="From"
            />
            <input
              type="date"
              className="form-control form-control-sm w-auto"
              value={filterEnd}
              onChange={(e) => { setFilterEnd(e.target.value); setCurrentPage(1); }}
              placeholder="To"
            />
            <div className="d-flex align-items-center gap-2">
              <span className="text-sm text-secondary-light">Show:</span>
              <select
                className="form-select form-select-sm"
                style={{ width: 'auto' }}
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-secondary-light">entries</span>
            </div>
          </div>
          <form className="navbar-search">
              <input
                type="text"
                className="bg-base h-40-px w-auto"
                placeholder="Search by name, mobile, DP..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
              <Icon icon="ion:search-outline" className="icon" />
            </form>
          {isDP && (
            <button
              className="btn btn-primary btn-sm d-flex align-items-center gap-2"
              onClick={() => { resetForm(); setShowCreate(true); }}
            >
              <Icon icon="ic:baseline-plus" />
              Create ECG Report
            </button>
          )}
        </div>

        <div className="card-body p-24">
          {loading ? (
            <div className="text-center py-40">
              <div className="spinner-border text-primary" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-40 text-secondary-light">
              <Icon icon="mdi:heart-pulse" className="text-5xl mb-2" />
              <p>No ECG reports found.</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-40 text-secondary-light">
              <Icon icon="mdi:heart-pulse" className="text-5xl mb-2" />
              <p>No ECG reports found.</p>
            </div>
          ) : (
            <div className="table-responsive scroll-sm">
              <table className="table bordered-table sm-table mb-0">
                <thead>
                  <tr>
                    <th>S.L</th>
                    <th>Name</th>
                    <th>Mobile</th>
                    <th>ECG Date</th>
                    <th>Result</th>
                    <th>Delivery Point</th>
                    <th>Recorded By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((r, idx) => (
                    <tr key={r.id}>
                      <td>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                      <td className="fw-medium">{r.pregnant_woman_name || "—"}</td>
                      <td>{r.mobile_number || "—"}</td>
                      <td>{formatDate(r.ecg_date)}</td>
                      <td>{resultBadge(r.result)}</td>
                      <td>{r.dp_name || "—"}</td>
                      <td>{r.recorded_by_name || "—"}</td>
                      <td>
                        <div className="d-flex align-items-center gap-10">
                          <button
                            className="bg-primary-50 text-primary-600 bg-hover-primary-100 w-32-px h-32-px d-flex justify-content-center align-items-center rounded-circle"
                            onClick={() => setViewReport(r)}
                            title="View Details"
                          >
                            <Icon icon="iconamoon:eye-light" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Pagination */}
          {filteredReports.length > itemsPerPage && (
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-24">
              <span className="text-sm text-secondary-light">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredReports.length)} to {Math.min(currentPage * itemsPerPage, filteredReports.length)} of {filteredReports.length} entries{searchTerm ? ` (filtered from ${reports.length} total)` : ''}
              </span>
              <ul className="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center">
                <li className="page-item">
                  <button className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} title="First Page">
                    <Icon icon="ep:d-arrow-left" /><Icon icon="ep:d-arrow-left" />
                  </button>
                </li>
                <li className="page-item">
                  <button className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} title="Previous Page">
                    <Icon icon="ep:d-arrow-left" />
                  </button>
                </li>
                {getVisiblePages(currentPage, Math.ceil(filteredReports.length / itemsPerPage)).map((page, index) => {
                  if (page === '...') {
                    return (
                      <li key={`ellipsis-${index}`} className="page-item">
                        <span className="page-link bg-transparent border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md text-secondary-light">...</span>
                      </li>
                    );
                  }
                  return (
                    <li key={page} className="page-item">
                      <button className={`page-link ${currentPage === page ? 'bg-primary-600 text-white' : 'bg-neutral-200 text-secondary-light'} fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px`} onClick={() => setCurrentPage(page)}>
                        {page}
                      </button>
                    </li>
                  );
                })}
                <li className="page-item">
                  <button className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md" onClick={() => setCurrentPage(Math.min(Math.ceil(filteredReports.length / itemsPerPage), currentPage + 1))} disabled={currentPage === Math.ceil(filteredReports.length / itemsPerPage)} title="Next Page">
                    <Icon icon="ep:d-arrow-right" />
                  </button>
                </li>
                <li className="page-item">
                  <button className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md" onClick={() => setCurrentPage(Math.ceil(filteredReports.length / itemsPerPage))} disabled={currentPage === Math.ceil(filteredReports.length / itemsPerPage)} title="Last Page">
                    <Icon icon="ep:d-arrow-right" /><Icon icon="ep:d-arrow-right" />
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* ── Create Modal ─────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <Icon icon="mdi:heart-pulse" className="me-2 text-danger" />
                  Create ECG Report
                </h5>
                <button className="btn-close" onClick={() => setShowCreate(false)} />
              </div>
              <form onSubmit={handleCreate}>
                <div className="modal-body">
                  {createError && (
                    <div className="alert alert-danger py-2">{createError}</div>
                  )}

                  {/* Pregnant Woman Searchable Dropdown */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Patient <span className="text-danger">*</span>
                    </label>
                    <div className="position-relative">
                        <div className="input-group">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Search or select patient..."
                                value={pwSearch}
                                onChange={(e) => { setPwSearch(e.target.value); setShowPwDropdown(true); }}
                                onFocus={() => setShowPwDropdown(true)}
                                autoComplete="off"
                            />
                            <button type="button" className="btn btn-outline-secondary" onClick={() => setShowPwDropdown(!showPwDropdown)}>
                                <Icon icon={showPwDropdown ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'} />
                            </button>
                        </div>
                        {showPwDropdown && (
                            <div className="card position-absolute w-100 mt-1 shadow border-0" style={{zIndex: 1050, maxHeight: '200px'}}>
                                <div className="list-group list-group-flush" style={{maxHeight: '200px', overflowY: 'auto'}}>
                                    {pregnantWomen
                                        .filter(pw => !pwSearch || pw.full_name?.toLowerCase().includes(pwSearch.toLowerCase()) || pw.mobile_number?.includes(pwSearch))
                                        .map(pw => (
                                            <button
                                                key={pw.id}
                                                type="button"
                                                className="list-group-item list-group-item-action border-0 py-2 px-3 text-start"
                                                onClick={() => { setForm(f => ({...f, pregnant_woman_id: pw.id})); setPwSearch(pw.full_name); setShowPwDropdown(false); }}
                                            >
                                                {pw.full_name} — {pw.mobile_number}
                                            </button>
                                        ))
                                    }
                                    {pregnantWomen.filter(pw => !pwSearch || pw.full_name?.toLowerCase().includes(pwSearch.toLowerCase()) || pw.mobile_number?.includes(pwSearch)).length === 0 && (
                                        <div className="list-group-item border-0 py-3 text-center text-muted"><small>No patients found</small></div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        ECG Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        value={form.ecg_date}
                        max={new Date().toISOString().split("T")[0]}
                        onChange={(e) => setForm((f) => ({ ...f, ecg_date: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Result <span className="text-danger">*</span>
                      </label>
                      <div className="d-flex gap-4 mt-2">
                        {["normal", "abnormal"].map((val) => (
                          <div className="form-check" key={val}>
                            <input
                              className="form-check-input"
                              type="radio"
                              name="result"
                              id={`result_${val}`}
                              value={val}
                              checked={form.result === val}
                              onChange={() => setForm((f) => ({ ...f, result: val }))}
                            />
                            <label
                              className={`form-check-label fw-semibold ${val === "abnormal" ? "text-danger" : "text-success"}`}
                              htmlFor={`result_${val}`}
                            >
                              {val === "abnormal" ? "⚠️ Abnormal" : "✓ Normal"}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Notes (Optional)</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        placeholder="Any additional observations..."
                        value={form.notes}
                        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">
                        ECG Report File (Optional — PDF/Image)
                      </label>
                      <input
                        type="file"
                        className="form-control"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setReportFile(e.target.files[0] || null)}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowCreate(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={creating}>
                    {creating ? (
                      <><span className="spinner-border spinner-border-sm me-2" />Saving...</>
                    ) : (
                      "Submit ECG Report"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── View Modal ───────────────────────────────────────────────────── */}
      {viewReport && (
        <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <Icon icon="mdi:heart-pulse" className="me-2 text-danger" />
                  ECG Report Details
                </h5>
                <button className="btn-close" onClick={() => setViewReport(null)} />
              </div>
              <div className="modal-body">
                <table className="table table-borderless table-sm">
                  <tbody>
                    <tr><td className="fw-semibold text-secondary-light">Patient</td><td>{viewReport.pregnant_woman_name}</td></tr>
                    <tr><td className="fw-semibold text-secondary-light">Mobile</td><td>{viewReport.mobile_number}</td></tr>
                    <tr><td className="fw-semibold text-secondary-light">ECG Date</td><td>{formatDate(viewReport.ecg_date)}</td></tr>
                    <tr>
                      <td className="fw-semibold text-secondary-light">Result</td>
                      <td>{resultBadge(viewReport.result)}</td>
                    </tr>
                    <tr><td className="fw-semibold text-secondary-light">Delivery Point</td><td>{viewReport.dp_name}</td></tr>
                    <tr><td className="fw-semibold text-secondary-light">Recorded By</td><td>{viewReport.recorded_by_name}</td></tr>
                    <tr><td className="fw-semibold text-secondary-light">Notes</td><td>{viewReport.notes || "—"}</td></tr>
                    {viewReport.report_file_url && (
                      <tr>
                        <td className="fw-semibold text-secondary-light">Report File</td>
                        <td>
                          <a
                            href={`${process.env.REACT_APP_API_BASE_URL}${viewReport.report_file_url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-sm btn-outline-primary"
                          >
                            <Icon icon="mdi:file-download-outline" className="me-1" />
                            View File
                          </a>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setViewReport(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MasterLayout>
  );
};

export default ECGReportManagementLayer;
