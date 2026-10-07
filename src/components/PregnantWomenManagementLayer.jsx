import React, { useState, useEffect } from "react";

import { useSearchParams } from "react-router-dom";

import { Icon } from "@iconify/react/dist/iconify.js";
import {
  ListTabs,
  ListTab,
  ListToolbar,
  ToolbarLeft,
  ToolbarRight,
  EntriesSelect,
  SearchBox,
  AddButton,
  BulkUploadButton,
  TableFooter,
} from "./common/ListControls";

import {
  pregnantWomenAPI,
  adminAPI,
  authAPI,
  pmsmaSessionAPI,
  pmsmaAPI,
  userAPI,
} from "../services/api";

import { getUserRole } from "../services/auth";

import {
  validateMobileNumber,
  formatMobileNumberInput,
} from "../utils/mobileValidation";

import { formatDate, formatDateForInput } from "../utils/dateFormatter";

const PregnantWomenManagementLayer = () => {
  const [pregnantWomen, setPregnantWomen] = useState([]);

  const [totalCount, setTotalCount] = useState(0);

  const [pendingApprovals, setPendingApprovals] = useState([]);

  const [pendingTotal, setPendingTotal] = useState(0);

  // Tab counts (for tab badges) — fetched separately, lightweight

  const [tabCounts, setTabCounts] = useState({
    all: 0,
    pending: 0,
    high_risk: 0,
    delivered: 0,
  });

  const [activeTab, setActiveTab] = useState("all");

  const [searchParams] = useSearchParams();

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (
      tabParam &&
      ["all", "pending", "high_risk", "delivered"].includes(tabParam)
    ) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const [districts, setDistricts] = useState([]);

  const [blocks, setBlocks] = useState([]);

  const [wards, setWards] = useState([]);

  const [subCentres, setSubCentres] = useState([]);

  const [loading, setLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const [showViewModal, setShowViewModal] = useState(false);

  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);

  const [selectedWoman, setSelectedWoman] = useState(null);

  const [registerData, setRegisterData] = useState({
    full_name: "",
    mobile_number: "", // aadhaar_number: '',

    abha_id: "",
    rch_id: "",
    husband_name: "",

    age: "",
    ward_id: "",
    block_id: "",
    district_id: "",
    date_of_birth: "",

    lmp_date: "",
    edd_date: "",
    gravida: "",
    para: "",
    blood_group: "",

    address: "",
    hpr_id: "",
    sub_centre_id: "",
    is_high_risk: false,

    risk_factors: "",
  });

  const [updateData, setUpdateData] = useState({});

  const [bulkFile, setBulkFile] = useState(null);

  const [bulkUploadResult, setBulkUploadResult] = useState(null);

  const [showBulkResultModal, setShowBulkResultModal] = useState(false);

  const [showPMSMAModal, setShowPMSMAModal] = useState(false);

  const [pmsmaScheduleData, setPmsmaScheduleData] = useState({
    scheduled_date: "",
    site: "",
    pmsma_centre_id: "",
  });
  const [pmsmaCentres, setPmsmaCentres] = useState([]);
  const [loadingPmsmaCentres, setLoadingPmsmaCentres] = useState(false);

  const [pmsmaSubmitting, setPmsmaSubmitting] = useState(false);

  const [districtSearch, setDistrictSearch] = useState("");

  const [blockSearch, setBlockSearch] = useState("");

  const [wardSearch, setWardSearch] = useState("");

  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);

  const [showBlockDropdown, setShowBlockDropdown] = useState(false);

  const [showWardDropdown, setShowWardDropdown] = useState(false);

  const [subCentreSearch, setSubCentreSearch] = useState("");

  const [showSubCentreDropdown, setShowSubCentreDropdown] = useState(false);

  const [updateBlockSearch, setUpdateBlockSearch] = useState("");

  const [updateWardSearch, setUpdateWardSearch] = useState("");

  const [showUpdateBlockDropdown, setShowUpdateBlockDropdown] = useState(false);

  const [showUpdateWardDropdown, setShowUpdateWardDropdown] = useState(false);

  const [mobileError, setMobileError] = useState("");

  const [updateMobileError, setUpdateMobileError] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errors, setErrors] = useState({});

  const [currentPage, setCurrentPage] = useState(1);

  const [itemsPerPage, setItemsPerPage] = useState(25);

  const userRole = getUserRole();
  const [currentUserInfo, setCurrentUserInfo] = useState(null);
  const [assignedWardIds, setAssignedWardIds] = useState(null); // null = not loaded / no restriction

  // Debounce search — wait 500ms after user stops typing before calling backend

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);

      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Re-fetch when page, itemsPerPage, debouncedSearch, or activeTab changes

  useEffect(() => {
    fetchPageData();
  }, [currentPage, itemsPerPage, debouncedSearch, activeTab]);

  // Fetch tab counts once on mount and after register/approve/bulk upload

  useEffect(() => {
    fetchTabCounts();

    fetchDistricts();

    fetchBlocks();

    fetchWards();

    fetchSubCentres();

    fetchCurrentUserInfo();
  }, []);

  const fetchCurrentUserInfo = async () => {
    try {
      const data = await authAPI.getCurrentUser();

      setCurrentUserInfo(data);
      if (data?.role === "sub_centre" && data?.id) {
        try {
          const res = await userAPI.getUserWards(data.id);
          const ids = (res?.wards || []).map((w) => Number(w.ward_id));
          setAssignedWardIds(ids.length ? ids : null);
        } catch (e) {
          console.error("Error fetching assigned wards:", e);
        }
      }
    } catch (error) {
      console.error("Error fetching current user info:", error);
    }
  };

  // Scope the Block picker to what the logged-in user is actually allowed
  // to register under: Sub-Centre/Block users are locked to their own
  // block; District users only see blocks within their own district.
  const visibleBlocks =
    ["sub_centre", "block"].includes(userRole) && currentUserInfo?.block_id
      ? blocks.filter((b) => b.id === currentUserInfo.block_id)
      : userRole === "district" && currentUserInfo?.district_id
        ? blocks.filter((b) => b.district_id === currentUserInfo.district_id)
        : blocks;

  // Build API params based on active tab

  const getTabFilters = (tab) => {
    switch (tab) {
      case "pending":
        return {
          registrationApproved: false,
          isSelfRegistered: true,
          isActive: null,
        };

      case "high_risk":
        return { isHighRisk: true, isActive: true };

      case "delivered":
        return { isActive: false };

      default:
        return { isActive: true };
    }
  };

  const fetchPageData = async () => {
    try {
      setLoading(true);

      const skip = (currentPage - 1) * itemsPerPage;

      const filters = getTabFilters(activeTab);

      const res = await pregnantWomenAPI.getPregnantWomen(
        skip,

        itemsPerPage,

        null,
        null,
        null,

        filters.isHighRisk ?? null,

        filters.isActive ?? null,

        filters.registrationApproved ?? null,

        debouncedSearch || null,

        filters.isSelfRegistered ?? null,
      );

      setPregnantWomen(res.data || []);

      setTotalCount(res.total || 0);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch just counts for tab badges (limit=1 each, no data needed)

  const fetchTabCounts = async () => {
    try {
      const [allRes, pendingRes, highRiskRes, deliveredRes] = await Promise.all(
        [
          pregnantWomenAPI.getPregnantWomen(0, 1, null, null, null, null, true),

          pregnantWomenAPI.getPregnantWomen(
            0,
            1,
            null,
            null,
            null,
            null,
            null,
            false,
            null,
            true,
          ),

          pregnantWomenAPI.getPregnantWomen(0, 1, null, null, null, true, true),

          pregnantWomenAPI.getPregnantWomen(
            0,
            1,
            null,
            null,
            null,
            null,
            false,
          ),
        ],
      );

      setTabCounts({
        all: allRes.total || 0,

        pending: pendingRes.total || 0,

        high_risk: highRiskRes.total || 0,

        delivered: deliveredRes.total || 0,
      });
    } catch (error) {
      console.error("Error fetching tab counts:", error);
    }
  };

  const refreshAll = () => {
    fetchPageData();

    fetchTabCounts();
  };

  const fetchDistricts = async () => {
    try {
      const data = await adminAPI.getDistricts();

      setDistricts(data);
    } catch (error) {
      console.error("Error fetching districts:", error);
    }
  };

  const fetchBlocks = async () => {
    try {
      const data = await adminAPI.getBlocks();

      setBlocks(data);
    } catch (error) {
      console.error("Error fetching blocks:", error);
    }
  };

  const fetchWards = async () => {
    try {
      const data = await adminAPI.getWards(0, 10000);

      setWards(data);
    } catch (error) {
      console.error("Error fetching wards:", error);
    }
  };

  const fetchSubCentres = async () => {
    try {
      const data = await adminAPI.getSubCentres();

      setSubCentres(data);
    } catch (error) {
      console.error("Error fetching sub centres:", error);
    }
  };

  const handleRegister = async () => {
    if (isSubmitting) return;

    const newErrors = {};

    if (!registerData.full_name) newErrors.full_name = "Full name is required";

    if (!registerData.mobile_number)
      newErrors.mobile_number = "Mobile number is required";

    // if (!registerData.aadhaar_number) newErrors.aadhaar_number = 'Aadhaar number is required';

    if (!registerData.husband_name)
      newErrors.husband_name = "Husband name is required";

    if (!registerData.age) newErrors.age = "Age is required";
    else if (parseInt(registerData.age) < 15)
      newErrors.age = "Age must be at least 15 years";

    // if (!registerData.abha_id) newErrors.abha_id = "ABHA ID is required";

    // if (!registerData.rch_id) newErrors.rch_id = "RCH ID is required";

    if (!registerData.district_id)
      newErrors.district_id = "District is required";

    if (!registerData.block_id) newErrors.block_id = "Block is required";

    if (!registerData.ward_id) newErrors.ward_id = "Village/Ward is required";

    if (!registerData.sub_centre_id)
      newErrors.sub_centre_id = "Sub-centre is required";

    if (!registerData.date_of_birth)
      newErrors.date_of_birth = "Date of birth is required";

    if (!registerData.lmp_date) newErrors.lmp_date = "LMP date is required";

    if (!registerData.edd_date) newErrors.edd_date = "EDD date is required";
    if (!registerData.address?.trim())
      newErrors.address = "Address is required";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      alert("Please fill all required fields");

      return;
    }

    try {
      const mobileValidation = validateMobileNumber(registerData.mobile_number);

      if (!mobileValidation.isValid) {
        setMobileError(mobileValidation.error);

        alert("Please enter a valid mobile number");

        return;
      }

      setIsSubmitting(true);

      const payload = {
        ...registerData,

        age: parseInt(registerData.age) || 0,

        gravida: parseInt(registerData.gravida) || 0,

        para: parseInt(registerData.para) || 0,

        ward_id: registerData.ward_id || null,

        sub_centre_id: parseInt(registerData.sub_centre_id) || 1,

        is_high_risk: registerData.is_high_risk,

        risk_factors: registerData.risk_factors || "None",

        is_self_registered: false,
      };

      await pregnantWomenAPI.registerPregnantWoman(payload);

      alert("Pregnant woman registered successfully");

      setShowRegisterModal(false);

      setRegisterData({
        full_name: "",
        mobile_number: "", // aadhaar_number: '', abha_id: '', rch_id: '', husband_name: '',

        age: "",
        ward_id: "",
        block_id: "",
        district_id: "",
        date_of_birth: "",

        lmp_date: "",
        edd_date: "",
        gravida: "",
        para: "",
        blood_group: "",

        address: "",
        hpr_id: "",
        sub_centre_id: "",
        is_high_risk: false,

        risk_factors: "",
      });

      setErrors({});

      refreshAll();
    } catch (error) {
      console.error("Error registering:", error);

      alert("Failed to register pregnant woman");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    const updatedAge = updateData.age || calcAge(updateData.date_of_birth);
    if (
      updatedAge !== null &&
      updatedAge !== undefined &&
      parseInt(updatedAge) < 15
    ) {
      alert("Age must be at least 15 years");
      return;
    }
    try {
      const mobileValidation = validateMobileNumber(updateData.mobile_number);

      if (!mobileValidation.isValid) {
        setUpdateMobileError(mobileValidation.error);

        alert("Please enter a valid mobile number");

        return;
      }

      await pregnantWomenAPI.updatePregnantWoman(selectedWoman.id, updateData);

      alert("Updated successfully");

      setShowUpdateModal(false);

      refreshAll();
    } catch (error) {
      console.error("Error updating:", error);

      alert("Failed to update");
    }
  };

  const handleApprove = async (id) => {
    try {
      await pregnantWomenAPI.approveRegistration(id);

      alert("Registration approved successfully");

      refreshAll();
    } catch (error) {
      console.error("Error approving:", error);

      alert("Failed to approve registration");
    }
  };

  const fetchPmsmaCentres = async (districtId, blockId) => {
    try {
      setLoadingPmsmaCentres(true);
      const res = await pmsmaAPI.getPMSMACentres(
        districtId || null,
        blockId || null,
        true,
      );
      setPmsmaCentres(Array.isArray(res) ? res : res.data || []);
    } catch (error) {
      console.error("Error fetching PMSMA centres:", error);
      setPmsmaCentres([]);
    } finally {
      setLoadingPmsmaCentres(false);
    }
  };

  const handleSchedulePMSMA = async (e) => {
    e.preventDefault();

    if (!selectedWoman) return;

    setPmsmaSubmitting(true);

    try {
      await pmsmaSessionAPI.scheduleSession({
        pregnant_woman_id: selectedWoman.id,

        scheduled_date: pmsmaScheduleData.scheduled_date,

        pmsma_centre_id: pmsmaScheduleData.pmsma_centre_id
          ? parseInt(pmsmaScheduleData.pmsma_centre_id, 10)
          : undefined,

        site: pmsmaScheduleData.pmsma_centre_id
          ? undefined
          : pmsmaScheduleData.site || undefined,
      });

      alert("PMSMA session scheduled successfully");

      setShowPMSMAModal(false);

      setPmsmaScheduleData({
        scheduled_date: "",
        site: "",
        pmsma_centre_id: "",
      });

      refreshAll();
    } catch (error) {
      console.error("Error scheduling PMSMA session:", error);

      alert(error.message || "Failed to schedule PMSMA session");
    } finally {
      setPmsmaSubmitting(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) {
      alert("Please select a file");

      return;
    }

    try {
      const result = await pregnantWomenAPI.bulkUpload(bulkFile);

      setBulkUploadResult(result);

      setShowBulkUploadModal(false);

      setShowBulkResultModal(true);

      setBulkFile(null);

      refreshAll();
    } catch (error) {
      console.error("Error bulk uploading:", error);

      alert(error?.message || "Failed to bulk upload");
    }
  };

  const handleDownloadFailedRowsCSV = (failedRows) => {
    if (!failedRows || failedRows.length === 0) return;

    const header = "Row Number,Full Name,Mobile Number,Error Reason";

    const rows = failedRows.map(
      (r) =>
        `${r.row_number},"${(r.full_name || "").replace(/"/g, '""')}","${(r.mobile_number || "").replace(/"/g, '""')}","${(r.error_reason || "").replace(/"/g, '""')}"`,
    );

    const csv = [header, ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    a.download = "bulk_upload_failed_rows.csv";

    document.body.appendChild(a);

    a.click();

    URL.revokeObjectURL(url);

    document.body.removeChild(a);
  };

  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem("access_token");

      const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

      const response = await fetch(
        `${API_BASE_URL}/api/v2/auth/download-bulk-upload-template`,
        {
          method: "GET",

          headers: {
            Accept: "application/json",

            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const blob = await response.blob();

        const url = window.URL.createObjectURL(blob);

        const a = document.createElement("a");

        a.href = url;

        a.download = "pregnant_women_bulk_upload_template.xlsx";

        document.body.appendChild(a);

        a.click();

        window.URL.revokeObjectURL(url);

        document.body.removeChild(a);
      } else {
        alert("Failed to download template");
      }
    } catch (error) {
      console.error("Error downloading template:", error);

      alert("Failed to download template");
    }
  };

  const handleSearch = async () => {
    // Search is now handled by backend via debouncedSearch — no manual trigger needed
  };

  const getCurrentData = () => pregnantWomen; // data already filtered by backend

  const filteredData = pregnantWomen; // search already applied by backend

  const getDistrictName = (id) =>
    districts.find((d) => d.id === id)?.name || "N/A";

  const getBlockName = (id) => blocks.find((b) => b.id === id)?.name || "N/A";

  const getWardName = (id) => wards.find((w) => w.id === id)?.name || "N/A";

  const getSubCentreName = (id) =>
    subCentres.find((s) => s.id === id)?.name || "N/A";

  // Smart pagination function to show only relevant page numbers

  // Calculate age from DOB string (YYYY-MM-DD or ISO). Avoids UTC offset issues.

  const calcAge = (dob) => {
    if (!dob) return null;

    const parts = String(dob).substring(0, 10).split("-");

    if (parts.length < 3) return null;

    const birth = new Date(
      parseInt(parts[0]),
      parseInt(parts[1]) - 1,
      parseInt(parts[2]),
    );

    const today = new Date();

    let age = today.getFullYear() - birth.getFullYear();

    const m = today.getMonth() - birth.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

    return age;
  };
  const calcGestationalAge = (lmp) => {
    if (!lmp) return null;
    const days = Math.floor((new Date() - new Date(lmp)) / 86400000);
    if (days < 0) return null;
    return `${Math.floor(days / 7)} weeks ${days % 7} days`;
  };

  const calcDaysRemaining = (edd) => {
    if (!edd) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(edd);
    target.setHours(0, 0, 0, 0);
    return Math.round((target - today) / 86400000);
  };
  const getStatusBadge = (woman) => {
    if (!woman.is_active) {
      return (
        <span className="px-24 py-4 rounded-pill fw-medium text-sm bg-neutral-200 text-neutral-600">
          Delivered
        </span>
      );
    }

    if (!woman.registration_approved) {
      return (
        <span className="px-24 py-4 rounded-pill fw-medium text-sm bg-warning-focus text-warning-main">
          Pending Approval
        </span>
      );
    }

    if (woman.is_high_risk) {
      return (
        <span className="px-24 py-4 rounded-pill fw-medium text-sm bg-danger-focus text-danger-main">
          High Risk
        </span>
      );
    }

    return (
      <span className="px-24 py-4 rounded-pill fw-medium text-sm bg-success-focus text-success-main">
        Active
      </span>
    );
  };

  const canRegister = ["district", "block", "sub_centre"].includes(userRole);

  const canBulkUpload = ["district", "block"].includes(userRole);

  // Pre-fills the register form from the signed-in user's location, then opens the modal
  const openRegisterModal = () => {
    if (userRole === "sub_centre" && currentUserInfo) {
      setRegisterData((prev) => ({
        ...prev,
        district_id: currentUserInfo.district_id || "",
        block_id: currentUserInfo.block_id || "",
        sub_centre_id: currentUserInfo.sub_centre_id || "",
      }));
      setDistrictSearch(currentUserInfo.district_name || "");
      setBlockSearch(currentUserInfo.block_name || "");
      setSubCentreSearch(currentUserInfo.sub_centre_name || "");
    } else if (userRole === "block" && currentUserInfo) {
      setRegisterData((prev) => ({
        ...prev,
        district_id: currentUserInfo.district_id || "",
        block_id: currentUserInfo.block_id || "",
        sub_centre_id: "",
      }));
      setDistrictSearch(currentUserInfo.district_name || "");
      setBlockSearch(currentUserInfo.block_name || "");
      setSubCentreSearch("");
    } else if (userRole === "district" && currentUserInfo) {
      setRegisterData((prev) => ({
        ...prev,
        district_id: currentUserInfo.district_id || "",
        block_id: "",
        sub_centre_id: "",
      }));
      setDistrictSearch(currentUserInfo.district_name || "");
      setBlockSearch("");
      setSubCentreSearch("");
    }
    setShowRegisterModal(true);
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
                        Total Registered
                      </span>

                      <h6 className="fw-semibold mb-1">{tabCounts.all}</h6>
                    </div>

                    <span className="w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-2xl mb-12 bg-primary-100 text-primary-600">
                      <Icon icon="material-symbols:pregnant-woman" />
                    </span>
                  </div>

                  <p className="text-sm mb-0">
                    <span className="bg-success-focus px-1 rounded-2 fw-medium text-success-main text-sm">
                      <Icon icon="ri:arrow-right-up-line" /> Active
                    </span>{" "}
                    Pregnant Women{" "}
                  </p>
                </div>
              </div>

              <div className="col-xxl-3 col-xl-4 col-sm-6">
                <div className="px-20 py-16 shadow-none radius-8 h-100 gradient-deep-2 left-line line-bg-lilac position-relative overflow-hidden">
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8">
                    <div>
                      <span className="mb-2 fw-medium text-secondary-light text-md">
                        Pending Approval
                      </span>

                      <h6 className="fw-semibold mb-1">{tabCounts.pending}</h6>
                    </div>

                    <span className="w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-2xl mb-12 bg-lilac-200 text-lilac-600">
                      <Icon icon="material-symbols:pending" />
                    </span>
                  </div>

                  <p className="text-sm mb-0">
                    <span className="bg-warning-focus px-1 rounded-2 fw-medium text-warning-main text-sm">
                      <Icon icon="ri:arrow-right-up-line" /> Pending
                    </span>{" "}
                    Awaiting Review{" "}
                  </p>
                </div>
              </div>

              <div className="col-xxl-3 col-xl-4 col-sm-6">
                <div className="px-20 py-16 shadow-none radius-8 h-100 bg-danger-100 left-line line-bg-danger position-relative overflow-hidden">
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8">
                    <div>
                      <span className="mb-2 fw-medium text-secondary-light text-md">
                        High Risk
                      </span>

                      <h6 className="fw-semibold mb-1">
                        {tabCounts.high_risk}
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
            </div>
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center gap-3">
        <h6 className="text-lg fw-semibold mb-0">Pregnant Women Management</h6>
        <span className="text-sm text-secondary-light fw-medium">
          ({totalCount} records)
        </span>
      </div>

      {/* Tabs and toolbar */}
      <div className="card-header border-bottom bg-base py-16 px-24">
        <ListTabs>
          <ListTab
            active={activeTab === "all"}
            onClick={() => {
              setActiveTab("all");
              setCurrentPage(1);
            }}
          >
            All Women ({tabCounts.all})
          </ListTab>
          <ListTab
            active={activeTab === "high_risk"}
            onClick={() => {
              setActiveTab("high_risk");
              setCurrentPage(1);
            }}
          >
            High Risk ({tabCounts.high_risk})
          </ListTab>
          <ListTab
            active={activeTab === "delivered"}
            onClick={() => {
              setActiveTab("delivered");
              setCurrentPage(1);
            }}
          >
            Delivered ({tabCounts.delivered})
          </ListTab>
        </ListTabs>
        <ListToolbar>
          <ToolbarLeft>
            <EntriesSelect
              value={itemsPerPage}
              onChange={(n) => {
                setItemsPerPage(n);
                setCurrentPage(1);
              }}
            />
            <SearchBox
              value={searchTerm}
              onChange={(v) => {
                setSearchTerm(v);
                setCurrentPage(1);
              }}
              placeholder="Search..."
              title="Search by name, mobile, RCH ID, ABHA ID"
            />
          </ToolbarLeft>
          <ToolbarRight>
            {canBulkUpload && (
              <BulkUploadButton onClick={() => setShowBulkUploadModal(true)} />
            )}
            {canRegister && (
              <AddButton onClick={openRegisterModal}>Register New</AddButton>
            )}
          </ToolbarRight>
        </ListToolbar>
      </div>

      {/* Data Table */}

      <div className="card-body p-24">
        {/* Data Table */}

        <div className="table-responsive scroll-sm">
          <table className="table bordered-table sm-table mb-0">
            <thead>
              <tr>
                <th scope="col">S.L</th>

                <th scope="col">Name</th>

                <th scope="col">Mobile</th>

                <th scope="col">Age</th>

                <th scope="col">Location</th>

                <th scope="col">Status</th>

                <th scope="col">Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-4">
                    Loading...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4">
                    No records found
                  </td>
                </tr>
              ) : (
                filteredData.map((woman, index) => (
                  <tr key={woman.id}>
                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>

                    <td>
                      <div className="d-flex align-items-center">
                        <div className="flex-grow-1">
                          <span className="text-md mb-0 fw-normal text-secondary-light">
                            {woman.full_name}
                          </span>

                          <span className="text-xs text-secondary-light fw-normal d-block">
                            Husband: {woman.husband_name}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>{woman.mobile_number}</td>

                    <td>
                      {calcAge(woman.date_of_birth) ?? (woman.age || "N/A")}
                    </td>

                    <td>
                      <div className="text-xs">
                        <div>
                          District: {getDistrictName(woman.district_id)}
                        </div>

                        <div>Block: {getBlockName(woman.block_id)}</div>

                        <div>Village/Ward: {getWardName(woman.ward_id)}</div>
                      </div>
                    </td>

                    <td>{getStatusBadge(woman)}</td>

                    <td>
                      <div className="d-flex align-items-center gap-10">
                        <button
                          className="bg-primary-50 text-primary-600 bg-hover-primary-100 text-hover-primary-800 w-32-px h-32-px d-flex justify-content-center align-items-center rounded-circle"
                          onClick={() => {
                            setSelectedWoman(woman);
                            setShowViewModal(true);
                          }}
                          title="View Details"
                        >
                          <Icon icon="iconamoon:eye-light" />
                        </button>

                        <button
                          className="bg-success-focus text-success-main bg-hover-success-200 w-32-px h-32-px d-flex justify-content-center align-items-center rounded-circle"
                          onClick={() => {
                            setSelectedWoman(woman);

                            setUpdateData({
                              full_name: woman.full_name,

                              husband_name: woman.husband_name,

                              mobile_number: woman.mobile_number,

                              abha_id: woman.abha_id,

                              rch_id: woman.rch_id,

                              date_of_birth: formatDateForInput(
                                woman.date_of_birth,
                              ),

                              lmp_date: formatDateForInput(woman.lmp_date),

                              edd_date: formatDateForInput(woman.edd_date),

                              age: calcAge(woman.date_of_birth) ?? woman.age,

                              address: woman.address,

                              ward_id: woman.ward_id,

                              block_id: woman.block_id,

                              district_id: woman.district_id,

                              sub_centre_id: woman.sub_centre_id,

                              gravida: woman.gravida,

                              para: woman.para,

                              blood_group: woman.blood_group,

                              is_high_risk: woman.is_high_risk,

                              risk_factors: woman.risk_factors,

                              hpr_id: woman.hpr_id,
                            });

                            setUpdateBlockSearch(
                              blocks.find((b) => b.id === woman.block_id)
                                ?.name || "",
                            );

                            setUpdateWardSearch(
                              wards.find((w) => w.id === woman.ward_id)?.name ||
                                "",
                            );

                            setShowUpdateModal(true);
                          }}
                          title="Edit Details"
                        >
                          <Icon icon="lucide:edit" />
                        </button>

                        {!woman.registration_approved && (
                          <button
                            className="bg-info-focus text-info-main bg-hover-info-200 w-32-px h-32-px d-flex justify-content-center align-items-center rounded-circle"
                            onClick={() => handleApprove(woman.id)}
                            title="Approve Registration"
                          >
                            <Icon icon="material-symbols:check" />
                          </button>
                        )}

                        {userRole === "sub_centre" &&
                          !woman.pregnancy_outcome && (
                            <button
                              className="bg-warning-focus text-warning-main bg-hover-warning-200 w-32-px h-32-px d-flex justify-content-center align-items-center rounded-circle"
                              onClick={() => {
                                setSelectedWoman(woman);
                                setPmsmaScheduleData({
                                  scheduled_date: "",
                                  site: "",
                                  pmsma_centre_id: "",
                                });
                                fetchPmsmaCentres(
                                  woman.district_id,
                                  woman.block_id,
                                );
                                setShowPMSMAModal(true);
                              }}
                              title="Schedule PMSMA"
                            >
                              <Icon icon="mdi:calendar-plus" />
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

        <TableFooter
          total={totalCount}
          page={currentPage}
          pageSize={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Register Modal */}

      {showRegisterModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Register Pregnant Woman</h5>

                <button
                  className="btn-close"
                  onClick={() => setShowRegisterModal(false)}
                ></button>
              </div>

              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">
                      Full Name <span className="text-danger">*</span>
                    </label>

                    <input
                      type="text"
                      className={`form-control ${errors.full_name ? "is-invalid" : ""}`}
                      value={registerData.full_name}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          full_name: e.target.value,
                        })
                      }
                    />

                    {errors.full_name && (
                      <div className="text-danger text-sm mt-1">
                        {errors.full_name}
                      </div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      Mobile Number <span className="text-danger">*</span>
                    </label>

                    <input
                      type="text"
                      className={`form-control ${mobileError || errors.mobile_number ? "is-invalid" : ""}`}
                      value={registerData.mobile_number}
                      onChange={(e) => {
                        const formatted = formatMobileNumberInput(
                          e.target.value,
                        );

                        setRegisterData({
                          ...registerData,
                          mobile_number: formatted,
                        });

                        if (formatted) {
                          const validation = validateMobileNumber(formatted);

                          setMobileError(
                            validation.isValid ? "" : validation.error,
                          );
                        } else {
                          setMobileError("");
                        }
                      }}
                      onBlur={() => {
                        if (registerData.mobile_number) {
                          const validation = validateMobileNumber(
                            registerData.mobile_number,
                          );

                          setMobileError(
                            validation.isValid ? "" : validation.error,
                          );
                        }
                      }}
                      maxLength="10"
                      placeholder="Enter 10-digit mobile number"
                    />

                    {(mobileError || errors.mobile_number) && (
                      <div className="text-danger text-sm mt-1">
                        {mobileError || errors.mobile_number}
                      </div>
                    )}
                  </div>

                  {/* <div className="col-md-6">

                                        <label className="form-label">Aadhaar Number <span className="text-danger">*</span></label>

                                        <input 

                                            type="text" 

                                            className={`form-control ${errors.aadhaar_number ? 'is-invalid' : ''}`}

                                            maxLength="12"

                                            placeholder="Enter 12-digit Aadhaar"

                                            value={registerData.aadhaar_number}

                                            onChange={(e) => setRegisterData({...registerData, aadhaar_number: e.target.value.replace(/\D/g, '')})}

                                        />

                                        {errors.aadhaar_number && <div className="text-danger text-sm mt-1">{errors.aadhaar_number}</div>}

                                    </div> */}

                  <div className="col-md-6">
                    <label className="form-label">
                      Husband Name <span className="text-danger">*</span>
                    </label>

                    <input
                      type="text"
                      className={`form-control ${errors.husband_name ? "is-invalid" : ""}`}
                      value={registerData.husband_name}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          husband_name: e.target.value,
                        })
                      }
                    />

                    {errors.husband_name && (
                      <div className="text-danger text-sm mt-1">
                        {errors.husband_name}
                      </div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      Date of Birth <span className="text-danger">*</span>
                    </label>

                    <input
                      type="date"
                      className={`form-control ${errors.date_of_birth ? "is-invalid" : ""}`}
                      value={registerData.date_of_birth}
                      onChange={(e) => {
                        const dob = e.target.value;

                        setRegisterData({
                          ...registerData,
                          date_of_birth: dob,
                        });

                        if (dob) {
                          const birthDate = new Date(dob);

                          const today = new Date();

                          let age =
                            today.getFullYear() - birthDate.getFullYear();

                          const monthDiff =
                            today.getMonth() - birthDate.getMonth();

                          if (
                            monthDiff < 0 ||
                            (monthDiff === 0 &&
                              today.getDate() < birthDate.getDate())
                          ) {
                            age--;
                          }

                          setRegisterData((prev) => ({
                            ...prev,
                            date_of_birth: dob,
                            age: age.toString(),
                          }));
                        }
                      }}
                    />

                    {errors.date_of_birth && (
                      <div className="text-danger text-sm mt-1">
                        {errors.date_of_birth}
                      </div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      Age <span className="text-danger">*</span>
                    </label>

                    <input
                      type="number"
                      className={`form-control ${errors.age ? "is-invalid" : ""}`}
                      value={registerData.age}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          age: e.target.value,
                        })
                      }
                      readOnly
                    />

                    {errors.age && (
                      <div className="text-danger text-sm mt-1">
                        {errors.age}
                      </div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">ABHA ID</label>

                    <input
                      type="text"
                      className={`form-control ${errors.abha_id ? "is-invalid" : ""}`}
                      value={registerData.abha_id}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          abha_id: e.target.value,
                        })
                      }
                    />

                    {errors.abha_id && (
                      <div className="text-danger text-sm mt-1">
                        {errors.abha_id}
                      </div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">RCH ID</label>

                    <input
                      type="text"
                      className={`form-control ${errors.rch_id ? "is-invalid" : ""}`}
                      value={registerData.rch_id}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          rch_id: e.target.value,
                        })
                      }
                    />

                    {errors.rch_id && (
                      <div className="text-danger text-sm mt-1">
                        {errors.rch_id}
                      </div>
                    )}
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">
                      District <span className="text-danger">*</span>
                    </label>

                    <div className="position-relative">
                      <div className="input-group">
                        <input
                          type="text"
                          className={`form-control ${errors.district_id ? "is-invalid" : ""}`}
                          placeholder="Search or select district..."
                          value={districtSearch}
                          onChange={(e) => {
                            setDistrictSearch(e.target.value);

                            setShowDistrictDropdown(true);
                          }}
                          onFocus={() => setShowDistrictDropdown(true)}
                          autoComplete="off"
                          disabled={userRole !== "district"}
                        />

                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() =>
                            setShowDistrictDropdown(!showDistrictDropdown)
                          }
                        >
                          <Icon
                            icon={
                              showDistrictDropdown
                                ? "solar:alt-arrow-up-bold"
                                : "solar:alt-arrow-down-bold"
                            }
                          />
                        </button>
                      </div>

                      {showDistrictDropdown && (
                        <div
                          className="card position-absolute w-100 mt-1 shadow border-0"
                          style={{ zIndex: 1050, maxHeight: "200px" }}
                        >
                          <div
                            className="list-group list-group-flush"
                            style={{ maxHeight: "200px", overflowY: "auto" }}
                          >
                            {districts

                              .filter(
                                (district) =>
                                  !districtSearch ||
                                  district.name
                                    ?.toLowerCase()
                                    .includes(districtSearch.toLowerCase()),
                              )

                              .map((district) => (
                                <button
                                  key={district.id}
                                  type="button"
                                  className="list-group-item list-group-item-action border-0 py-2 px-3 text-start"
                                  onClick={() => {
                                    setRegisterData({
                                      ...registerData,
                                      district_id: district.id,
                                    });

                                    setDistrictSearch(district.name);

                                    setShowDistrictDropdown(false);
                                  }}
                                >
                                  {district.name}
                                </button>
                              ))}

                            {districts.filter(
                              (district) =>
                                !districtSearch ||
                                district.name
                                  ?.toLowerCase()
                                  .includes(districtSearch.toLowerCase()),
                            ).length === 0 && (
                              <div className="list-group-item border-0 py-3 text-center text-muted">
                                <small>No districts found</small>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {errors.district_id && (
                      <div className="text-danger text-sm mt-1">
                        {errors.district_id}
                      </div>
                    )}
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">
                      Block <span className="text-danger">*</span>
                    </label>

                    <div className="position-relative">
                      <div className="input-group">
                        <input
                          type="text"
                          className={`form-control ${errors.block_id ? "is-invalid" : ""}`}
                          placeholder="Search or select block..."
                          value={blockSearch}
                          onChange={(e) => {
                            setBlockSearch(e.target.value);

                            setShowBlockDropdown(true);
                          }}
                          onFocus={() => setShowBlockDropdown(true)}
                          autoComplete="off"
                          disabled={["sub_centre", "block"].includes(userRole)}
                        />

                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() =>
                            setShowBlockDropdown(!showBlockDropdown)
                          }
                        >
                          <Icon
                            icon={
                              showBlockDropdown
                                ? "solar:alt-arrow-up-bold"
                                : "solar:alt-arrow-down-bold"
                            }
                          />
                        </button>
                      </div>

                      {showBlockDropdown && (
                        <div
                          className="card position-absolute w-100 mt-1 shadow border-0"
                          style={{ zIndex: 1050, maxHeight: "200px" }}
                        >
                          <div
                            className="list-group list-group-flush"
                            style={{ maxHeight: "200px", overflowY: "auto" }}
                          >
                            {visibleBlocks

                              .filter(
                                (block) =>
                                  !blockSearch ||
                                  block.name
                                    ?.toLowerCase()
                                    .includes(blockSearch.toLowerCase()),
                              )

                              .map((block) => (
                                <button
                                  key={block.id}
                                  type="button"
                                  className="list-group-item list-group-item-action border-0 py-2 px-3 text-start"
                                  onClick={() => {
                                    setRegisterData({
                                      ...registerData,
                                      block_id: block.id,
                                    });

                                    setBlockSearch(block.name);

                                    setShowBlockDropdown(false);
                                  }}
                                >
                                  {block.name}
                                </button>
                              ))}

                            {visibleBlocks.filter(
                              (block) =>
                                !blockSearch ||
                                block.name
                                  ?.toLowerCase()
                                  .includes(blockSearch.toLowerCase()),
                            ).length === 0 && (
                              <div className="list-group-item border-0 py-3 text-center text-muted">
                                <small>No blocks found</small>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {errors.block_id && (
                      <div className="text-danger text-sm mt-1">
                        {errors.block_id}
                      </div>
                    )}
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">
                      Village/Ward <span className="text-danger">*</span>
                    </label>

                    <div className="position-relative">
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Search or select ward..."
                          value={wardSearch}
                          onChange={(e) => {
                            setWardSearch(e.target.value);

                            setShowWardDropdown(true);
                          }}
                          onFocus={() => setShowWardDropdown(true)}
                          autoComplete="off"
                        />

                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setShowWardDropdown(!showWardDropdown)}
                        >
                          <Icon
                            icon={
                              showWardDropdown
                                ? "solar:alt-arrow-up-bold"
                                : "solar:alt-arrow-down-bold"
                            }
                          />
                        </button>
                      </div>

                      {showWardDropdown && registerData.block_id && (
                        <div
                          className="card position-absolute w-100 mt-1 shadow border-0"
                          style={{ zIndex: 1050, maxHeight: "200px" }}
                        >
                          <div
                            className="list-group list-group-flush"
                            style={{ maxHeight: "200px", overflowY: "auto" }}
                          >
                            {wards

                              .filter(
                                (ward) =>
                                  (!wardSearch ||
                                    ward.name
                                      ?.toLowerCase()
                                      .includes(wardSearch.toLowerCase())) &&
                                  ward.block_id === registerData.block_id &&
                                  (!assignedWardIds ||
                                    assignedWardIds.includes(Number(ward.id))),
                              )

                              .map((ward) => (
                                <button
                                  key={ward.id}
                                  type="button"
                                  className="list-group-item list-group-item-action border-0 py-2 px-3 text-start"
                                  onClick={() => {
                                    setRegisterData({
                                      ...registerData,
                                      ward_id: ward.id,
                                    });

                                    setWardSearch(ward.name);

                                    setShowWardDropdown(false);
                                  }}
                                >
                                  {ward.name}
                                </button>
                              ))}

                            {wards.filter(
                              (ward) =>
                                (!wardSearch ||
                                  ward.name
                                    ?.toLowerCase()
                                    .includes(wardSearch.toLowerCase())) &&
                                ward.block_id === registerData.block_id,
                            ).length === 0 && (
                              <div className="list-group-item border-0 py-3 text-center text-muted">
                                <small>
                                  No Village/Wards found for selected block
                                </small>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {errors.ward_id && (
                      <div className="text-danger text-sm mt-1">
                        {errors.ward_id}
                      </div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">HPR ID</label>

                    <input
                      type="text"
                      className="form-control"
                      value={registerData.hpr_id}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          hpr_id: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      LMP Date <span className="text-danger">*</span>
                    </label>

                    <input
                      type="date"
                      className={`form-control ${errors.lmp_date ? "is-invalid" : ""}`}
                      value={registerData.lmp_date}
                      onChange={(e) => {
                        const lmp = e.target.value;

                        const updates = { lmp_date: lmp };

                        if (lmp) {
                          const d = new Date(lmp);

                          d.setMonth(d.getMonth() + 9);

                          d.setDate(d.getDate() + 9);

                          updates.edd_date = d.toISOString().split("T")[0];
                        }

                        setRegisterData((prev) => ({ ...prev, ...updates }));
                      }}
                    />

                    {errors.lmp_date && (
                      <div className="text-danger text-sm mt-1">
                        {errors.lmp_date}
                      </div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      EDD Date <span className="text-danger">*</span>
                    </label>

                    <input
                      type="date"
                      className={`form-control ${errors.edd_date ? "is-invalid" : ""}`}
                      // value={registerData.edd_date}
                      // onChange={(e) =>
                      //   setRegisterData({
                      //     ...registerData,
                      //     edd_date: e.target.value,
                      //   })
                      // }
                      value={registerData.edd_date}
                      readOnly
                    />

                    {errors.edd_date && (
                      <div className="text-danger text-sm mt-1">
                        {errors?.edd_date}
                      </div>
                    )}
                  </div>

                  {/* <div className="col-md-6">
                    <span className="text-secondary-light fw-medium">
                      Gestational Age
                    </span>
                    <br />
                    <span className="ms-12 fw-semibold text-neutral-600">
                      {calcGestationalAge(registerData?.lmp_date) || "N/A"}
                    </span>
                  </div> */}

                  <div className="col-md-6">
                    <label className="form-label">Gestational Age</label>
                    <input
                      type="text"
                      className="form-control"
                      value={
                        calcGestationalAge(registerData.lmp_date) ||
                        "Select LMP date"
                      }
                      readOnly
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">
                      Sub Centre <span className="text-danger">*</span>
                    </label>

                    <div className="position-relative">
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          placeholder={
                            !registerData.block_id
                              ? "Select Block first"
                              : subCentres.filter(
                                    (sc) =>
                                      sc.block_id === registerData.block_id,
                                  ).length === 0
                                ? "No sub-center available"
                                : "Search or select sub centre..."
                          }
                          value={subCentreSearch}
                          onChange={(e) => {
                            setSubCentreSearch(e.target.value);

                            setShowSubCentreDropdown(true);
                          }}
                          onFocus={() => setShowSubCentreDropdown(true)}
                          disabled={
                            userRole === "sub_centre" ||
                            (registerData.block_id &&
                              subCentres.filter(
                                (sc) => sc.block_id === registerData.block_id,
                              ).length === 0)
                          }
                          autoComplete="off"
                        />

                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() =>
                            setShowSubCentreDropdown(!showSubCentreDropdown)
                          }
                          disabled={
                            userRole === "sub_centre" ||
                            (registerData.block_id &&
                              subCentres.filter(
                                (sc) => sc.block_id === registerData.block_id,
                              ).length === 0)
                          }
                        >
                          <Icon
                            icon={
                              showSubCentreDropdown
                                ? "solar:alt-arrow-up-bold"
                                : "solar:alt-arrow-down-bold"
                            }
                          />
                        </button>
                      </div>

                      {registerData.block_id &&
                        subCentres.filter(
                          (sc) => sc.block_id === registerData.block_id,
                        ).length === 0 && (
                          <div className="d-flex align-items-center gap-2 mt-2">
                            <Icon
                              icon="mdi:information-outline"
                              className="text-danger"
                            />

                            <small className="text-danger">
                              No sub-center found for the selected block
                            </small>
                          </div>
                        )}

                      {showSubCentreDropdown && registerData.block_id && (
                        <div
                          className="card position-absolute w-100 mt-1 shadow border-0"
                          style={{ zIndex: 1050, maxHeight: "200px" }}
                        >
                          <div
                            className="list-group list-group-flush"
                            style={{ maxHeight: "200px", overflowY: "auto" }}
                          >
                            {subCentres

                              .filter(
                                (subCentre) =>
                                  (!subCentreSearch ||
                                    subCentre.name
                                      ?.toLowerCase()
                                      .includes(
                                        subCentreSearch.toLowerCase(),
                                      )) &&
                                  subCentre.block_id === registerData.block_id,
                              )

                              .map((subCentre) => (
                                <button
                                  key={subCentre.id}
                                  type="button"
                                  className="list-group-item list-group-item-action border-0 py-2 px-3 text-start"
                                  onClick={() => {
                                    setRegisterData({
                                      ...registerData,
                                      sub_centre_id: subCentre.id,
                                    });

                                    setSubCentreSearch(subCentre.name);

                                    setShowSubCentreDropdown(false);
                                  }}
                                >
                                  {subCentre.name}
                                </button>
                              ))}

                            {subCentres.filter(
                              (subCentre) =>
                                (!subCentreSearch ||
                                  subCentre.name
                                    ?.toLowerCase()
                                    .includes(subCentreSearch.toLowerCase())) &&
                                subCentre.block_id === registerData.block_id,
                            ).length === 0 && (
                              <div className="list-group-item border-0 py-3 text-center text-muted">
                                <small>
                                  No sub centres found for selected block
                                </small>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {errors.sub_centre_id && (
                      <div className="text-danger text-sm mt-1">
                        {errors.sub_centre_id}
                      </div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Risk Factors</label>

                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="Enter risk factors or 'None'"
                      value={registerData.risk_factors}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          risk_factors: e.target.value,
                        })
                      }
                    ></textarea>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Gravida</label>

                    <input
                      type="number"
                      className="form-control"
                      value={registerData.gravida}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          gravida: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Para</label>

                    <input
                      type="number"
                      className="form-control"
                      value={registerData.para}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          para: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Blood Group</label>

                    <select
                      className="form-select"
                      value={registerData.blood_group}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          blood_group: e.target.value,
                        })
                      }
                    >
                      <option value="">Select Blood Group</option>

                      <option value="A+">A+</option>

                      <option value="A-">A-</option>

                      <option value="B+">B+</option>

                      <option value="B-">B-</option>

                      <option value="AB+">AB+</option>

                      <option value="AB-">AB-</option>

                      <option value="O+">O+</option>

                      <option value="O-">O-</option>
                    </select>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">High Risk Status</label>

                    <select
                      className="form-select"
                      value={registerData.is_high_risk}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          is_high_risk: e.target.value === "true",
                        })
                      }
                    >
                      <option value={false}>Normal</option>

                      <option value={true}>High Risk</option>
                    </select>
                  </div>

                  <div className="col-12">
                    <label className="form-label">
                      Address <span className="text-danger">*</span>
                    </label>

                    <textarea
                      className="form-control"
                      rows="2"
                      value={registerData.address}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          address: e.target.value,
                        })
                      }
                    ></textarea>
                    {errors.address && (
                      <div className="text-danger text-sm mt-1">
                        {errors.address}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer d-flex justify-content-center">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowRegisterModal(false)}
                >
                  Cancel
                </button>

                <button
                  className="btn btn-primary"
                  onClick={handleRegister}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Registering..." : "Register"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}

      {showBulkUploadModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Bulk Upload Pregnant Women</h5>

                <button
                  className="btn-close"
                  onClick={() => setShowBulkUploadModal(false)}
                ></button>
              </div>

              <div className="modal-body">
                <div className="mb-3">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <label className="form-label mb-0">Excel Template</label>

                    <button
                      className="btn btn-outline-success btn-sm radius-8 d-flex align-items-center gap-2"
                      onClick={handleDownloadTemplate}
                    >
                      <Icon
                        icon="material-symbols:download"
                        className="text-lg"
                      />
                      Download Template
                    </button>
                  </div>

                  <div className="form-text text-secondary-light mb-4">
                    Download the Excel template first, fill it with data, then
                    upload
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Select Excel File</label>

                  <div
                    className="rounded p-40 text-center position-relative"
                    style={{
                      border: "2px dashed #8B4513",

                      backgroundColor: "transparent",

                      minHeight: "180px",

                      display: "flex",

                      flexDirection: "column",

                      alignItems: "center",

                      justifyContent: "center",

                      borderRadius: "8px",
                    }}
                  >
                    {!bulkFile ? (
                      <>
                        <div className="mb-12">
                          <Icon
                            icon="material-symbols:cloud-upload"
                            style={{
                              fontSize: "80px",

                              color: "#6B7280",
                            }}
                          />
                        </div>

                        <h6
                          className="mb-4"
                          style={{
                            color: "#6B7280",
                            fontSize: "16px",
                            fontWeight: "500",
                          }}
                        >
                          Drag and drop your File here
                        </h6>

                        <p
                          className="mb-8"
                          style={{ color: "#9CA3AF", fontSize: "14px" }}
                        >
                          or click to browse
                        </p>

                        <p
                          className="mb-0"
                          style={{ color: "#9CA3AF", fontSize: "14px" }}
                        >
                          Upload Excel file with pregnant women data
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="mb-12">
                          <Icon
                            icon="material-symbols:check-circle"
                            style={{
                              fontSize: "80px",

                              color: "#10B981",
                            }}
                          />
                        </div>

                        <h6
                          className="mb-4"
                          style={{
                            color: "#10B981",
                            fontSize: "16px",
                            fontWeight: "500",
                          }}
                        >
                          File Selected
                        </h6>

                        <p
                          className="mb-0"
                          style={{ color: "#6B7280", fontSize: "14px" }}
                        >
                          {bulkFile.name}
                        </p>
                      </>
                    )}

                    <input
                      type="file"
                      className="position-absolute w-100 h-100 opacity-0"
                      style={{ cursor: "pointer", top: 0, left: 0 }}
                      accept=".xlsx,.xls"
                      onChange={(e) => setBulkFile(e.target.files[0])}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer d-flex justify-content-center">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowBulkUploadModal(false)}
                >
                  Cancel
                </button>

                <button className="btn btn-primary" onClick={handleBulkUpload}>
                  Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}

      {showViewModal && selectedWoman && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">View Pregnant Woman Details</h5>

                <button
                  className="btn-close"
                  onClick={() => setShowViewModal(false)}
                ></button>
              </div>

              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="p-16 radius-8 bg-neutral-50">
                      <span className="text-secondary-light fw-medium">
                        Full Name :
                      </span>

                      <span className="ms-12 fw-semibold text-neutral-600">
                        {selectedWoman.full_name}
                      </span>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="p-16 radius-8 bg-neutral-50">
                      <span className="text-secondary-light fw-medium">
                        Mobile Number :
                      </span>

                      <span className="ms-12 fw-semibold text-neutral-600">
                        {selectedWoman.mobile_number}
                      </span>
                    </div>
                  </div>

                  {/* <div className="col-md-6">

                                        <div className="p-16 radius-8 bg-neutral-50">

                                            <span className="text-secondary-light fw-medium">Aadhaar Number :</span>

                                            <span className="ms-12 fw-semibold text-neutral-600">{selectedWoman.aadhaar_masked || 'N/A'}</span>

                                        </div>

                                    </div> */}

                  <div className="col-md-6">
                    <div className="p-16 radius-8 bg-neutral-50">
                      <span className="text-secondary-light fw-medium">
                        Husband Name :
                      </span>

                      <span className="ms-12 fw-semibold text-neutral-600">
                        {selectedWoman.husband_name || "N/A"}
                      </span>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="p-16 radius-8 bg-neutral-50">
                      <span className="text-secondary-light fw-medium">
                        Date of Birth :
                      </span>

                      <span className="ms-12 fw-semibold text-neutral-600">
                        {formatDate(selectedWoman.date_of_birth) || "N/A"}
                      </span>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="p-16 radius-8 bg-neutral-50">
                      <span className="text-secondary-light fw-medium">
                        Age :
                      </span>

                      <span className="ms-12 fw-semibold text-neutral-600">
                        {calcAge(selectedWoman.date_of_birth) ??
                          (selectedWoman.age || "N/A")}
                      </span>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="p-16 radius-8 bg-neutral-50">
                      <span className="text-secondary-light fw-medium">
                        ABHA ID :
                      </span>

                      <span className="ms-12 fw-semibold text-neutral-600">
                        {selectedWoman.abha_id || "N/A"}
                      </span>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="p-16 radius-8 bg-neutral-50">
                      <span className="text-secondary-light fw-medium">
                        RCH ID :
                      </span>

                      <span className="ms-12 fw-semibold text-neutral-600">
                        {selectedWoman.rch_id || "N/A"}
                      </span>
                    </div>
                  </div>

                  <div className="col-12 mb-16">
                    <div className="row g-3">
                      <div className="col-md-4">
                        <div className="text-center">
                          <div className="text-secondary-light fw-medium mb-8">
                            District
                          </div>

                          <div className="p-16 radius-8 bg-neutral-50">
                            <span className="fw-semibold text-neutral-600">
                              {getDistrictName(selectedWoman.district_id)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="col-md-4">
                        <div className="text-center">
                          <div className="text-secondary-light fw-medium mb-8">
                            Block
                          </div>

                          <div className="p-16 radius-8 bg-neutral-50">
                            <span className="fw-semibold text-neutral-600">
                              {getBlockName(selectedWoman.block_id)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="col-md-4">
                        <div className="text-center">
                          <div className="text-secondary-light fw-medium mb-8">
                            Village/Ward
                          </div>

                          <div className="p-16 radius-8 bg-neutral-50">
                            <span className="fw-semibold text-neutral-600">
                              {getWardName(selectedWoman.ward_id)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="p-16 radius-8 bg-neutral-50">
                      <span className="text-secondary-light fw-medium">
                        LMP Date :
                      </span>

                      <span className="ms-12 fw-semibold text-neutral-600">
                        {formatDate(selectedWoman.lmp_date)}
                      </span>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="p-16 radius-8 bg-neutral-50">
                      <span className="text-secondary-light fw-medium">
                        EDD Date :
                      </span>

                      <span className="ms-12 fw-semibold text-neutral-600">
                        {formatDate(selectedWoman.edd_date)}
                      </span>
                    </div>
                  </div>

                  <div className="col-12 mb-16">
                    <div className="row g-3">
                      <div className="col-md-4">
                        <div className="text-center">
                          <div className="text-secondary-light fw-medium mb-8">
                            Gravida
                          </div>

                          <div className="p-16 radius-8 bg-neutral-50">
                            <span className="fw-semibold text-neutral-600">
                              {selectedWoman.gravida || "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="col-md-4">
                        <div className="text-center">
                          <div className="text-secondary-light fw-medium mb-8">
                            Para
                          </div>

                          <div className="p-16 radius-8 bg-neutral-50">
                            <span className="fw-semibold text-neutral-600">
                              {selectedWoman.para || "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="col-md-4">
                        <div className="text-center">
                          <div className="text-secondary-light fw-medium mb-8">
                            Blood Group
                          </div>

                          <div className="p-16 radius-8 bg-neutral-50">
                            <span className="fw-semibold text-neutral-600">
                              {selectedWoman.blood_group || "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-12">
                    <div className="p-16 radius-8 bg-neutral-50">
                      <span className="text-secondary-light fw-medium">
                        Address :
                      </span>

                      <span className="ms-12 fw-semibold text-neutral-600">
                        {selectedWoman.address || "N/A"}
                      </span>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="p-16 radius-8 bg-neutral-50">
                      <span className="text-secondary-light fw-medium">
                        Registration Status :
                      </span>

                      <span className="ms-12">
                        {getStatusBadge(selectedWoman)}
                      </span>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="p-16 radius-8 bg-neutral-50">
                      <span className="text-secondary-light fw-medium">
                        Registration Date :
                      </span>

                      <span className="ms-12 fw-semibold text-neutral-600">
                        {formatDate(selectedWoman.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer d-flex justify-content-center">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowViewModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Modal */}

      {showUpdateModal && selectedWoman && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Update Pregnant Woman</h5>

                <button
                  className="btn-close"
                  onClick={() => setShowUpdateModal(false)}
                ></button>
              </div>

              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Full Name</label>

                    <input
                      type="text"
                      className="form-control"
                      value={updateData.full_name || ""}
                      onChange={(e) =>
                        setUpdateData({
                          ...updateData,
                          full_name: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Mobile Number</label>

                    <input
                      type="text"
                      className={`form-control ${updateMobileError ? "is-invalid" : ""}`}
                      value={updateData.mobile_number || ""}
                      onChange={(e) => {
                        const formatted = formatMobileNumberInput(
                          e.target.value,
                        );

                        setUpdateData({
                          ...updateData,
                          mobile_number: formatted,
                        });

                        if (formatted) {
                          const validation = validateMobileNumber(formatted);

                          setUpdateMobileError(
                            validation.isValid ? "" : validation.error,
                          );
                        } else {
                          setUpdateMobileError("");
                        }
                      }}
                      onBlur={() => {
                        if (updateData.mobile_number) {
                          const validation = validateMobileNumber(
                            updateData.mobile_number,
                          );

                          setUpdateMobileError(
                            validation.isValid ? "" : validation.error,
                          );
                        }
                      }}
                      maxLength="10"
                      placeholder="Enter 10-digit mobile number"
                    />

                    {updateMobileError && (
                      <div className="text-danger text-sm mt-1">
                        {updateMobileError}
                      </div>
                    )}
                  </div>

                  {/* <div className="col-md-6">

                                        <label className="form-label">Aadhaar Number</label>

                                        <input 

                                            type="text" 

                                            className="form-control" 

                                            maxLength="12"

                                            placeholder="Enter new 12-digit Aadhaar to update"

                                            value={updateData.aadhaar_number || ''}

                                            onChange={(e) => setUpdateData({...updateData, aadhaar_number: e.target.value.replace(/\D/g, '')})}

                                        />

                                    </div> */}

                  <div className="col-md-6">
                    <label className="form-label">Husband Name</label>

                    <input
                      type="text"
                      className="form-control"
                      value={updateData.husband_name || ""}
                      onChange={(e) =>
                        setUpdateData({
                          ...updateData,
                          husband_name: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Date of Birth</label>

                    <input
                      type="date"
                      className="form-control"
                      value={updateData.date_of_birth || ""}
                      onChange={(e) => {
                        const dob = e.target.value;

                        const computed = calcAge(dob);

                        setUpdateData((prev) => ({
                          ...prev,
                          date_of_birth: dob,
                          ...(computed !== null ? { age: computed } : {}),
                        }));
                      }}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Age (auto-calculated)</label>

                    <input
                      type="number"
                      className="form-control"
                      value={updateData.age || ""}
                      readOnly
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">ABHA ID</label>

                    <input
                      type="text"
                      className="form-control"
                      value={updateData.abha_id || ""}
                      onChange={(e) =>
                        setUpdateData({
                          ...updateData,
                          abha_id: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">RCH ID</label>

                    <input
                      type="text"
                      className="form-control"
                      value={updateData.rch_id || ""}
                      onChange={(e) =>
                        setUpdateData({ ...updateData, rch_id: e.target.value })
                      }
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Block</label>

                    <div className="position-relative">
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Search or select block..."
                          value={updateBlockSearch}
                          onChange={(e) => {
                            setUpdateBlockSearch(e.target.value);
                            setShowUpdateBlockDropdown(true);
                          }}
                          onFocus={() => setShowUpdateBlockDropdown(true)}
                          autoComplete="off"
                          disabled={userRole !== "district"}
                        />

                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() =>
                            setShowUpdateBlockDropdown(!showUpdateBlockDropdown)
                          }
                          disabled={userRole !== "district"}
                        >
                          <Icon
                            icon={
                              showUpdateBlockDropdown
                                ? "solar:alt-arrow-up-bold"
                                : "solar:alt-arrow-down-bold"
                            }
                          />
                        </button>
                      </div>

                      {showUpdateBlockDropdown && (
                        <div
                          className="card position-absolute w-100 mt-1 shadow border-0"
                          style={{ zIndex: 1050, maxHeight: "200px" }}
                        >
                          <div
                            className="list-group list-group-flush"
                            style={{ maxHeight: "200px", overflowY: "auto" }}
                          >
                            {blocks

                              .filter(
                                (b) =>
                                  !updateBlockSearch ||
                                  b.name
                                    ?.toLowerCase()
                                    .includes(updateBlockSearch.toLowerCase()),
                              )

                              .map((b) => (
                                <button
                                  key={b.id}
                                  type="button"
                                  className="list-group-item list-group-item-action border-0 py-2 px-3 text-start"
                                  onClick={() => {
                                    setUpdateData((prev) => ({
                                      ...prev,
                                      block_id: b.id,
                                      ward_id: null,
                                    }));

                                    setUpdateBlockSearch(b.name);

                                    setUpdateWardSearch("");

                                    setShowUpdateBlockDropdown(false);
                                  }}
                                >
                                  {b.name}
                                </button>
                              ))}

                            {blocks.filter(
                              (b) =>
                                !updateBlockSearch ||
                                b.name
                                  ?.toLowerCase()
                                  .includes(updateBlockSearch.toLowerCase()),
                            ).length === 0 && (
                              <div className="list-group-item border-0 py-3 text-center text-muted">
                                <small>No blocks found</small>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Village/Ward</label>

                    <div className="position-relative">
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          placeholder={
                            !updateData.block_id
                              ? "Select Block first"
                              : "Search or select ward..."
                          }
                          value={updateWardSearch}
                          onChange={(e) => {
                            setUpdateWardSearch(e.target.value);
                            setShowUpdateWardDropdown(true);
                          }}
                          onFocus={() => setShowUpdateWardDropdown(true)}
                          autoComplete="off"
                          disabled={userRole !== "district"}
                        />

                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() =>
                            setShowUpdateWardDropdown(!showUpdateWardDropdown)
                          }
                          disabled={userRole !== "district"}
                        >
                          <Icon
                            icon={
                              showUpdateWardDropdown
                                ? "solar:alt-arrow-up-bold"
                                : "solar:alt-arrow-down-bold"
                            }
                          />
                        </button>
                      </div>

                      {showUpdateWardDropdown && updateData.block_id && (
                        <div
                          className="card position-absolute w-100 mt-1 shadow border-0"
                          style={{ zIndex: 1050, maxHeight: "200px" }}
                        >
                          <div
                            className="list-group list-group-flush"
                            style={{ maxHeight: "200px", overflowY: "auto" }}
                          >
                            {wards

                              .filter(
                                (w) =>
                                  (!updateWardSearch ||
                                    w.name
                                      ?.toLowerCase()
                                      .includes(
                                        updateWardSearch.toLowerCase(),
                                      )) &&
                                  w.block_id === updateData.block_id,
                              )

                              .map((w) => (
                                <button
                                  key={w.id}
                                  type="button"
                                  className="list-group-item list-group-item-action border-0 py-2 px-3 text-start"
                                  onClick={() => {
                                    setUpdateData((prev) => ({
                                      ...prev,
                                      ward_id: w.id,
                                    }));

                                    setUpdateWardSearch(w.name);

                                    setShowUpdateWardDropdown(false);
                                  }}
                                >
                                  {w.name}
                                </button>
                              ))}

                            {wards.filter(
                              (w) =>
                                (!updateWardSearch ||
                                  w.name
                                    ?.toLowerCase()
                                    .includes(
                                      updateWardSearch.toLowerCase(),
                                    )) &&
                                w.block_id === updateData.block_id,
                            ).length === 0 && (
                              <div className="list-group-item border-0 py-3 text-center text-muted">
                                <small>
                                  No Village/Wards found for selected block
                                </small>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">LMP Date</label>

                    <input
                      type="date"
                      className="form-control"
                      value={updateData.lmp_date || ""}
                      onChange={(e) => {
                        const lmp = e.target.value;

                        const updates = { lmp_date: lmp };

                        if (lmp) {
                          const d = new Date(lmp);

                          d.setMonth(d.getMonth() + 9);

                          d.setDate(d.getDate() + 9);

                          updates.edd_date = d.toISOString().split("T")[0];
                        }

                        setUpdateData((prev) => ({ ...prev, ...updates }));
                      }}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">EDD Date</label>

                    <input
                      type="date"
                      className="form-control"
                      value={updateData.edd_date || ""}
                      onChange={(e) =>
                        setUpdateData({
                          ...updateData,
                          edd_date: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Gravida</label>

                    <input
                      type="number"
                      className="form-control"
                      value={updateData.gravida || ""}
                      onChange={(e) =>
                        setUpdateData({
                          ...updateData,
                          gravida: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Para</label>

                    <input
                      type="number"
                      className="form-control"
                      value={updateData.para || ""}
                      onChange={(e) =>
                        setUpdateData({ ...updateData, para: e.target.value })
                      }
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Blood Group</label>

                    <select
                      className="form-select"
                      value={updateData.blood_group || ""}
                      onChange={(e) =>
                        setUpdateData({
                          ...updateData,
                          blood_group: e.target.value,
                        })
                      }
                    >
                      <option value="">Select Blood Group</option>

                      <option value="A+">A+</option>

                      <option value="A-">A-</option>

                      <option value="B+">B+</option>

                      <option value="B-">B-</option>

                      <option value="AB+">AB+</option>

                      <option value="AB-">AB-</option>

                      <option value="O+">O+</option>

                      <option value="O-">O-</option>
                    </select>
                  </div>

                  <div className="col-12">
                    <label className="form-label">Address</label>

                    <textarea
                      className="form-control"
                      rows="2"
                      value={updateData.address || ""}
                      onChange={(e) =>
                        setUpdateData({
                          ...updateData,
                          address: e.target.value,
                        })
                      }
                    ></textarea>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">High Risk Status</label>

                    <select
                      className="form-select"
                      value={updateData.is_high_risk || false}
                      onChange={(e) =>
                        setUpdateData({
                          ...updateData,
                          is_high_risk: e.target.value === "true",
                        })
                      }
                    >
                      <option value={false}>Normal</option>

                      <option value={true}>High Risk</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer d-flex justify-content-center">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowUpdateModal(false)}
                >
                  Cancel
                </button>

                <button className="btn btn-primary" onClick={handleUpdate}>
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Result Modal */}

      {showBulkResultModal && bulkUploadResult && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title d-flex align-items-center gap-2">
                  <Icon
                    icon="material-symbols:upload-file"
                    className="text-primary-600"
                  />
                  Bulk Upload Result
                </h5>

                <button
                  className="btn-close"
                  onClick={() => setShowBulkResultModal(false)}
                ></button>
              </div>

              <div className="modal-body">
                {/* Summary Cards */}

                <div className="row g-3 mb-20">
                  <div className="col-6 col-md-3">
                    <div className="p-16 radius-8 text-center bg-neutral-50">
                      <h4 className="fw-bold text-primary-600 mb-4">
                        {bulkUploadResult.total_records}
                      </h4>

                      <span className="text-sm text-secondary-light">
                        Total
                      </span>
                    </div>
                  </div>

                  <div className="col-6 col-md-3">
                    <div className="p-16 radius-8 text-center bg-success-50">
                      <h4 className="fw-bold text-success-main mb-4">
                        {bulkUploadResult.successful}
                      </h4>

                      <span className="text-sm text-secondary-light">
                        Successful
                      </span>
                    </div>
                  </div>

                  <div className="col-6 col-md-3">
                    <div className="p-16 radius-8 text-center bg-danger-50">
                      <h4 className="fw-bold text-danger-main mb-4">
                        {bulkUploadResult.failed}
                      </h4>

                      <span className="text-sm text-secondary-light">
                        Failed
                      </span>
                    </div>
                  </div>

                  <div className="col-6 col-md-3">
                    <div className="p-16 radius-8 text-center bg-warning-50">
                      <h4 className="fw-bold text-warning-main mb-4">
                        {bulkUploadResult.duplicate}
                      </h4>

                      <span className="text-sm text-secondary-light">
                        Duplicate
                      </span>
                    </div>
                  </div>
                </div>

                {/* Failed Rows Section */}

                {bulkUploadResult.failed_rows &&
                bulkUploadResult.failed_rows.length > 0 ? (
                  <>
                    <div className="d-flex align-items-center justify-content-between mb-12">
                      <h6 className="fw-semibold text-danger-main d-flex align-items-center gap-2 mb-0">
                        <Icon icon="material-symbols:error-outline" />
                        Failed Rows ({bulkUploadResult.failed_rows.length})
                      </h6>

                      <button
                        className="btn btn-outline-danger btn-sm d-flex align-items-center gap-2"
                        onClick={() =>
                          handleDownloadFailedRowsCSV(
                            bulkUploadResult.failed_rows,
                          )
                        }
                      >
                        <Icon icon="material-symbols:download" />
                        Download CSV
                      </button>
                    </div>

                    <div
                      className="table-responsive"
                      style={{ maxHeight: "300px", overflowY: "auto" }}
                    >
                      <table
                        className="table table-bordered table-sm mb-0"
                        style={{ fontSize: "13px" }}
                      >
                        <thead
                          style={{
                            position: "sticky",
                            top: 0,
                            background: "#f8f9fa",
                            zIndex: 1,
                          }}
                        >
                          <tr>
                            <th style={{ width: "70px" }}>Row #</th>

                            <th>Full Name</th>

                            <th>Mobile</th>

                            <th>Error Reason</th>
                          </tr>
                        </thead>

                        <tbody>
                          {bulkUploadResult.failed_rows.map((row, i) => (
                            <tr key={i} style={{ backgroundColor: "#fff5f5" }}>
                              <td className="fw-semibold text-center">
                                {row.row_number}
                              </td>

                              <td>
                                {row.full_name || (
                                  <span className="text-secondary-light">
                                    —
                                  </span>
                                )}
                              </td>

                              <td>
                                {row.mobile_number || (
                                  <span className="text-secondary-light">
                                    —
                                  </span>
                                )}
                              </td>

                              <td className="text-danger-main">
                                {row.error_reason}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-16">
                    <Icon
                      icon="material-symbols:check-circle"
                      className="text-success-main"
                      style={{ fontSize: "48px" }}
                    />

                    <p className="text-success-main fw-semibold mt-8 mb-0">
                      All records uploaded successfully!
                    </p>
                  </div>
                )}
              </div>

              <div className="modal-footer d-flex justify-content-center">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowBulkResultModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPMSMAModal && selectedWoman && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Schedule PMSMA — {selectedWoman.full_name}
                </h5>

                <button
                  className="btn-close"
                  onClick={() => setShowPMSMAModal(false)}
                ></button>
              </div>

              <form onSubmit={handleSchedulePMSMA}>
                <div className="modal-body">
                  <div className="mb-16">
                    <label className="form-label">
                      Scheduled Date & Time{" "}
                      <span className="text-danger-600">*</span>
                    </label>

                    <input
                      type="datetime-local"
                      className="form-control"
                      value={pmsmaScheduleData.scheduled_date}
                      onChange={(e) =>
                        setPmsmaScheduleData({
                          ...pmsmaScheduleData,
                          scheduled_date: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="mb-0">
                    <label className="form-label">PMSMA Centre (Site)</label>

                    <select
                      className="form-select"
                      value={pmsmaScheduleData.pmsma_centre_id}
                      onChange={(e) =>
                        setPmsmaScheduleData({
                          ...pmsmaScheduleData,
                          pmsma_centre_id: e.target.value,
                          site: e.target.value ? "" : pmsmaScheduleData.site,
                        })
                      }
                      disabled={loadingPmsmaCentres}
                    >
                      <option value="">
                        {loadingPmsmaCentres
                          ? "Loading centres..."
                          : pmsmaCentres.length
                            ? "-- Select a PMSMA centre --"
                            : "No centres set up for this area"}
                      </option>

                      {pmsmaCentres.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>

                    {!pmsmaScheduleData.pmsma_centre_id && (
                      <>
                        <label className="form-label mt-12">
                          Or type a site name (if not in the list above)
                        </label>

                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Sub-Centre premises, Anganwadi centre"
                          value={pmsmaScheduleData.site}
                          onChange={(e) =>
                            setPmsmaScheduleData({
                              ...pmsmaScheduleData,
                              site: e.target.value,
                            })
                          }
                        />
                      </>
                    )}
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowPMSMAModal(false)}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={pmsmaSubmitting}
                  >
                    {pmsmaSubmitting ? "Scheduling..." : "Schedule"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PregnantWomenManagementLayer;
