import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import {
  ancVisitAPI,
  pregnantWomenAPI,
  adminAPI,
  authAPI,
} from "../services/api";
import { getUserRole } from "../services/auth";
import {
  formatDate,
  formatDateTime,
  formatDateForInput,
} from "../utils/dateFormatter";

const ANCVisitManagementLayer = () => {
  const [visits, setVisits] = useState([]);
  const [visitsDueToday, setVisitsDueToday] = useState([]);
  const [overdueVisits, setOverdueVisits] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [pregnantWomen, setPregnantWomen] = useState([]);
  const [pregnantWomanSearch, setPregnantWomanSearch] = useState("");
  const [showPregnantWomanDropdown, setShowPregnantWomanDropdown] =
    useState(false);
  const userRole = getUserRole();
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userSubCentre, setUserSubCentre] = useState(null);
  const [facilityType, setFacilityType] = useState("auto");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const [visitData, setVisitData] = useState({
    pregnant_woman_id: "",
    visit_number: 1,
    visit_date: "",
    weight: "",
    blood_pressure: "",
    hemoglobin: "",
    fundal_height: "",
    fetal_heart_rate: "",
    referred_for_usg: false,
    is_emergency: false,
    doctor_notes: "",
    next_visit_date: "",
    facility_name: "",
    urine_albumin: "",
    urine_sugar: "",
  });

  useEffect(() => {
    fetchAllData();
    fetchPregnantWomen();
    fetchUserSubCentre();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      // allSettled: one failing endpoint must not blank out the whole page
      const [allVisits, dueToday, overdue, stats] = await Promise.allSettled([
        ancVisitAPI.getVisits(),
        ancVisitAPI.getVisitsDueToday(),
        ancVisitAPI.getOverdueVisits(),
        ancVisitAPI.getStatistics(),
      ]);

      console.log(allVisits, "allVisits");
      if (allVisits.status === "fulfilled") setVisits(allVisits.value);
      else console.error("Error fetching ANC visits:", allVisits.reason);
      if (dueToday.status === "fulfilled") setVisitsDueToday(dueToday.value);
      else console.error("Error fetching due-today visits:", dueToday.reason);
      if (overdue.status === "fulfilled") setOverdueVisits(overdue.value);
      else console.error("Error fetching overdue visits:", overdue.reason);
      if (stats.status === "fulfilled") setStatistics(stats.value);
      else console.error("Error fetching ANC statistics:", stats.reason);
    } catch (error) {
      console.error("Error fetching ANC visits:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserSubCentre = async () => {
    try {
      const userData = await authAPI.getCurrentUser();
      console.log("User Data:", userData);
      if (userData?.sub_centre_name) {
        console.log("Sub-Centre Name:", userData.sub_centre_name);
        setUserSubCentre({ name: userData.sub_centre_name });
        setVisitData((prev) => ({
          ...prev,
          facility_name: userData.sub_centre_name,
        }));
      }
    } catch (error) {
      console.error("Error fetching user sub-centre:", error);
    }
  };

  const fetchPregnantWomen = async () => {
    try {
      const res = await pregnantWomenAPI.getPregnantWomen(
        0,
        10000,
        null,
        null,
        null,
        null,
        null,
      );
      setPregnantWomen(res.data || []);
    } catch (error) {
      console.error("Error fetching pregnant women:", error);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!visitData.pregnant_woman_id)
      newErrors.pregnant_woman_id = "Pregnant woman is required";
    if (!visitData.visit_date) newErrors.visit_date = "Visit date is required";
    if (!visitData.facility_name)
      newErrors.facility_name = "Facility name is required";
    if (!visitData.weight) newErrors.weight = "Weight is required";
    // if (!visitData.blood_pressure) newErrors.blood_pressure = 'Blood pressure is required';
    // if (!visitData.hemoglobin) newErrors.hemoglobin = 'Hemoglobin is required';
    if (!visitData.fundal_height)
      newErrors.fundal_height = "Fundal height is required";
    if (!visitData.fetal_heart_rate)
      newErrors.fetal_heart_rate = "Fetal heart rate is required";
    if (!visitData.next_visit_date)
      newErrors.next_visit_date = "Next visit date is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateVisit = async () => {
    if (isSubmitting) return;
    if (!validateForm()) {
      alert("Please fill all required fields");
      return;
    }
    setIsSubmitting(true);
    try {
      const toNum = (v) => (v === "" || v == null ? null : Number(v));
      const toStr = (v) => (v === "" || v == null ? null : v);

      const payload = {
        ...visitData,
        weight: toNum(visitData.weight),
        hemoglobin: toNum(visitData.hemoglobin),
        fundal_height: toNum(visitData.fundal_height),
        fetal_heart_rate: toNum(visitData.fetal_heart_rate),
        blood_pressure: toStr(visitData.blood_pressure),
        urine_albumin: toStr(visitData.urine_albumin),
        urine_sugar: toStr(visitData.urine_sugar),
        doctor_notes: toStr(visitData.doctor_notes),
        next_visit_date: toStr(visitData.next_visit_date),
      };
      await ancVisitAPI.createVisit(payload);
      alert("ANC visit created successfully");
      setShowCreateModal(false);
      setVisitData({
        pregnant_woman_id: "",
        visit_number: 1,
        visit_date: "",
        weight: "",
        blood_pressure: "",
        hemoglobin: "",
        urine_albumin: "",
        urine_sugar: "",
        fundal_height: "",
        fetal_heart_rate: "",
        referred_for_usg: false,
        is_emergency: false,
        doctor_notes: "",
        next_visit_date: "",
        facility_name: "",
      });
      setErrors({});
      fetchAllData();
    } catch (error) {
      console.error("Error creating visit:", error);
      alert("Failed to create visit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateVisit = async () => {
    try {
      await ancVisitAPI.updateVisit(selectedVisit.id, visitData);
      alert("ANC visit updated successfully");
      setShowUpdateModal(false);
      fetchAllData();
    } catch (error) {
      console.error("Error updating visit:", error);
      alert("Failed to update visit");
    }
  };

  const handleDeleteVisit = async (visitId) => {
    if (window.confirm("Are you sure you want to delete this visit?")) {
      try {
        await ancVisitAPI.deleteVisit(visitId);
        alert("Visit deleted successfully");
        fetchAllData();
      } catch (error) {
        console.error("Error deleting visit:", error);
        alert("Failed to delete visit");
      }
    }
  };

  const getCurrentData = () => {
    switch (activeTab) {
      case "due_today":
        return visitsDueToday;
      case "overdue":
        return overdueVisits;
      default:
        return visits;
    }
  };

  const getPatientName = (visit) => {
    return visit.pregnant_woman_name || "N/A";
  };

  const filteredData = getCurrentData().filter(
    (visit) =>
      getPatientName(visit).toLowerCase().includes(searchTerm.toLowerCase()) ||
      visit.facility_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visit.id?.toString().includes(searchTerm),
  );

  // Smart pagination function to show only relevant page numbers
  const getVisiblePages = (currentPage, totalPages) => {
    const delta = 2; // Show 2 pages before and after current page
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...");
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots.filter(
      (item, index, arr) => arr.indexOf(item) === index,
    );
  };

  const getVisitTypeBadge = (visit) => {
    if (visit.is_emergency) {
      return (
        <span className="px-24 py-4 rounded-pill fw-medium text-sm bg-danger-focus text-danger-main">
          Emergency
        </span>
      );
    }
    if (visit.referred_for_usg) {
      return (
        <span className="px-24 py-4 rounded-pill fw-medium text-sm bg-info-focus text-info-main">
          PMSMA Referred
        </span>
      );
    }
    return (
      <span className="px-24 py-4 rounded-pill fw-medium text-sm bg-success-focus text-success-main">
        Regular
      </span>
    );
  };

  return (
    <div className="card h-100 p-0 radius-12">
      {/* Statistics Cards */}
      <div className="col-12">
        <div className="card radius-12">
          <div className="card-body p-16">
            <div className="row gy-4">
              <div className="col-xxl-3 col-xl-4 col-sm-6">
                <div className="px-20 py-16 shadow-none radius-8 h-100 gradient-deep-1 left-line line-bg-primary position-relative overflow-hidden">
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8">
                    <div>
                      <span className="mb-2 fw-medium text-secondary-light text-md">
                        Total ANC Visits
                      </span>
                      <h6 className="fw-semibold mb-1">
                        {statistics.total_anc_visits || visits.length}
                      </h6>
                    </div>
                    <span className="w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-2xl mb-12 bg-primary-100 text-primary-600">
                      <Icon icon="material-symbols:medical-services" />
                    </span>
                  </div>
                  <p className="text-sm mb-0">
                    <span className="bg-success-focus px-1 rounded-2 fw-medium text-success-main text-sm">
                      <Icon icon="ri:arrow-right-up-line" /> Active
                    </span>{" "}
                    Medical Visits{" "}
                  </p>
                </div>
              </div>
              <div className="col-xxl-3 col-xl-4 col-sm-6">
                <div className="px-20 py-16 shadow-none radius-8 h-100 gradient-deep-2 left-line line-bg-lilac position-relative overflow-hidden">
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8">
                    <div>
                      <span className="mb-2 fw-medium text-secondary-light text-md">
                        Due Today
                      </span>
                      <h6 className="fw-semibold mb-1">
                        {visitsDueToday.length}
                      </h6>
                    </div>
                    <span className="w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-2xl mb-12 bg-lilac-200 text-lilac-600">
                      <Icon icon="material-symbols:today" />
                    </span>
                  </div>
                  <p className="text-sm mb-0">
                    <span className="bg-warning-focus px-1 rounded-2 fw-medium text-warning-main text-sm">
                      <Icon icon="ri:arrow-right-up-line" /> Scheduled
                    </span>{" "}
                    Today's Visits{" "}
                  </p>
                </div>
              </div>
              <div className="col-xxl-3 col-xl-4 col-sm-6">
                <div className="px-20 py-16 shadow-none radius-8 h-100 bg-danger-100 left-line line-bg-danger position-relative overflow-hidden">
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8">
                    <div>
                      <span className="mb-2 fw-medium text-secondary-light text-md">
                        Overdue
                      </span>
                      <h6 className="fw-semibold mb-1">
                        {overdueVisits.length}
                      </h6>
                    </div>
                    <span className="w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-2xl mb-12 bg-danger-200 text-danger-600">
                      <Icon icon="material-symbols:priority-high" />
                    </span>
                  </div>
                  <p className="text-sm mb-0">
                    <span className="bg-danger-focus px-1 rounded-2 fw-medium text-danger-main text-sm">
                      <Icon icon="ri:arrow-right-up-line" /> Critical
                    </span>{" "}
                    Need Attention{" "}
                  </p>
                </div>
              </div>
              <div className="col-xxl-3 col-xl-4 col-sm-6">
                <div className="px-20 py-16 shadow-none radius-8 h-100 gradient-deep-4 left-line line-bg-warning position-relative overflow-hidden">
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8">
                    <div>
                      <span className="mb-2 fw-medium text-secondary-light text-md">
                        PMSMA Referrals
                      </span>
                      <h6 className="fw-semibold mb-1">
                        {statistics.usg_referrals || 0}
                      </h6>
                    </div>
                    <span className="w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-2xl mb-12 bg-warning-focus text-warning-600">
                      <Icon icon="line-md:backup-restore" />
                    </span>
                  </div>
                  <p className="text-sm mb-0">
                    <span className="bg-info-focus px-1 rounded-2 fw-medium text-info-main text-sm">
                      <Icon icon="ri:arrow-right-up-line" /> Referred
                    </span>{" "}
                    PMSMA{" "}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs and Actions */}
      <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between">
        <div className="d-flex align-items-center flex-wrap gap-3">
          <ul className="nav border-gradient-tab nav-pills" role="tablist">
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === "all" ? "active" : ""}`}
                onClick={() => setActiveTab("all")}
                type="button"
              >
                All Visits
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === "due_today" ? "active" : ""}`}
                onClick={() => setActiveTab("due_today")}
                type="button"
              >
                Due Today
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === "overdue" ? "active" : ""}`}
                onClick={() => setActiveTab("overdue")}
                type="button"
              >
                Overdue
              </button>
            </li>
          </ul>

          {/* Pagination Size Selector */}
          <div className="d-flex align-items-center gap-2">
            <span className="text-sm text-secondary-light">Show:</span>
            <select
              className="form-select form-select-sm"
              style={{ width: "auto" }}
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
        <div className="d-flex align-items-center gap-3">
          <form className="navbar-search">
            <input
              type="text"
              className="bg-base h-40-px w-auto"
              placeholder="Search..."
              title="Search by name, facility, visit ID"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
            <Icon icon="ion:search-outline" className="icon" />
          </form>
          {userRole === "sub_centre" && (
            <button
              className="btn btn-primary btn-sm px-12 py-6 radius-8 h-40-px d-flex align-items-center gap-2"
              onClick={() => setShowCreateModal(true)}
            >
              <Icon icon="material-symbols:add" className="text-lg" />
              Create Visit
            </button>
          )}
        </div>
      </div>

      {/* Visits Table */}
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
                  <th scope="col">Visit #</th>
                  <th scope="col">Visit Date</th>
                  <th scope="col">Facility</th>
                  <th scope="col">Type</th>
                  <th scope="col">Next Visit</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4">
                      No ANC visits found
                    </td>
                  </tr>
                ) : (
                  filteredData
                    .slice(
                      (currentPage - 1) * itemsPerPage,
                      currentPage * itemsPerPage,
                    )
                    .map((visit, index) => (
                      <tr key={visit.id}>
                        <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                        <td>{getPatientName(visit)}</td>
                        <td className="text-primary-600 fw-medium">
                          #{visit.visit_number}
                        </td>
                        <td>{formatDate(visit.visit_date)}</td>
                        <td>{visit.facility_name}</td>
                        <td>{getVisitTypeBadge(visit)}</td>
                        <td>{formatDate(visit.next_visit_date)}</td>
                        <td>
                          <div className="d-flex align-items-center gap-10 justify-content-center">
                            <button
                              className="bg-primary-50 text-primary-600 bg-hover-primary-100 text-hover-primary-800 w-32-px h-32-px d-flex justify-content-center align-items-center rounded-circle"
                              onClick={() => {
                                setSelectedVisit(visit);
                                setShowViewModal(true);
                              }}
                              title="View Details"
                            >
                              <Icon icon="iconamoon:eye-light" />
                            </button>
                            {(userRole === "sub_centre" ||
                              userRole === "block") && (
                              <button
                                className="bg-success-focus text-success-main bg-hover-success-200 w-32-px h-32-px d-flex justify-content-center align-items-center rounded-circle"
                                onClick={() => {
                                  setSelectedVisit(visit);
                                  setVisitData({
                                    ...visit,
                                    visit_date: formatDateForInput(
                                      visit.visit_date,
                                    ),
                                    next_visit_date: formatDateForInput(
                                      visit.next_visit_date,
                                    ),
                                  });
                                  setShowUpdateModal(true);
                                }}
                                title="Edit"
                              >
                                <Icon icon="lucide:edit" />
                              </button>
                            )}
                            {(userRole === "district" ||
                              userRole === "block") && (
                              <button
                                className="bg-danger-focus text-danger-main bg-hover-danger-200 w-32-px h-32-px d-flex justify-content-center align-items-center rounded-circle"
                                onClick={() => handleDeleteVisit(visit.id)}
                                title="Delete"
                              >
                                <Icon icon="fluent:delete-24-regular" />
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

        {/* Pagination */}
        {filteredData.length > itemsPerPage && (
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-24">
            <span className="text-sm text-secondary-light">
              Showing{" "}
              {Math.min(
                (currentPage - 1) * itemsPerPage + 1,
                filteredData.length,
              )}{" "}
              to {Math.min(currentPage * itemsPerPage, filteredData.length)} of{" "}
              {filteredData.length} entries
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
                  <Icon icon="ep:d-arrow-left" />
                  <Icon icon="ep:d-arrow-left" />
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
              {getVisiblePages(
                currentPage,
                Math.ceil(filteredData.length / itemsPerPage),
              ).map((page, index) => {
                if (page === "...") {
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
                      className={`page-link ${currentPage === page ? "bg-primary-600 text-white" : "bg-neutral-200 text-secondary-light"} fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px`}
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
                  onClick={() =>
                    setCurrentPage(
                      Math.min(
                        Math.ceil(filteredData.length / itemsPerPage),
                        currentPage + 1,
                      ),
                    )
                  }
                  disabled={
                    currentPage ===
                    Math.ceil(filteredData.length / itemsPerPage)
                  }
                  title="Next Page"
                >
                  <Icon icon="ep:d-arrow-right" className="" />
                </button>
              </li>
              {/* Last Page */}
              <li className="page-item">
                <button
                  className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md"
                  onClick={() =>
                    setCurrentPage(
                      Math.ceil(filteredData.length / itemsPerPage),
                    )
                  }
                  disabled={
                    currentPage ===
                    Math.ceil(filteredData.length / itemsPerPage)
                  }
                  title="Last Page"
                >
                  <Icon icon="ep:d-arrow-right" />
                  <Icon icon="ep:d-arrow-right" />
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Create Visit Modal */}
      {showCreateModal && (
        <>
          <div
            className="modal fade show"
            style={{ display: "block" }}
            tabIndex="-1"
          >
            <div className="modal-dialog modal-xl modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Create ANC Visit</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowCreateModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Pregnant Woman <span className="text-danger">*</span>
                      </label>
                      <div className="position-relative">
                        <div className="input-group">
                          <input
                            type="text"
                            className={`form-control ${errors.pregnant_woman_id ? "is-invalid" : ""}`}
                            placeholder="Search or select pregnant woman..."
                            value={pregnantWomanSearch}
                            onChange={(e) => {
                              setPregnantWomanSearch(e.target.value);
                              setShowPregnantWomanDropdown(true);
                            }}
                            onFocus={() => setShowPregnantWomanDropdown(true)}
                            autoComplete="off"
                          />
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() =>
                              setShowPregnantWomanDropdown(
                                !showPregnantWomanDropdown,
                              )
                            }
                          >
                            <Icon
                              icon={
                                showPregnantWomanDropdown
                                  ? "solar:alt-arrow-up-bold"
                                  : "solar:alt-arrow-down-bold"
                              }
                            />
                          </button>
                        </div>
                        {showPregnantWomanDropdown && (
                          <div
                            className="card position-absolute w-100 mt-1 shadow border-0"
                            style={{ zIndex: 1050, maxHeight: "200px" }}
                          >
                            <div
                              className="list-group list-group-flush"
                              style={{ maxHeight: "200px", overflowY: "auto" }}
                            >
                              {pregnantWomen
                                .filter(
                                  (woman) =>
                                    !pregnantWomanSearch ||
                                    woman.full_name
                                      ?.toLowerCase()
                                      .includes(
                                        pregnantWomanSearch.toLowerCase(),
                                      ),
                                )
                                .map((woman) => (
                                  <button
                                    key={woman.id}
                                    type="button"
                                    className="list-group-item list-group-item-action border-0 py-2 px-3 text-start"
                                    onClick={() => {
                                      setVisitData({
                                        ...visitData,
                                        pregnant_woman_id: woman.id,
                                      });
                                      setPregnantWomanSearch(woman.full_name);
                                      setShowPregnantWomanDropdown(false);
                                    }}
                                  >
                                    {woman.full_name}
                                  </button>
                                ))}
                              {pregnantWomen.filter(
                                (woman) =>
                                  !pregnantWomanSearch ||
                                  woman.full_name
                                    ?.toLowerCase()
                                    .includes(
                                      pregnantWomanSearch.toLowerCase(),
                                    ),
                              ).length === 0 && (
                                <div className="list-group-item border-0 py-3 text-center text-muted">
                                  <small>No women found</small>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      {errors.pregnant_woman_id && (
                        <div className="text-danger-600 text-sm mt-1">
                          {errors.pregnant_woman_id}
                        </div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Visit Number <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={visitData.visit_number}
                        onChange={(e) =>
                          setVisitData({
                            ...visitData,
                            visit_number: parseInt(e.target.value),
                          })
                        }
                        required
                      >
                        <option value={1}>1st ANC Visit</option>
                        <option value={2}>2nd ANC Visit</option>
                        <option value={3}>3rd ANC Visit</option>
                        <option value={4}>4th ANC Visit</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Visit Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className={`form-control ${errors.visit_date ? "is-invalid" : ""}`}
                        value={visitData.visit_date}
                        onChange={(e) =>
                          setVisitData({
                            ...visitData,
                            visit_date: e.target.value,
                          })
                        }
                        required
                      />
                      {errors.visit_date && (
                        <div className="text-danger-600 text-sm mt-1">
                          {errors.visit_date}
                        </div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Facility Name <span className="text-danger">*</span>
                      </label>
                      <select
                        className={`form-select ${errors.facility_name ? "is-invalid" : ""}`}
                        value={facilityType}
                        onChange={(e) => {
                          setFacilityType(e.target.value);
                          if (e.target.value === "auto" && userSubCentre) {
                            setVisitData({
                              ...visitData,
                              facility_name: userSubCentre.name,
                            });
                          } else if (e.target.value === "other") {
                            setVisitData({ ...visitData, facility_name: "" });
                          }
                        }}
                      >
                        <option value="auto">
                          {userSubCentre?.name || "My Sub-Centre"}
                        </option>
                        <option value="other">Other Facility</option>
                      </select>
                      {facilityType === "other" && (
                        <input
                          type="text"
                          className={`form-control mt-2 ${errors.facility_name ? "is-invalid" : ""}`}
                          value={visitData.facility_name}
                          onChange={(e) =>
                            setVisitData({
                              ...visitData,
                              facility_name: e.target.value,
                            })
                          }
                          placeholder="Enter facility name"
                          required
                        />
                      )}
                      {errors.facility_name && (
                        <div className="text-danger-600 text-sm mt-1">
                          {errors.facility_name}
                        </div>
                      )}
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">
                        Weight (kg) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        className={`form-control ${errors.weight ? "is-invalid" : ""}`}
                        value={visitData.weight}
                        onChange={(e) =>
                          setVisitData({ ...visitData, weight: e.target.value })
                        }
                        required
                      />
                      {errors.weight && (
                        <div className="text-danger-600 text-sm mt-1">
                          {errors.weight}
                        </div>
                      )}
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">
                        Blood Pressure (mm Hg){" "}
                      </label>
                      <input
                        type="text"
                        className={`form-control ${errors.blood_pressure ? "is-invalid" : ""}`}
                        placeholder="120/80"
                        value={visitData.blood_pressure}
                        onChange={(e) => {
                          let value = e.target.value.replace(/[^0-9]/g, "");
                          if (value.length > 2) {
                            value = value.slice(0, 3) + "/" + value.slice(3, 6);
                          }
                          setVisitData({ ...visitData, blood_pressure: value });
                        }}
                        maxLength="7"
                        required
                      />
                      {errors.blood_pressure && (
                        <div className="text-danger-600 text-sm mt-1">
                          {errors.blood_pressure}
                        </div>
                      )}
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">
                        Hemoglobin (g/dL)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        className={`form-control ${errors.hemoglobin ? "is-invalid" : ""}`}
                        value={visitData.hemoglobin}
                        onChange={(e) =>
                          setVisitData({
                            ...visitData,
                            hemoglobin: e.target.value,
                          })
                        }
                      />
                      {errors.hemoglobin && (
                        <div className="text-danger-600 text-sm mt-1">
                          {errors.hemoglobin}
                        </div>
                      )}
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">
                        Urine_albumin (mg/g)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        className={`form-control ${errors.urine_albumin ? "is-invalid" : ""}`}
                        value={visitData.urine_albumin}
                        onChange={(e) =>
                          setVisitData({
                            ...visitData,
                            urine_albumin: e.target.value,
                          })
                        }
                        required
                      />
                      {errors.urine_albumin && (
                        <div className="text-danger-600 text-sm mt-1">
                          {errors.urine_albumin}
                        </div>
                      )}
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">
                        Urine_sugar (mg/g)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        className={`form-control ${errors.urine_sugar ? "is-invalid" : ""}`}
                        value={visitData.urine_sugar}
                        onChange={(e) =>
                          setVisitData({
                            ...visitData,
                            urine_sugar: e.target.value,
                          })
                        }
                        required
                      />
                      {errors.urine_sugar && (
                        <div className="text-danger-600 text-sm mt-1">
                          {errors.urine_sugar}
                        </div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Fundal Height (cm){" "}
                        <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        className={`form-control ${errors.fundal_height ? "is-invalid" : ""}`}
                        value={visitData.fundal_height}
                        onChange={(e) =>
                          setVisitData({
                            ...visitData,
                            fundal_height: e.target.value,
                          })
                        }
                        required
                      />
                      {errors.fundal_height && (
                        <div className="text-danger-600 text-sm mt-1">
                          {errors.fundal_height}
                        </div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Fetal Heart Rate (bpm){" "}
                        <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        className={`form-control ${errors.fetal_heart_rate ? "is-invalid" : ""}`}
                        value={visitData.fetal_heart_rate}
                        onChange={(e) =>
                          setVisitData({
                            ...visitData,
                            fetal_heart_rate: e.target.value,
                          })
                        }
                        required
                      />
                      {errors.fetal_heart_rate && (
                        <div className="text-danger-600 text-sm mt-1">
                          {errors.fetal_heart_rate}
                        </div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Next Visit Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className={`form-control ${errors.next_visit_date ? "is-invalid" : ""}`}
                        value={visitData.next_visit_date}
                        onChange={(e) =>
                          setVisitData({
                            ...visitData,
                            next_visit_date: e.target.value,
                          })
                        }
                        required
                      />
                      {errors.next_visit_date && (
                        <div className="text-danger-600 text-sm mt-1">
                          {errors.next_visit_date}
                        </div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <div className="form-check d-flex align-items-center mb-16">
                        <input
                          className="form-check-input me-2"
                          type="checkbox"
                          id="referred_for_usg_create"
                          checked={visitData.referred_for_usg}
                          onChange={(e) =>
                            setVisitData({
                              ...visitData,
                              referred_for_usg: e.target.checked,
                            })
                          }
                        />
                        <label
                          className="form-check-label"
                          htmlFor="referred_for_usg_create"
                        >
                          Referred for PMSMA
                        </label>
                      </div>
                      <div className="form-check d-flex align-items-center mb-16">
                        <input
                          className="form-check-input me-2"
                          type="checkbox"
                          id="is_emergency_create"
                          checked={visitData.is_emergency}
                          onChange={(e) =>
                            setVisitData({
                              ...visitData,
                              is_emergency: e.target.checked,
                            })
                          }
                        />
                        <label
                          className="form-check-label"
                          htmlFor="is_emergency_create"
                        >
                          Emergency Visit
                        </label>
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">
                        Doctor Notes
                      </label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={visitData.doctor_notes}
                        onChange={(e) =>
                          setVisitData({
                            ...visitData,
                            doctor_notes: e.target.value,
                          })
                        }
                        placeholder="Enter doctor's observations and notes..."
                      ></textarea>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleCreateVisit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Creating..." : "Create Visit"}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div
            className="modal-backdrop fade show"
            onClick={() => setShowCreateModal(false)}
          ></div>
        </>
      )}

      {/* View Visit Modal */}
      {showViewModal && selectedVisit && (
        <>
          <div
            className="modal fade show"
            style={{ display: "block" }}
            tabIndex="-1"
          >
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">ANC Visit Details</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowViewModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Name:</label>
                      <p className="mb-0">{getPatientName(selectedVisit)}</p>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Visit Number:
                      </label>
                      <p className="mb-0">#{selectedVisit.visit_number}</p>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Visit Date:
                      </label>
                      <p className="mb-0">
                        {formatDate(selectedVisit.visit_date)}
                      </p>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Facility:
                      </label>
                      <p className="mb-0">{selectedVisit.facility_name}</p>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Weight:</label>
                      <p className="mb-0">
                        {selectedVisit.weight
                          ? `${selectedVisit.weight} kg`
                          : "N/A"}
                      </p>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">
                        Blood Pressure (mm Hg):
                      </label>
                      <p className="mb-0">
                        {selectedVisit.blood_pressure || "N/A"}
                      </p>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">
                        Hemoglobin:
                      </label>
                      <p className="mb-0">
                        {selectedVisit.hemoglobin
                          ? `${selectedVisit.hemoglobin} g/dL`
                          : "N/A"}
                      </p>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">
                        Urine_albumin:
                      </label>
                      <p className="mb-0">
                        {selectedVisit.urine_albumin
                          ? `${selectedVisit.urine_albumin} g/dL`
                          : "N/A"}
                      </p>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">
                        Urine_sugar:
                      </label>
                      <p className="mb-0">
                        {selectedVisit.urine_sugar
                          ? `${selectedVisit.urine_sugar} g/dL`
                          : "N/A"}
                      </p>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Fundal Height:
                      </label>
                      <p className="mb-0">
                        {selectedVisit.fundal_height
                          ? `${selectedVisit.fundal_height} cm`
                          : "N/A"}
                      </p>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Fetal Heart Rate:
                      </label>
                      <p className="mb-0">
                        {selectedVisit.fetal_heart_rate
                          ? `${selectedVisit.fetal_heart_rate} bpm`
                          : "N/A"}
                      </p>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Visit Type:
                      </label>
                      <p className="mb-0">{getVisitTypeBadge(selectedVisit)}</p>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Next Visit Date:
                      </label>
                      <p className="mb-0">
                        {formatDate(selectedVisit.next_visit_date)}
                      </p>
                    </div>
                    {selectedVisit.doctor_notes && (
                      <div className="col-12">
                        <label className="form-label fw-semibold">
                          Doctor Notes:
                        </label>
                        <p className="mb-0 p-3 bg-neutral-50 rounded">
                          {selectedVisit.doctor_notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowViewModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div
            className="modal-backdrop fade show"
            onClick={() => setShowViewModal(false)}
          ></div>
        </>
      )}

      {/* Update Visit Modal */}
      {showUpdateModal && selectedVisit && (
        <>
          <div
            className="modal fade show"
            style={{ display: "block" }}
            tabIndex="-1"
          >
            <div className="modal-dialog modal-xl modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Update ANC Visit</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowUpdateModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Name:</label>
                      <p className="mb-0 fw-medium">
                        {getPatientName(selectedVisit)}
                      </p>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Visit Number:
                      </label>
                      <p className="mb-0 fw-medium">
                        #{selectedVisit.visit_number}
                      </p>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">
                        Weight (kg)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        className="form-control"
                        value={visitData.weight}
                        onChange={(e) =>
                          setVisitData({ ...visitData, weight: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">
                        Blood Pressure (mm Hg)
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={visitData.blood_pressure}
                        onChange={(e) =>
                          setVisitData({
                            ...visitData,
                            blood_pressure: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">
                        Hemoglobin (g/dL)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        className="form-control"
                        value={visitData.hemoglobin}
                        onChange={(e) =>
                          setVisitData({
                            ...visitData,
                            hemoglobin: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">
                        Urine_albumin:
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        className="form-control"
                        value={visitData.urine_albumin}
                        onChange={(e) =>
                          setVisitData({
                            ...visitData,
                            urine_albumin: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">
                        Urine_sugar:
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        className="form-control"
                        value={visitData.urine_sugar}
                        onChange={(e) =>
                          setVisitData({
                            ...visitData,
                            urine_sugar: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Fundal Height (cm)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        className="form-control"
                        value={visitData.fundal_height}
                        onChange={(e) =>
                          setVisitData({
                            ...visitData,
                            fundal_height: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Fetal Heart Rate (bpm)
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        value={visitData.fetal_heart_rate}
                        onChange={(e) =>
                          setVisitData({
                            ...visitData,
                            fetal_heart_rate: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Next Visit Date
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        value={visitData.next_visit_date}
                        onChange={(e) =>
                          setVisitData({
                            ...visitData,
                            next_visit_date: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="col-md-6">
                      <div className="form-check d-flex align-items-center mb-16">
                        <input
                          className="form-check-input me-2"
                          type="checkbox"
                          id="referred_for_usg_update"
                          checked={visitData.referred_for_usg}
                          onChange={(e) =>
                            setVisitData({
                              ...visitData,
                              referred_for_usg: e.target.checked,
                            })
                          }
                        />
                        <label
                          className="form-check-label"
                          htmlFor="referred_for_usg_update"
                        >
                          Referred for PMSMA
                        </label>
                      </div>
                      <div className="form-check d-flex align-items-center mb-16">
                        <input
                          className="form-check-input me-2"
                          type="checkbox"
                          id="is_emergency_update"
                          checked={visitData.is_emergency}
                          onChange={(e) =>
                            setVisitData({
                              ...visitData,
                              is_emergency: e.target.checked,
                            })
                          }
                        />
                        <label
                          className="form-check-label"
                          htmlFor="is_emergency_update"
                        >
                          Emergency Visit
                        </label>
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">
                        Doctor Notes
                      </label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={visitData.doctor_notes}
                        onChange={(e) =>
                          setVisitData({
                            ...visitData,
                            doctor_notes: e.target.value,
                          })
                        }
                      ></textarea>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowUpdateModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleUpdateVisit}
                  >
                    Update Visit
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div
            className="modal-backdrop fade show"
            onClick={() => setShowUpdateModal(false)}
          ></div>
        </>
      )}
    </div>
  );
};

export default ANCVisitManagementLayer;
