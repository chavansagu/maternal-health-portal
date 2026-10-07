import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react/dist/iconify.js';
import { usgAppointmentAPI, adminAPI, pregnantWomenAPI, authAPI } from '../services/api';
import { getUserRole, getAuthToken, decodeToken } from '../services/auth';
import { validateFile, handleFileUploadError } from '../utils/fileValidation';
import { formatDate, formatDateTime, formatDateForInput } from '../utils/dateFormatter';

const USGAppointmentManagementLayer = () => {
    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
    const [appointments, setAppointments] = useState([]);
    const [pendingAppointments, setPendingAppointments] = useState([]);
    const [overdueAppointments, setOverdueAppointments] = useState([]);
    const [activeTab, setActiveTab] = useState('all');
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam && ['all', 'pending', 'overdue', 'rescheduled'].includes(tabParam)) {
            setActiveTab(tabParam);
        }
    }, [searchParams]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [pregnantWomen, setPregnantWomen] = useState([]);
    const [usgCentres, setUSGCentres] = useState([]);
    const [scanTypes, setScanTypes] = useState([]);
    const [abnormalFindings, setAbnormalFindings] = useState({});
    const [pregnantWomanSearch, setPregnantWomanSearch] = useState('');
    const [showPregnantWomanDropdown, setShowPregnantWomanDropdown] = useState(false);
    const [usgCentreSearch, setUSGCentreSearch] = useState('');
    const [showUSGCentreDropdown, setShowUSGCentreDropdown] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const userRole = getUserRole();

    const [scheduleData, setScheduleData] = useState({
        pregnant_woman_id: '',
        usg_centre_id: '',
        scheduled_date: '',
        appointment_type: 'regular',
        prescription_files: []
    });

    const [rescheduleData, setRescheduleData] = useState({
        new_scheduled_date: '',
        reschedule_reason: '',
        is_emergency_override: false,
        override_reason: ''
    });

    const [updateData, setUpdateData] = useState({
        scheduled_date: '',
        appointment_type: 'regular',
        notes: '',
        prescription_files: []
    });

    const [cancelData, setCancelData] = useState({
        cancellation_reason: ''
    });

    const [completeData, setCompleteData] = useState({
        completed_date: '',
        scan_date: '',
        gestational_age: '',
        trimester: 'first',
        scan_type: '',
        findings: 'Normal',
        abnormal_findings: '',
        additional_notes: '',
        doctor_name: '',
        technician_name: '',
        usg_findings: '',
        confirmed_edd_date: '',
        is_high_risk: false,
        report_files: []
    });

    useEffect(() => {
        console.log('USG Appointment Management - Component mounted');
        console.log('User role:', userRole);
        fetchAllData();
        fetchPregnantWomen();
        fetchUSGCentres();
        fetchScanTypes();
        fetchAbnormalFindings();
    }, [userRole]);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            console.log('Fetching appointments data...');
            const [allData, pendingData, overdueData] = await Promise.all([
                usgAppointmentAPI.getAppointments(),
                (userRole === 'usg_centre' || userRole === 'pmsma') ? usgAppointmentAPI.getPendingAppointments() : Promise.resolve([]),
                usgAppointmentAPI.getOverdueEmergencyAppointments()
            ]);
            console.log('Appointments data received:', { allData, pendingData, overdueData });
            console.log('Sample appointment data structure:', JSON.stringify(allData?.allData?.[0] || allData?.[0], null, 2));
            
            // Handle different response structures
            const appointmentsArray = allData?.allData || allData || [];
            const pendingArray = pendingData?.pendingData || pendingData || [];
            const overdueArray = overdueData?.overdueData || overdueData || [];
            
            setAppointments(Array.isArray(appointmentsArray) ? appointmentsArray : []);
            setPendingAppointments(Array.isArray(pendingArray) ? pendingArray : []);
            setOverdueAppointments(Array.isArray(overdueArray) ? overdueArray : []);
        } catch (error) {
            console.error('Error fetching appointments:', error);
            setAppointments([]);
            setPendingAppointments([]);
            setOverdueAppointments([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchPregnantWomen = async () => {
        try {
            console.log('Fetching pregnant women...');
            const res = await pregnantWomenAPI.getPregnantWomen(0, 10000, null, null, null, null, null);
            setPregnantWomen(res.data || []);
        } catch (error) {
            console.error('Error fetching pregnant women:', error);
            setPregnantWomen([]);
        }
    };

    const fetchUSGCentres = async () => {
        try {
            let data;
            if (userRole === 'sub_centre') {
                const currentUser = await authAPI.getCurrentUser();
                console.log('Current user info:', currentUser);
                if (currentUser?.district_id && currentUser?.block_id) {
                    console.log('Fetching USG centres with filters - district_id:', currentUser.district_id, 'block_id:', currentUser.block_id);
                    data = await adminAPI.getUSGCentres(0, 100, currentUser.district_id, currentUser.block_id);
                } else {
                    data = await adminAPI.getUSGCentres(0, 100);
                }
            } else {
                data = await adminAPI.getUSGCentres(0, 100);
            }
            setUSGCentres(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching USG centres:', error);
            setUSGCentres([]);
        }
    };

    const fetchScanTypes = async () => {
        try {
            const data = await authAPI.getScanTypesOptions();
            setScanTypes(data.scan_types || []);
        } catch (error) {
            console.error('Error fetching scan types:', error);
            setScanTypes([]);
        }
    };

    const fetchAbnormalFindings = async () => {
        try {
            const data = await authAPI.getAbnormalFindingsOptions();
            setAbnormalFindings(data || {});
        } catch (error) {
            console.error('Error fetching abnormal findings:', error);
            setAbnormalFindings({});
        }
    };

    const handleScheduleAppointment = async () => {
        if (isSubmitting) return;
        try {
            setIsSubmitting(true);
            const formData = new FormData();
            formData.append('pregnant_woman_id', scheduleData.pregnant_woman_id);
            formData.append('usg_centre_id', scheduleData.usg_centre_id);
            const scheduledDateWithSeconds = scheduleData.scheduled_date.length === 16
                ? scheduleData.scheduled_date + ':00'
                : scheduleData.scheduled_date;
            formData.append('scheduled_date', scheduledDateWithSeconds);
            formData.append('appointment_type', scheduleData.appointment_type);
            scheduleData.prescription_files.forEach(f => formData.append('prescription_files', f));

            await usgAppointmentAPI.scheduleAppointment(formData);
            alert('Appointment scheduled successfully');
            setShowScheduleModal(false);
            setScheduleData({ pregnant_woman_id: '', usg_centre_id: '', scheduled_date: '', appointment_type: 'regular', prescription_files: [] });
            setPregnantWomanSearch('');
            setUSGCentreSearch('');
            setShowPregnantWomanDropdown(false);
            setShowUSGCentreDropdown(false);
            fetchAllData();
        } catch (error) {
            console.error('Error scheduling appointment:', error);
            alert(error.message || 'Failed to schedule appointment');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAcceptAppointment = async (appointmentId) => {
        try {
            await usgAppointmentAPI.acceptAppointment(appointmentId);
            alert('Appointment accepted successfully');
            fetchAllData();
        } catch (error) {
            console.error('Error accepting appointment:', error);
            alert('Failed to accept appointment');
        }
    };

    const handleRescheduleAppointment = async () => {
        try {
            await usgAppointmentAPI.rescheduleAppointment(selectedAppointment.id, rescheduleData);
            alert('Appointment rescheduled successfully');
            setShowRescheduleModal(false);
            fetchAllData();
        } catch (error) {
            console.error('Error rescheduling appointment:', error);
            alert('Failed to reschedule appointment');
        }
    };

    const handleCompleteAppointment = async () => {
        try {
            if (!completeData.report_files || completeData.report_files.length === 0) {
                alert('At least one USG Report file is required');
                return;
            }
            if (!completeData.confirmed_edd_date) {
                alert('Doctor-Confirmed EDD is required to save the report');
                return;
            }
            const formData = new FormData();
            formData.append('completed_date', completeData.completed_date);
            formData.append('scan_date', completeData.scan_date);
            formData.append('gestational_age', completeData.gestational_age || '');
            formData.append('trimester', completeData.trimester);
            formData.append('scan_type', completeData.scan_type);
            formData.append('findings', completeData.findings);
            formData.append('abnormal_findings', completeData.abnormal_findings || '');
            formData.append('additional_notes', completeData.additional_notes || '');
            formData.append('doctor_name', completeData.doctor_name);
            formData.append('technician_name', completeData.technician_name);
            formData.append('usg_findings', completeData.usg_findings || '');
            formData.append('confirmed_edd_date', completeData.confirmed_edd_date);
            formData.append('is_high_risk', completeData.is_high_risk);
            completeData.report_files.forEach(f => formData.append('report_files', f));

            await usgAppointmentAPI.completeAppointment(selectedAppointment.id, formData);
            alert('Appointment completed successfully');
            setShowCompleteModal(false);
            fetchAllData();
        } catch (error) {
            console.error('Error completing appointment:', error);
            alert(error.message || 'Failed to complete appointment');
        }
    };

    const handleUpdateAppointment = async () => {
        try {
            const formData = new FormData();
            if (updateData.scheduled_date) {
                const updateDateWithSeconds = updateData.scheduled_date.length === 16
                    ? updateData.scheduled_date + ':00'
                    : updateData.scheduled_date;
                formData.append('scheduled_date', updateDateWithSeconds);
            }
            if (updateData.appointment_type) formData.append('appointment_type', updateData.appointment_type);
            if (updateData.notes) formData.append('notes', updateData.notes);
            if (updateData.prescription_files && updateData.prescription_files.length > 0) {
                updateData.prescription_files.forEach(f => formData.append('prescription_files', f));
            }
            await usgAppointmentAPI.updateAppointment(selectedAppointment.id, formData);
            alert('Appointment updated successfully');
            setShowUpdateModal(false);
            fetchAllData();
        } catch (error) {
            console.error('Error updating appointment:', error);
            alert(error.message || 'Failed to update appointment');
        }
    };

    const handleCancelAppointment = async () => {
        try {
            await usgAppointmentAPI.cancelAppointment(selectedAppointment.id, cancelData.cancellation_reason);
            alert('Appointment cancelled successfully');
            setShowCancelModal(false);
            fetchAllData();
        } catch (error) {
            console.error('Error cancelling appointment:', error);
            alert('Failed to cancel appointment');
        }
    };

    const getPatientName = (appointment) => {
        return appointment.pregnant_woman_name || 'N/A';
    };

    const getUSGCentreName = (appointment) => {
        // Find the USG centre by ID from the usgCentres array
        const centre = usgCentres.find(c => c.id === appointment.usg_centre_id);
        return centre?.name || appointment.usg_centre_name || 'N/A';
    };

    const getCurrentData = () => {
        switch (activeTab) {
            case 'pending': return pendingAppointments;
            case 'overdue': return overdueAppointments;
            case 'rescheduled': return appointments.filter(appointment => appointment.status === 'rescheduled');
            default: return appointments;
        }
    };

    const filteredData = getCurrentData().filter(appointment =>
        getPatientName(appointment).toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.id?.toString().includes(searchTerm) ||
        getUSGCentreName(appointment).toLowerCase().includes(searchTerm.toLowerCase())
    );

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

    const getStatusBadge = (status) => {
        const statusConfig = {
            scheduled: { class: 'bg-warning-focus text-warning-main', text: 'Scheduled' },
            accepted: { class: 'bg-info-focus text-info-main', text: 'Accepted' },
            rescheduled: { class: 'bg-primary-focus text-primary-main', text: 'Rescheduled' },
            completed: { class: 'bg-success-focus text-success-main', text: 'Completed' }
        };
        const config = statusConfig[status] || { class: 'bg-neutral-200 text-neutral-600', text: status };
        return <span className={`px-24 py-4 rounded-pill fw-medium text-sm ${config.class}`}>{config.text}</span>;
    };

    const getAppointmentTypeBadge = (type) => {
        return type === 'emergency' ? 
            <span className="px-24 py-4 rounded-pill fw-medium text-sm bg-danger-focus text-danger-main">Emergency</span> :
            <span className="px-24 py-4 rounded-pill fw-medium text-sm bg-neutral-200 text-neutral-600">Regular</span>;
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
                                                Total Appointments
                                            </span>
                                            <h6 className="fw-semibold mb-1">{appointments.length}</h6>
                                        </div>
                                        <span className="w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-2xl mb-12 bg-primary-100 text-primary-600">
                                            <Icon icon="material-symbols:calendar-month" />
                                        </span>
                                    </div>
                                    <p className="text-sm mb-0">
                                        <span className="bg-success-focus px-1 rounded-2 fw-medium text-success-main text-sm">
                                            <Icon icon="ri:arrow-right-up-line" /> Active
                                        </span>{" "}
                                        Scheduled{" "}
                                    </p>
                                </div>
                            </div>
                            <div className="col-xxl-3 col-xl-4 col-sm-6">
                                <div className="px-20 py-16 shadow-none radius-8 h-100 gradient-deep-2 left-line line-bg-lilac position-relative overflow-hidden">
                                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8">
                                        <div>
                                            <span className="mb-2 fw-medium text-secondary-light text-md">
                                                Pending
                                            </span>
                                            <h6 className="fw-semibold mb-1">{pendingAppointments.length}</h6>
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
                                                Overdue Emergency
                                            </span>
                                            <h6 className="fw-semibold mb-1">{overdueAppointments.length}</h6>
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
                                <div className="px-20 py-16 shadow-none radius-8 h-100 bg-success-100 left-line line-bg-success position-relative overflow-hidden">
                                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8">
                                        <div>
                                            <span className="mb-2 fw-medium text-secondary-light text-md">
                                                Completed
                                            </span>
                                            <h6 className="fw-semibold mb-1">{appointments.filter(a => a.status === 'completed').length}</h6>
                                        </div>
                                        <span className="w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-2xl mb-12 bg-success-focus text-success-600">
                                            <Icon icon="material-symbols:check-circle" />
                                        </span>
                                    </div>
                                    <p className="text-sm mb-0">
                                        <span className="bg-success-focus px-1 rounded-2 fw-medium text-success-main text-sm">
                                            <Icon icon="ri:arrow-right-up-line" /> Done
                                        </span>{" "}
                                        Finished{" "}
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
                                className={`nav-link ${activeTab === 'all' ? 'active' : ''}`}
                                onClick={() => setActiveTab('all')}
                                type="button"
                            >
                                All Appointments
                            </button>
                        </li>
                        {userRole === 'usg_centre' && (
                            <li className="nav-item" role="presentation">
                                <button
                                    className={`nav-link ${activeTab === 'pending' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('pending')}
                                    type="button"
                                >
                                    Pending
                                </button>
                            </li>
                        )}
                        <li className="nav-item" role="presentation">
                            <button
                                className={`nav-link ${activeTab === 'overdue' ? 'active' : ''}`}
                                onClick={() => setActiveTab('overdue')}
                                type="button"
                            >
                                Overdue Emergency
                            </button>
                        </li>
                        <li className="nav-item" role="presentation">
                            <button
                                className={`nav-link ${activeTab === 'rescheduled' ? 'active' : ''}`}
                                onClick={() => setActiveTab('rescheduled')}
                                type="button"
                            >
                                Rescheduled
                            </button>
                        </li>
                    </ul>
                    
                    {/* Pagination Size Selector - Compact */}
                    <div className="d-flex align-items-center gap-1">
                        <span className="text-xs text-secondary-light">Show:</span>
                        <select 
                            className="form-select form-select-sm" 
                            style={{ width: '70px', fontSize: '12px' }}
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
                        <span className="text-xs text-secondary-light">entries</span>
                    </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                    <form className="navbar-search" style={{ width: '200px' }}>
                        <input
                            type="text"
                            className="bg-base h-32-px w-100"
                            style={{ fontSize: '13px' }}
                            placeholder="Search..."
                            title="Search by name, USG centre, appointment ID"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                        <Icon icon="ion:search-outline" className="icon" />
                    </form>
                    {userRole === 'sub_centre' && (
                        <button 
                            className="btn btn-primary btn-sm px-8 py-4 radius-8 h-32-px d-flex align-items-center gap-1"
                            onClick={() => setShowScheduleModal(true)}
                            style={{ fontSize: '12px' }}
                        >
                            <Icon icon="material-symbols:add" className="text-sm" />
                            Schedule Appointment
                        </button>
                    )}
                    {userRole === 'pmsma' && (
                        <button 
                            className="btn btn-primary btn-sm px-8 py-4 radius-8 h-32-px d-flex align-items-center gap-1"
                            onClick={() => setShowScheduleModal(true)}
                            style={{ fontSize: '12px' }}
                        >
                            <Icon icon="material-symbols:add" className="text-sm" />
                            Schedule Appointment
                        </button>
                    )}
                </div>
            </div>

            {/* Appointments Table */}
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
                                    <th scope="col">USG Centre</th>
                                    <th scope="col">Scheduled Date</th>
                                    <th scope="col">Type</th>
                                    <th scope="col" className="text-center">Status</th>
                                    <th scope="col" className="text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="text-center py-4">
                                            {loading ? 'Loading appointments...' : 'No appointments found'}
                                            {!loading && appointments.length === 0 && (
                                                <div className="mt-2 text-secondary-light">
                                                    <small>No USG appointments have been scheduled yet.</small>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((appointment, index) => (
                                        <tr key={appointment.id}>
                                            <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                            <td>{getPatientName(appointment)}</td>
                                            <td>{getUSGCentreName(appointment)}</td>
                                            <td>{formatDateTime(appointment.scheduled_date)}</td>
                                            <td>{getAppointmentTypeBadge(appointment.appointment_type)}</td>
                                            <td>{getStatusBadge(appointment.status)}</td>
                                            <td>
                                                <div className="d-flex align-items-center gap-10 justify-content-center">
                                                    <button
                                                        className="bg-primary-50 text-primary-600 bg-hover-primary-100 text-hover-primary-800 w-32-px h-32-px d-flex justify-content-center align-items-center rounded-circle"
                                                        onClick={() => { setSelectedAppointment(appointment); setShowViewModal(true); }}
                                                        title="View Details"
                                                    >
                                                        <Icon icon="iconamoon:eye-light" />
                                                    </button>
                                                    {userRole === 'usg_centre' && (
                                                        <>
                                                            {appointment.status === 'scheduled' && (
                                                                <button
                                                                    className="bg-success-focus text-success-main bg-hover-success-200 w-32-px h-32-px d-flex justify-content-center align-items-center rounded-circle"
                                                                    onClick={() => handleAcceptAppointment(appointment.id)}
                                                                    title="Accept"
                                                                >
                                                                    <Icon icon="material-symbols:check" />
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                    {(userRole === 'usg_centre' || userRole === 'pmsma') && appointment.status === 'accepted' && appointment.appointment_type !== 'emergency' && (
                                                        <button
                                                            className="bg-warning-focus text-warning-main bg-hover-warning-200 w-32-px h-32-px d-flex justify-content-center align-items-center rounded-circle"
                                                            onClick={() => { 
                                                                setSelectedAppointment(appointment); 
                                                                setRescheduleData({ new_scheduled_date: '', reschedule_reason: '', is_emergency_override: false, override_reason: '' });
                                                                setShowRescheduleModal(true); 
                                                            }}
                                                            title="Reschedule"
                                                        >
                                                            <Icon icon="material-symbols:schedule" />
                                                        </button>
                                                    )}
                                                    {userRole === 'usg_centre' && (appointment.status === 'accepted' || appointment.status === 'rescheduled') && (
                                                        <button
                                                            className="bg-success-focus text-success-main bg-hover-success-200 w-32-px h-32-px d-flex justify-content-center align-items-center rounded-circle"
                                                            onClick={() => { 
                                                                setSelectedAppointment(appointment); 
                                                                setCompleteData({
                                                                    completed_date: '',
                                                                    scan_date: '',
                                                                    gestational_age: '',
                                                                    trimester: 'first',
                                                                    scan_type: '',
                                                                    findings: 'Normal',
                                                                    abnormal_findings: '',
                                                                    additional_notes: '',
                                                                    doctor_name: '',
                                                                    technician_name: '',
                                                                    usg_findings: '',
                                                                    confirmed_edd_date: '',
                                                                    is_high_risk: false,
                                                                    report_files: []
                                                                });
                                                                setShowCompleteModal(true); 
                                                            }}
                                                            title="Complete"
                                                        >
                                                            <Icon icon="material-symbols:task-alt" />
                                                        </button>
                                                    )}
                                                    {(['sub_centre', 'block', 'usg_centre', 'pmsma'].includes(userRole)) && appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
                                                        <>
                                                            <button
                                                                className="bg-success-focus text-success-main bg-hover-success-200 w-32-px h-32-px d-flex justify-content-center align-items-center rounded-circle"
                                                                onClick={() => { 
                                                                    setSelectedAppointment(appointment); 
                                                                    setUpdateData({
                                                                        scheduled_date: appointment.scheduled_date?.slice(0, 16) || '',
                                                                        appointment_type: appointment.appointment_type || 'regular',
                                                                        notes: appointment.notes || '',
                                                                        prescription_files: []
                                                                    });
                                                                    setShowUpdateModal(true); 
                                                                }}
                                                                title="Edit Details"
                                                            >
                                                                <Icon icon="lucide:edit" />
                                                            </button>
                                                            <button
                                                                className="bg-danger-focus text-danger-main bg-hover-danger-200 w-32-px h-32-px d-flex justify-content-center align-items-center rounded-circle"
                                                                onClick={() => { 
                                                                    setSelectedAppointment(appointment); 
                                                                    setCancelData({ cancellation_reason: '' });
                                                                    setShowCancelModal(true); 
                                                                }}
                                                                title="Cancel"
                                                            >
                                                                <Icon icon="fluent:delete-24-regular" />
                                                            </button>
                                                        </>
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
                            Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredData.length)} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} entries
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
                            {getVisiblePages(currentPage, Math.ceil(filteredData.length / itemsPerPage)).map((page, index) => {
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
                                    onClick={() => setCurrentPage(Math.min(Math.ceil(filteredData.length / itemsPerPage), currentPage + 1))}
                                    disabled={currentPage === Math.ceil(filteredData.length / itemsPerPage)}
                                    title="Next Page"
                                >
                                    <Icon icon="ep:d-arrow-right" className="" />
                                </button>
                            </li>
                            {/* Last Page */}
                            <li className="page-item">
                                <button
                                    className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md"
                                    onClick={() => setCurrentPage(Math.ceil(filteredData.length / itemsPerPage))}
                                    disabled={currentPage === Math.ceil(filteredData.length / itemsPerPage)}
                                    title="Last Page"
                                >
                                    <Icon icon="ep:d-arrow-right" /><Icon icon="ep:d-arrow-right" />
                                </button>
                            </li>
                        </ul>
                    </div>
                )}
            </div>

            {/* Schedule Appointment Modal */}
            {showScheduleModal && (
                <>
                    <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
                        <div className="modal-dialog modal-lg modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Schedule USG Appointment</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowScheduleModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Pregnant Woman <span className="text-danger">*</span></label>
                                            <div className="position-relative">
                                                <div className="input-group">
                                                    <input 
                                                        type="text"
                                                        className="form-control"
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
                                                        onClick={() => setShowPregnantWomanDropdown(!showPregnantWomanDropdown)}
                                                    >
                                                        <Icon icon={showPregnantWomanDropdown ? "solar:alt-arrow-up-bold" : "solar:alt-arrow-down-bold"} />
                                                    </button>
                                                </div>
                                                {showPregnantWomanDropdown && (
                                                    <div className="card position-absolute w-100 mt-1 shadow border-0" style={{zIndex: 1050, maxHeight: '200px'}}>
                                                        <div className="list-group list-group-flush" style={{maxHeight: '200px', overflowY: 'auto'}}>
                                                            {pregnantWomen
                                                                .filter(woman => 
                                                                    !pregnantWomanSearch || (woman.full_name || woman.name || '').toLowerCase().includes(pregnantWomanSearch.toLowerCase())
                                                                )
                                                                .map(woman => (
                                                                    <button 
                                                                        key={woman.id}
                                                                        type="button"
                                                                        className="list-group-item list-group-item-action border-0 py-2 px-3 text-start"
                                                                        onClick={() => {
                                                                            setScheduleData({...scheduleData, pregnant_woman_id: woman.id});
                                                                            setPregnantWomanSearch(woman.full_name || woman.name);
                                                                            setShowPregnantWomanDropdown(false);
                                                                        }}
                                                                    >
                                                                        {woman.full_name || woman.name} - {woman.mobile_number}
                                                                    </button>
                                                                ))
                                                            }
                                                            {pregnantWomen.filter(woman => 
                                                                !pregnantWomanSearch || (woman.full_name || woman.name || '').toLowerCase().includes(pregnantWomanSearch.toLowerCase())
                                                            ).length === 0 && (
                                                                <div className="list-group-item border-0 py-3 text-center text-muted">
                                                                    <small>No pregnant women found</small>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">USG Centre <span className="text-danger">*</span></label>
                                            <div className="position-relative">
                                                <div className="input-group">
                                                    <input 
                                                        type="text"
                                                        className="form-control"
                                                        placeholder="Search or select USG centre..."
                                                        value={usgCentreSearch}
                                                        onChange={(e) => {
                                                            setUSGCentreSearch(e.target.value);
                                                            setShowUSGCentreDropdown(true);
                                                        }}
                                                        onFocus={() => setShowUSGCentreDropdown(true)}
                                                        autoComplete="off"
                                                    />
                                                    <button 
                                                        type="button"
                                                        className="btn btn-outline-secondary"
                                                        onClick={() => setShowUSGCentreDropdown(!showUSGCentreDropdown)}
                                                    >
                                                        <Icon icon={showUSGCentreDropdown ? "solar:alt-arrow-up-bold" : "solar:alt-arrow-down-bold"} />
                                                    </button>
                                                </div>
                                                {showUSGCentreDropdown && (
                                                    <div className="card position-absolute w-100 mt-1 shadow border-0" style={{zIndex: 1050, maxHeight: '200px'}}>
                                                        <div className="list-group list-group-flush" style={{maxHeight: '200px', overflowY: 'auto'}}>
                                                            {usgCentres
                                                                .filter(centre => 
                                                                    !usgCentreSearch || (centre.name || '').toLowerCase().includes(usgCentreSearch.toLowerCase())
                                                                )
                                                                .map(centre => (
                                                                    <button 
                                                                        key={centre.id}
                                                                        type="button"
                                                                        className="list-group-item list-group-item-action border-0 py-2 px-3 text-start"
                                                                        onClick={() => {
                                                                            setScheduleData({...scheduleData, usg_centre_id: centre.id});
                                                                            setUSGCentreSearch(centre.name);
                                                                            setShowUSGCentreDropdown(false);
                                                                        }}
                                                                    >
                                                                        {centre.name}
                                                                    </button>
                                                                ))
                                                            }
                                                            {usgCentres.filter(centre => 
                                                                !usgCentreSearch || (centre.name || '').toLowerCase().includes(usgCentreSearch.toLowerCase())
                                                            ).length === 0 && (
                                                                <div className="list-group-item border-0 py-3 text-center text-muted">
                                                                    <small>No USG centres found</small>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Scheduled Date & Time <span className="text-danger">*</span></label>
                                            <input 
                                                type="datetime-local"
                                                className="form-control"
                                                value={scheduleData.scheduled_date}
                                                onChange={(e) => setScheduleData({...scheduleData, scheduled_date: e.target.value})}
                                                required
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Appointment Type</label>
                                            <select 
                                                className="form-select"
                                                value={scheduleData.appointment_type}
                                                onChange={(e) => setScheduleData({...scheduleData, appointment_type: e.target.value})}
                                            >
                                                <option value="regular">Regular</option>
                                                <option value="emergency">Emergency</option>
                                            </select>
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label fw-semibold">Prescription File</label>
                                            <div 
                                                className="rounded p-40 text-center position-relative"
                                                style={{
                                                    border: '2px dashed #8B4513',
                                                    backgroundColor: 'transparent',
                                                    minHeight: '180px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderRadius: '8px'
                                                }}
                                            >
                                                {!scheduleData.prescription_files.length ? (
                                                    <>
                                                        <div className="mb-12"><Icon icon="material-symbols:cloud-upload" style={{fontSize: '80px', color: '#6B7280'}} /></div>
                                                        <h6 className="mb-4" style={{color: '#6B7280', fontSize: '16px', fontWeight: '500'}}>Drag and drop your File here</h6>
                                                        <p className="mb-8" style={{color: '#9CA3AF', fontSize: '14px'}}>or click to browse</p>
                                                        <p className="mb-0" style={{color: '#9CA3AF', fontSize: '14px'}}>Upload prescription files (PDF, JPG, PNG) — multiple allowed</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="mb-12"><Icon icon="material-symbols:check-circle" style={{fontSize: '80px', color: '#10B981'}} /></div>
                                                        <h6 className="mb-4" style={{color: '#10B981', fontSize: '16px', fontWeight: '500'}}>{scheduleData.prescription_files.length} File(s) Selected</h6>
                                                        {scheduleData.prescription_files.map((f, i) => <p key={i} className="mb-0" style={{color: '#6B7280', fontSize: '13px'}}>{f.name}</p>)}
                                                    </>
                                                )}
                                                <input type="file" className="position-absolute w-100 h-100 opacity-0" style={{cursor: 'pointer', top: 0, left: 0}} accept=".pdf,.jpg,.jpeg,.png" multiple onChange={(e) => setScheduleData({...scheduleData, prescription_files: Array.from(e.target.files)})} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowScheduleModal(false)}>Cancel</button>
                                    <button 
                                        type="button" 
                                        className="btn btn-primary" 
                                        onClick={handleScheduleAppointment}
                                        disabled={isSubmitting || !scheduleData.pregnant_woman_id || !scheduleData.usg_centre_id || !scheduleData.scheduled_date}
                                    >
                                        {isSubmitting ? 'Scheduling...' : 'Schedule'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" onClick={() => setShowScheduleModal(false)}></div>
                </>
            )}

            {/* View Appointment Modal */}
            {showViewModal && selectedAppointment && (
                <>
                    <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
                        <div className="modal-dialog modal-lg modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Appointment Details</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowViewModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Appointment ID:</label>
                                            <p className="mb-0 text-primary-600 fw-medium">#{selectedAppointment.id}</p>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Status:</label>
                                            <p className="mb-0">{getStatusBadge(selectedAppointment.status)}</p>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Name:</label>
                                            <p className="mb-0">{getPatientName(selectedAppointment)}</p>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">USG Centre:</label>
                                            <p className="mb-0">{getUSGCentreName(selectedAppointment)}</p>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Scheduled Date:</label>
                                            <p className="mb-0">{formatDateTime(selectedAppointment.scheduled_date)}</p>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Appointment Type:</label>
                                            <p className="mb-0">{getAppointmentTypeBadge(selectedAppointment.appointment_type)}</p>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Reschedule Count:</label>
                                            <p className="mb-0">{selectedAppointment.reschedule_count || 0}</p>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">SMS Sent:</label>
                                            <p className="mb-0">
                                                {selectedAppointment.sms_sent ? 
                                                    <span className="px-24 py-4 rounded-pill fw-medium text-sm bg-success-focus text-success-main">Yes</span> :
                                                    <span className="px-24 py-4 rounded-pill fw-medium text-sm bg-neutral-200 text-neutral-600">No</span>
                                                }
                                            </p>
                                        </div>
                                        {selectedAppointment.reschedule_reason && (
                                            <div className="col-12">
                                                <label className="form-label fw-semibold">Reschedule Reason:</label>
                                                <p className="mb-0 p-3 bg-neutral-50 rounded">{selectedAppointment.reschedule_reason}</p>
                                            </div>
                                        )}
                                        {/* Prescription Files */}
                                        {(selectedAppointment.prescription_file_urls?.length > 0 || selectedAppointment.prescription_file_url) && (
                                            <div className="col-md-6">
                                                <label className="form-label fw-semibold">Prescription File(s):</label>
                                                <div className="d-flex flex-wrap gap-2">
                                                    {(selectedAppointment.prescription_file_urls?.length > 0
                                                        ? selectedAppointment.prescription_file_urls
                                                        : [selectedAppointment.prescription_file_url]
                                                    ).map((url, i) => (
                                                        <a key={i} href={`${API_BASE_URL}${url}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1">
                                                            <Icon icon="material-symbols:visibility" />File {i + 1}
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {/* Report Files */}
                                        {(selectedAppointment.report_file_urls?.length > 0 || selectedAppointment.report_file_url) && (
                                            <div className="col-md-6">
                                                <label className="form-label fw-semibold">USG Report File(s):</label>
                                                <div className="d-flex flex-wrap gap-2">
                                                    {(selectedAppointment.report_file_urls?.length > 0
                                                        ? selectedAppointment.report_file_urls
                                                        : [selectedAppointment.report_file_url]
                                                    ).map((url, i) => (
                                                        <a key={i} href={`${API_BASE_URL}${url}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline-success btn-sm d-flex align-items-center gap-1">
                                                            <Icon icon="material-symbols:description" />File {i + 1}
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowViewModal(false)}>Close</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" onClick={() => setShowViewModal(false)}></div>
                </>
            )}

            {/* Reschedule Modal */}
            {showRescheduleModal && selectedAppointment && (
                <>
                    <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Reschedule Appointment</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowRescheduleModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Appointment ID:</label>
                                        <p className="mb-0 text-primary-600 fw-medium">#{selectedAppointment.id}</p>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">New Scheduled Date & Time <span className="text-danger">*</span></label>
                                        <input 
                                            type="datetime-local"
                                            className="form-control"
                                            value={rescheduleData.new_scheduled_date}
                                            onChange={(e) => setRescheduleData({...rescheduleData, new_scheduled_date: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Reschedule Reason <span className="text-danger">*</span></label>
                                        <textarea 
                                            className="form-control"
                                            rows="3"
                                            value={rescheduleData.reschedule_reason}
                                            onChange={(e) => setRescheduleData({...rescheduleData, reschedule_reason: e.target.value})}
                                            placeholder="Reason for rescheduling..."
                                            required
                                        ></textarea>
                                    </div>
                                    {userRole === 'pmsma' && (
                                        <>
                                            <div className="form-check mb-2">
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input"
                                                    id="usgEmergencyOverride"
                                                    checked={rescheduleData.is_emergency_override}
                                                    onChange={(e) => setRescheduleData({ ...rescheduleData, is_emergency_override: e.target.checked, override_reason: '' })}
                                                />
                                                <label htmlFor="usgEmergencyOverride" className="form-check-label fw-semibold">
                                                    Emergency Override (beyond 7-day window)
                                                </label>
                                            </div>
                                            {rescheduleData.is_emergency_override && (
                                                <div className="mb-3">
                                                    <label className="form-label fw-semibold">Override Reason <span className="text-danger">*</span></label>
                                                    <textarea
                                                        className="form-control"
                                                        rows="2"
                                                        value={rescheduleData.override_reason}
                                                        onChange={(e) => setRescheduleData({ ...rescheduleData, override_reason: e.target.value })}
                                                        placeholder="Mandatory reason for bypassing the 7-day notice period..."
                                                        required
                                                    ></textarea>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowRescheduleModal(false)}>Cancel</button>
                                    <button 
                                        type="button" 
                                        className="btn btn-warning" 
                                        onClick={handleRescheduleAppointment}
                                        disabled={
                                            !rescheduleData.new_scheduled_date ||
                                            !rescheduleData.reschedule_reason.trim() ||
                                            (rescheduleData.is_emergency_override && !rescheduleData.override_reason.trim())
                                        }
                                    >
                                        Reschedule
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" onClick={() => setShowRescheduleModal(false)}></div>
                </>
            )}

            {/* Complete Appointment Modal */}
            {showCompleteModal && selectedAppointment && (
                <>
                    <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
                        <div className="modal-dialog modal-xl modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Complete Appointment</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowCompleteModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Current EDD (LMP-based)</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={(() => {
                                                    const pw = pregnantWomen.find(w => w.id === selectedAppointment.pregnant_woman_id);
                                                    return pw && pw.edd_date ? pw.edd_date : 'Not available';
                                                })()}
                                                disabled
                                                readOnly
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Doctor-Confirmed EDD <span className="text-danger">*</span></label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                value={completeData.confirmed_edd_date}
                                                onChange={(e) => setCompleteData({...completeData, confirmed_edd_date: e.target.value})}
                                                required
                                            />
                                            <small className="text-muted">Report cannot be saved without this. Recorded in the EDD history alongside the current date.</small>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Completed Date & Time <span className="text-danger">*</span></label>
                                            <input 
                                                type="datetime-local"
                                                className="form-control"
                                                value={completeData.completed_date}
                                                onChange={(e) => setCompleteData({...completeData, completed_date: e.target.value})}
                                                required
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Scan Date <span className="text-danger">*</span></label>
                                            <input 
                                                type="date"
                                                className="form-control"
                                                value={completeData.scan_date}
                                                onChange={(e) => setCompleteData({...completeData, scan_date: e.target.value})}
                                                required
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Gestational Age <span className="text-danger">*</span></label>
                                            <input 
                                                type="text"
                                                className="form-control"
                                                placeholder="e.g., 20 weeks 3 days"
                                                value={completeData.gestational_age}
                                                onChange={(e) => setCompleteData({...completeData, gestational_age: e.target.value})}
                                                required
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Trimester <span className="text-danger">*</span></label>
                                            <select 
                                                className="form-select"
                                                value={completeData.trimester}
                                                onChange={(e) => setCompleteData({...completeData, trimester: e.target.value})}
                                                required
                                            >
                                                <option value="first">First</option>
                                                <option value="second">Second</option>
                                                <option value="third">Third</option>
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Scan Type <span className="text-danger">*</span></label>
                                            <select 
                                                className="form-select"
                                                value={completeData.scan_type}
                                                onChange={(e) => setCompleteData({...completeData, scan_type: e.target.value})}
                                                required
                                            >
                                                <option value="">Select Scan Type</option>
                                                {scanTypes.map(type => (
                                                    <option key={type} value={type}>{type}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Findings <span className="text-danger">*</span></label>
                                            <select 
                                                className="form-select"
                                                value={completeData.findings}
                                                onChange={(e) => setCompleteData({...completeData, findings: e.target.value})}
                                                required
                                            >
                                                <option value="Normal">Normal</option>
                                                <option value="Abnormal">Abnormal</option>
                                            </select>
                                        </div>
                                        {completeData.findings === 'Abnormal' && (
                                            <div className="col-12">
                                                <label className="form-label fw-semibold">Abnormal Findings</label>
                                                <select 
                                                    className="form-select mb-3"
                                                    value={completeData.abnormal_findings}
                                                    onChange={(e) => setCompleteData({...completeData, abnormal_findings: e.target.value})}
                                                >
                                                    <option value="">Select Abnormal Finding</option>
                                                    {(abnormalFindings[completeData.trimester + '_trimester'] || []).map(finding => (
                                                        <option key={finding} value={finding}>{finding}</option>
                                                    ))}
                                                </select>
                                                <textarea 
                                                    className="form-control"
                                                    rows="3"
                                                    value={completeData.abnormal_findings}
                                                    onChange={(e) => setCompleteData({...completeData, abnormal_findings: e.target.value})}
                                                    placeholder="Or describe custom abnormal findings..."
                                                ></textarea>
                                            </div>
                                        )}
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Doctor Name <span className="text-danger">*</span></label>
                                            <input 
                                                type="text"
                                                className="form-control"
                                                value={completeData.doctor_name}
                                                onChange={(e) => setCompleteData({...completeData, doctor_name: e.target.value})}
                                                required
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Technician Name <span className="text-danger">*</span></label>
                                            <input 
                                                type="text"
                                                className="form-control"
                                                value={completeData.technician_name}
                                                onChange={(e) => setCompleteData({...completeData, technician_name: e.target.value})}
                                                required
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label fw-semibold">USG Findings <span className="text-danger">*</span></label>
                                            <textarea 
                                                className="form-control"
                                                rows="3"
                                                value={completeData.usg_findings}
                                                onChange={(e) => setCompleteData({...completeData, usg_findings: e.target.value})}
                                                placeholder="Detailed USG findings..."
                                                required
                                            ></textarea>
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label fw-semibold">Additional Notes</label>
                                            <textarea 
                                                className="form-control"
                                                rows="2"
                                                value={completeData.additional_notes}
                                                onChange={(e) => setCompleteData({...completeData, additional_notes: e.target.value})}
                                                placeholder="Any additional notes..."
                                            ></textarea>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="form-check d-flex align-items-center">
                                                <input 
                                                    className="form-check-input me-2"
                                                    type="checkbox"
                                                    checked={completeData.is_high_risk}
                                                    onChange={(e) => setCompleteData({...completeData, is_high_risk: e.target.checked})}
                                                />
                                                <label className="form-check-label fw-semibold">
                                                    Mark as High Risk
                                                </label>
                                            </div>
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label fw-semibold">USG Report File <span className="text-danger">*</span></label>
                                            <div 
                                                className="rounded p-40 text-center position-relative"
                                                style={{
                                                    border: '2px dashed #8B4513',
                                                    backgroundColor: 'transparent',
                                                    minHeight: '180px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderRadius: '8px'
                                                }}
                                            >
                                                {!completeData.report_files.length ? (
                                                    <>
                                                        <div className="mb-12"><Icon icon="material-symbols:cloud-upload" style={{fontSize: '80px', color: '#6B7280'}} /></div>
                                                        <h6 className="mb-4" style={{color: '#6B7280', fontSize: '16px', fontWeight: '500'}}>Drag and drop your File here</h6>
                                                        <p className="mb-8" style={{color: '#9CA3AF', fontSize: '14px'}}>or click to browse</p>
                                                        <p className="mb-0" style={{color: '#9CA3AF', fontSize: '14px'}}>Upload USG report files (PDF, JPG, PNG) — multiple allowed</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="mb-12"><Icon icon="material-symbols:check-circle" style={{fontSize: '80px', color: '#10B981'}} /></div>
                                                        <h6 className="mb-4" style={{color: '#10B981', fontSize: '16px', fontWeight: '500'}}>{completeData.report_files.length} File(s) Selected</h6>
                                                        {completeData.report_files.map((f, i) => <p key={i} className="mb-0" style={{color: '#6B7280', fontSize: '13px'}}>{f.name}</p>)}
                                                    </>
                                                )}
                                                <input type="file" className="position-absolute w-100 h-100 opacity-0" style={{cursor: 'pointer', top: 0, left: 0}} accept=".pdf,.jpg,.jpeg,.png" multiple onChange={(e) => setCompleteData({...completeData, report_files: Array.from(e.target.files)})} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowCompleteModal(false)}>Cancel</button>
                                    <button 
                                        type="button" 
                                        className="btn btn-success" 
                                        onClick={handleCompleteAppointment}
                                        disabled={!completeData.completed_date || !completeData.scan_date || !completeData.confirmed_edd_date || !completeData.report_files.length}
                                    >
                                        Complete Appointment
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" onClick={() => setShowCompleteModal(false)}></div>
                </>
            )}

            {/* Update Appointment Modal */}
            {showUpdateModal && selectedAppointment && (
                <>
                    <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
                        <div className="modal-dialog modal-lg modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Update Appointment</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowUpdateModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Scheduled Date & Time</label>
                                            <input 
                                                type="datetime-local"
                                                className="form-control"
                                                value={updateData.scheduled_date}
                                                onChange={(e) => setUpdateData({...updateData, scheduled_date: e.target.value})}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Appointment Type</label>
                                            <select 
                                                className="form-select"
                                                value={updateData.appointment_type}
                                                onChange={(e) => setUpdateData({...updateData, appointment_type: e.target.value})}
                                            >
                                                <option value="regular">Regular</option>
                                                <option value="emergency">Emergency</option>
                                            </select>
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label fw-semibold">Notes</label>
                                            <textarea 
                                                className="form-control"
                                                rows="3"
                                                value={updateData.notes}
                                                onChange={(e) => setUpdateData({...updateData, notes: e.target.value})}
                                                placeholder="Add notes..."
                                            ></textarea>
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label fw-semibold">Update Prescription File</label>
                                            <div 
                                                className="rounded p-40 text-center position-relative"
                                                style={{
                                                    border: '2px dashed #8B4513',
                                                    backgroundColor: 'transparent',
                                                    minHeight: '180px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderRadius: '8px'
                                                }}
                                            >
                                                {!updateData.prescription_files?.length ? (
                                                    <>
                                                        <div className="mb-12"><Icon icon="material-symbols:cloud-upload" style={{fontSize: '80px', color: '#6B7280'}} /></div>
                                                        <h6 className="mb-4" style={{color: '#6B7280', fontSize: '16px', fontWeight: '500'}}>Drag and drop your File here</h6>
                                                        <p className="mb-8" style={{color: '#9CA3AF', fontSize: '14px'}}>or click to browse</p>
                                                        <p className="mb-0" style={{color: '#9CA3AF', fontSize: '14px'}}>Upload prescription files (PDF, JPG, PNG) — multiple allowed</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="mb-12"><Icon icon="material-symbols:check-circle" style={{fontSize: '80px', color: '#10B981'}} /></div>
                                                        <h6 className="mb-4" style={{color: '#10B981', fontSize: '16px', fontWeight: '500'}}>{updateData.prescription_files.length} File(s) Selected</h6>
                                                        {updateData.prescription_files.map((f, i) => <p key={i} className="mb-0" style={{color: '#6B7280', fontSize: '13px'}}>{f.name}</p>)}
                                                    </>
                                                )}
                                                <input type="file" className="position-absolute w-100 h-100 opacity-0" style={{cursor: 'pointer', top: 0, left: 0}} accept=".pdf,.jpg,.jpeg,.png" multiple onChange={(e) => setUpdateData({...updateData, prescription_files: Array.from(e.target.files)})} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowUpdateModal(false)}>Cancel</button>
                                    <button type="button" className="btn btn-primary" onClick={handleUpdateAppointment}>Update</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" onClick={() => setShowUpdateModal(false)}></div>
                </>
            )}

            {/* Cancel Appointment Modal */}
            {showCancelModal && selectedAppointment && (
                <>
                    <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Cancel Appointment</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowCancelModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Appointment ID:</label>
                                        <p className="mb-0 text-primary-600 fw-medium">#{selectedAppointment.id}</p>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Cancellation Reason <span className="text-danger">*</span></label>
                                        <textarea 
                                            className="form-control"
                                            rows="3"
                                            value={cancelData.cancellation_reason}
                                            onChange={(e) => setCancelData({...cancelData, cancellation_reason: e.target.value})}
                                            placeholder="Reason for cancellation..."
                                            required
                                        ></textarea>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowCancelModal(false)}>Close</button>
                                    <button 
                                        type="button" 
                                        className="btn btn-danger" 
                                        onClick={handleCancelAppointment}
                                        disabled={!cancelData.cancellation_reason.trim()}
                                    >
                                        Cancel Appointment
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" onClick={() => setShowCancelModal(false)}></div>
                </>
            )}
        </div>
    );
};

export default USGAppointmentManagementLayer;