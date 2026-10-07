const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const getAuthToken = () => localStorage.getItem('access_token');

export const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const headers = {
    ...options.headers,
  };

  if (token && !options.skipAuth) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.clear();
      window.location.href = '/sign-in';
    }
    
    const errorData = await response.json().catch(() => ({}));
    
    // Handle account lockout (429)
    if (response.status === 429) {
      throw new Error(errorData.detail || 'Too many requests. Please try again later.');
    }
    
    // Handle validation errors (422)
    if (response.status === 422 && errorData.detail) {
      const passwordError = Array.isArray(errorData.detail) 
        ? errorData.detail.find(err => err.loc && err.loc.includes('password'))
        : null;
      
      if (passwordError) {
        throw new Error(passwordError.msg || 'Password validation failed');
      }
    }
    
    // Handle other errors
    if (errorData.detail) {
      console.error('[API ERROR DETAIL]', JSON.stringify(errorData.detail));
      throw new Error(typeof errorData.detail === 'string' ? errorData.detail : `API Error: ${response.status}`);
    }
    
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
};

export const authAPI = {
  login: async (username, password) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    formData.append('grant_type', '');
    formData.append('scope', '');
    formData.append('client_id', '');
    formData.append('client_secret', '');

    const response = await fetch(`${API_BASE_URL}/api/v2/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle account lockout (429)
      if (response.status === 429) {
        throw new Error(errorData.detail || 'Account locked due to too many failed login attempts.');
      }
      
      // Handle failed login (401)
      if (response.status === 401) {
        throw new Error(errorData.detail || 'Invalid username or password');
      }
      
      throw new Error(errorData.detail || `Login failed: ${response.status}`);
    }

    return response.json();
  },

  forgotPassword: (data) => apiRequest('/api/v2/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    skipAuth: true,
  }),

  resetPassword: (data) => apiRequest('/api/v2/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    skipAuth: true,
  }),

  changePassword: async (oldPassword, newPassword) => {
    const formData = new URLSearchParams();
    formData.append('old_password', oldPassword);
    formData.append('new_password', newPassword);
    return apiRequest('/api/v2/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    });
  },

  getPasswordRequirements: () => apiRequest('/api/v2/auth/password-requirements', { skipAuth: true }),
  getRoles: () => apiRequest('/api/v2/auth/roles', { skipAuth: true }),
  getDeliveryTypes: () => apiRequest('/api/v2/auth/delivery-types', { skipAuth: true }),
  getScanTypesOptions: () => apiRequest('/api/v2/auth/scan-types-options'),
  getAbnormalFindingsOptions: () => apiRequest('/api/v2/auth/abnormal-findings-options'),
  getCurrentUser: () => apiRequest('/api/v2/auth/me'),
};

export const userAPI = {
  getUsers: (skip = 0, limit = 100, role = null, isActive = null) => {
    const params = new URLSearchParams();
    params.append('skip', skip);
    params.append('limit', limit);
    if (role) params.append('role', role);
    if (isActive !== null) params.append('is_active', isActive);
    return apiRequest(`/api/v2/users/?${params}`);
  },
  getUserById: (userId) => apiRequest(`/api/v2/users/${userId}`),
  createUser: (userData) => apiRequest('/api/v2/users/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  }),
  updateUser: (userId, userData) => apiRequest(`/api/v2/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  }),
  deleteUser: (userId) => apiRequest(`/api/v2/users/${userId}`, {
    method: 'DELETE',
  }),
  activateUser: (userId) => apiRequest(`/api/v2/users/${userId}/activate`, {
    method: 'POST',
  }),
  getUserWards: (userId) => apiRequest(`/api/v2/users/${userId}/wards`),
  updateUserWards: (userId, wardIds) => apiRequest(`/api/v2/users/${userId}/wards`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(wardIds),
  }),
};

export const dashboardAPI = {
  getStats: () => apiRequest('/api/v2/dashboard/stats'),
  getDistrictOverview: () => apiRequest('/api/v2/dashboard/district-overview'),
  getMonthlyTrends: (year) => apiRequest(`/api/v2/dashboard/analytics/monthly-trends?year=${year}`),
  getDailyTrends: (month, year) => apiRequest(`/api/v2/dashboard/analytics/daily-trends?month=${month}&year=${year}`),
  getWeeklyTrends: (year) => apiRequest(`/api/v2/dashboard/analytics/weekly-trends?year=${year}`),
  getTodayStats: () => apiRequest('/api/v2/dashboard/analytics/today-stats'),
  getHighRiskAnalysis: () => apiRequest('/api/v2/dashboard/analytics/high-risk-analysis'),
  getUSGPerformance: (startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return apiRequest(`/api/v2/dashboard/analytics/usg-performance?${params}`);
  },
  getBlockWiseTrends: (year) => apiRequest(`/api/v2/dashboard/analytics/block-wise-trends?year=${year}`),
  getWardWiseTrends: (blockId, year) => apiRequest(`/api/v2/dashboard/analytics/ward-wise-trends?block_id=${blockId}&year=${year}`),
  getQuickStats: () => apiRequest('/api/v2/dashboard/quick-stats'),
  getUnreadNotifications: () => apiRequest('/api/v2/dashboard/notifications/unread-count'),
  
  // Block Dashboard APIs
  getBlockWardComparison: () => apiRequest('/api/v2/dashboard/block/ward-comparison'),
  getBlockSubcentrePerformance: () => apiRequest('/api/v2/dashboard/block/subcentre-performance'),
  getBlockUSGStatusBreakdown: () => apiRequest('/api/v2/dashboard/block/usg-status-breakdown'),
  getBlockMonthlyRegistrations: (year = new Date().getFullYear()) => apiRequest(`/api/v2/dashboard/block/monthly-registrations?year=${year}`),
  getBlockGrievanceTrends: () => apiRequest('/api/v2/dashboard/block/grievance-trends'),
  getBlockHighRiskTimeline: (months = 6) => apiRequest(`/api/v2/dashboard/block/high-risk-timeline?months=${months}`),

  // District enhanced dashboard
  getDistrictGrievanceTrends: () => apiRequest('/api/v2/dashboard/district/grievance-trends'),
  getDistrictHighRiskTimeline: (months = 6) => apiRequest(`/api/v2/dashboard/district/high-risk-timeline?months=${months}`),
};

export const pregnantWomenAPI = {
  // Staff registration
  registerPregnantWoman: (data) => apiRequest('/api/v2/pregnant-women', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  
  // Get all pregnant women with filters
  getPregnantWomen: (skip = 0, limit = 100, districtId = null, blockId = null, subCentreId = null, isHighRisk = null, isActive = null, registrationApproved = null) => {
    const params = new URLSearchParams();
    params.append('skip', skip);
    params.append('limit', limit);
    if (districtId) params.append('district_id', districtId);
    if (blockId) params.append('block_id', blockId);
    if (subCentreId) params.append('sub_centre_id', subCentreId);
    if (isHighRisk !== null) params.append('is_high_risk', isHighRisk);
    if (isActive !== null) params.append('is_active', isActive);
    if (registrationApproved !== null) params.append('registration_approved', registrationApproved);
    return apiRequest(`/api/v2/pregnant-women/?${params}`);
  },
  
  // Get pending approvals
  getPendingApprovals: () => apiRequest('/api/v2/pregnant-women/pending-approval'),
  
  // Get specific pregnant woman
  getPregnantWomanById: (pwId) => apiRequest(`/api/v2/pregnant-women/${pwId}`),
  
  // Update pregnant woman
  updatePregnantWoman: (id, data) => apiRequest(`/api/v2/pregnant-women/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  
  // Approve registration
  approveRegistration: (id) => apiRequest(`/api/v2/pregnant-women/${id}/approve`, {
    method: 'POST',
  }),
  
  // Bulk upload
  bulkUpload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiRequest('/api/v2/pregnant-women/bulk-upload', {
      method: 'POST',
      body: formData,
    });
  },
  
  // Search by mobile number
  searchByMobile: (mobileNumber) => apiRequest(`/api/v2/pregnant-women/search/by-mobile/${mobileNumber}`),
};

export const adminAPI = {
  getDistricts: (skip = 0, limit = 100, isActive = null) => {
    const params = new URLSearchParams();
    params.append('skip', skip);
    params.append('limit', limit);
    if (isActive !== null) params.append('is_active', isActive);
    return apiRequest(`/api/v2/admin/districts?${params}`);
  },
  getBlocks: (skip = 0, limit = 100, districtId = null, isActive = null) => {
    const params = new URLSearchParams();
    params.append('skip', skip);
    params.append('limit', limit);
    if (districtId) params.append('district_id', districtId);
    if (isActive !== null) params.append('is_active', isActive);
    return apiRequest(`/api/v2/admin/blocks?${params}`);
  },
  getBlockById: (blockId) => apiRequest(`/api/v2/admin/blocks/${blockId}`),
  createBlock: (blockData) => apiRequest('/api/v2/admin/blocks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(blockData),
  }),
  updateBlock: (blockId, blockData) => apiRequest(`/api/v2/admin/blocks/${blockId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(blockData),
  }),
  deleteBlock: (blockId) => apiRequest(`/api/v2/admin/blocks/${blockId}`, {
    method: 'DELETE',
  }),
  getWards: (skip = 0, limit = 100, blockId = null, isActive = null) => {
    const params = new URLSearchParams();
    params.append('skip', skip);
    params.append('limit', limit);
    if (blockId) params.append('block_id', blockId);
    if (isActive !== null) params.append('is_active', isActive);
    return apiRequest(`/api/v2/admin/wards?${params}`);
  },
  getWardById: (wardId) => apiRequest(`/api/v2/admin/wards/${wardId}`),
  createWard: (wardData) => apiRequest('/api/v2/admin/wards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(wardData),
  }),
  updateWard: (wardId, wardData) => apiRequest(`/api/v2/admin/wards/${wardId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(wardData),
  }),
  deleteWard: (wardId) => apiRequest(`/api/v2/admin/wards/${wardId}`, {
    method: 'DELETE',
  }),
  getSubCentres: (skip = 0, limit = 100, blockId = null, isActive = null) => {
    const params = new URLSearchParams();
    params.append('skip', skip);
    params.append('limit', limit);
    if (blockId) params.append('block_id', blockId);
    if (isActive !== null) params.append('is_active', isActive);
    return apiRequest(`/api/v2/admin/sub-centres?${params}`);
  },
  getSubCentreById: (subCentreId) => apiRequest(`/api/v2/admin/sub-centres/${subCentreId}`),
  createSubCentre: (subCentreData) => apiRequest('/api/v2/admin/sub-centres', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subCentreData),
  }),
  updateSubCentre: (subCentreId, subCentreData) => apiRequest(`/api/v2/admin/sub-centres/${subCentreId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subCentreData),
  }),
  deleteSubCentre: (subCentreId) => apiRequest(`/api/v2/admin/sub-centres/${subCentreId}`, {
    method: 'DELETE',
  }),
  getUSGCentres: (skip = 0, limit = 100, districtId = null, blockId = null, wardId = null, isActive = null) => {
    const params = new URLSearchParams();
    params.append('skip', skip);
    params.append('limit', limit);
    if (districtId) params.append('district_id', districtId);
    if (blockId) params.append('block_id', blockId);
    if (wardId) params.append('ward_id', wardId);
    if (isActive !== null) params.append('is_active', isActive);
    return apiRequest(`/api/v2/admin/usg-centres?${params}`);
  },
  getUSGCentreById: (usgCentreId) => apiRequest(`/api/v2/admin/usg-centres/${usgCentreId}`),
  createUSGCentre: (usgCentreData) => apiRequest('/api/v2/admin/usg-centres', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(usgCentreData),
  }),
  updateUSGCentre: (usgCentreId, usgCentreData) => apiRequest(`/api/v2/admin/usg-centres/${usgCentreId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(usgCentreData),
  }),
  deleteUSGCentre: (usgCentreId) => apiRequest(`/api/v2/admin/usg-centres/${usgCentreId}`, {
    method: 'DELETE',
  }),
  
  // Block-SubCentre Mapping
  getSubCentreBlocks: (subCentreId) => apiRequest(`/api/v2/admin/sub-centres/${subCentreId}/blocks`),
  mapBlocksToSubCentre: (subCentreId, blockIds) => apiRequest(`/api/v2/admin/sub-centres/${subCentreId}/blocks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ block_ids: blockIds }),
  }),
  removeBlockMapping: (subCentreId, blockId) => apiRequest(`/api/v2/admin/sub-centres/${subCentreId}/blocks/${blockId}`, {
    method: 'DELETE',
  }),
  
  // Ward-SubCentre Mapping
  getSubCentreWards: (subCentreId) => apiRequest(`/api/v2/admin/sub-centres/${subCentreId}/wards`),
  mapWardsToSubCentre: (subCentreId, wardIds) => apiRequest(`/api/v2/admin/sub-centres/${subCentreId}/wards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ward_ids: wardIds }),
  }),
  removeWardMapping: (subCentreId, wardId) => apiRequest(`/api/v2/admin/sub-centres/${subCentreId}/wards/${wardId}`, {
    method: 'DELETE',
  }),
};

export const grievanceAPI = {
  getGrievances: (skip = 0, limit = 100, status = null) => {
    const params = new URLSearchParams();
    params.append('skip', skip);
    params.append('limit', limit);
    if (status) params.append('status', status);
    return apiRequest(`/api/v2/grievances/?${params}`);
  },
  getPendingGrievances: () => apiRequest('/api/v2/grievances/pending'),
  getOverdueGrievances: () => apiRequest('/api/v2/grievances/overdue'),
  getGrievanceById: (grievanceId) => apiRequest(`/api/v2/grievances/${grievanceId}`),
  updateGrievance: (grievanceId, updateData) => apiRequest(`/api/v2/grievances/${grievanceId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData),
  }),
  resolveGrievance: (grievanceId, resolutionNote) => {
    const params = new URLSearchParams();
    params.append('resolution_note', resolutionNote);
    return apiRequest(`/api/v2/grievances/${grievanceId}/resolve?${params}`, {
      method: 'POST',
    });
  },
  autoEscalateGrievances: () => apiRequest('/api/v2/grievances/auto-escalate', {
    method: 'POST',
  }),
};

export const usgAppointmentAPI = {
  scheduleAppointment: (formData) => apiRequest('/api/v2/usg-appointments/', {
    method: 'POST',
    body: formData,
  }),
  getAppointments: (skip = 0, limit = 100, status = null, usgCentreId = null, appointmentType = null, startDate = null, endDate = null) => {
    const params = new URLSearchParams();
    params.append('skip', skip);
    params.append('limit', limit);
    if (status) params.append('status', status);
    if (usgCentreId) params.append('usg_centre_id', usgCentreId);
    if (appointmentType) params.append('appointment_type', appointmentType);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return apiRequest(`/api/v2/usg-appointments?${params}`);
  },
  getPendingAppointments: () => apiRequest('/api/v2/usg-appointments/pending'),
  getAppointmentById: (appointmentId) => apiRequest(`/api/v2/usg-appointments/${appointmentId}`),
  updateAppointment: (appointmentId, formData) => apiRequest(`/api/v2/usg-appointments/${appointmentId}`, {
    method: 'PUT',
    body: formData,
  }),
  cancelAppointment: (appointmentId, cancellationReason) => apiRequest(`/api/v2/usg-appointments/${appointmentId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cancellation_reason: cancellationReason }),
  }),
  acceptAppointment: (appointmentId) => apiRequest(`/api/v2/usg-appointments/${appointmentId}/accept`, {
    method: 'POST',
  }),
  rescheduleAppointment: (appointmentId, rescheduleData) => apiRequest(`/api/v2/usg-appointments/${appointmentId}/reschedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rescheduleData),
  }),
  completeAppointment: (appointmentId, formData) => apiRequest(`/api/v2/usg-appointments/${appointmentId}/complete`, {
    method: 'POST',
    body: formData,
  }),
  getOverdueEmergencyAppointments: () => apiRequest('/api/v2/usg-appointments/overdue/emergency'),
};

export const ancVisitAPI = {
  createVisit: (visitData) => apiRequest('/api/v2/anc-visits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(visitData),
  }),
  getVisits: (skip = 0, limit = 100, pregnantWomanId = null, visitNumber = null, startDate = null, endDate = null, referredForUSG = null) => {
    const params = new URLSearchParams();
    params.append('skip', skip);
    params.append('limit', limit);
    if (pregnantWomanId) params.append('pregnant_woman_id', pregnantWomanId);
    if (visitNumber) params.append('visit_number', visitNumber);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (referredForUSG !== null) params.append('referred_for_usg', referredForUSG);
    return apiRequest(`/api/v2/anc-visits/?${params}`);
  },
  getVisitById: (visitId) => apiRequest(`/api/v2/anc-visits/${visitId}`),
  updateVisit: (visitId, visitData) => apiRequest(`/api/v2/anc-visits/${visitId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(visitData),
  }),
  deleteVisit: (visitId) => apiRequest(`/api/v2/anc-visits/${visitId}`, {
    method: 'DELETE',
  }),
  getVisitsForPregnantWoman: (pwId) => apiRequest(`/api/v2/anc-visits/pregnant-woman/${pwId}`),
  getVisitsDueToday: () => apiRequest('/api/v2/anc-visits/due/today'),
  getOverdueVisits: () => apiRequest('/api/v2/anc-visits/overdue/list'),
  getStatistics: () => apiRequest('/api/v2/anc-visits/statistics/summary'),
};

export const reportsAPI = {
  // Phase 1: Essential Reports
  getHighRiskTracking: (startDate = null, endDate = null, page = 1, pageSize = 50) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    params.append('page', page);
    params.append('page_size', pageSize);
    return apiRequest(`/api/v2/reports/high-risk-tracking?${params}`);
  },
  getANCCompliance: (startDate = null, endDate = null, page = 1, pageSize = 50) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    params.append('page', page);
    params.append('page_size', pageSize);
    return apiRequest(`/api/v2/reports/anc-compliance?${params}`);
  },
  getUSGStatus: (startDate = null, endDate = null, statusFilter = null, page = 1, pageSize = 50) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (statusFilter) params.append('status_filter', statusFilter);
    params.append('page', page);
    params.append('page_size', pageSize);
    return apiRequest(`/api/v2/reports/usg-status?${params}`);
  },
  getGrievancePerformance: (startDate = null, endDate = null) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return apiRequest(`/api/v2/reports/grievance-performance?${params}`);
  },
  
  // Phase 2: Advanced Analytics
  getComparativeAnalysis: (startDate = null, endDate = null, comparisonType = 'block') => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    params.append('comparison_type', comparisonType);
    return apiRequest(`/api/v2/reports/comparative-analysis?${params}`);
  },
  getTrends: (months = 6, metric = 'registrations') => {
    const params = new URLSearchParams();
    params.append('months', months);
    params.append('metric', metric);
    return apiRequest(`/api/v2/reports/trends?${params}`);
  },
  
  // Phase 3: Operational Reports
  getUserActivity: (startDate = null, endDate = null) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return apiRequest(`/api/v2/reports/user-activity?${params}`);
  },
  getSMSDelivery: (startDate = null, endDate = null) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return apiRequest(`/api/v2/reports/sms-delivery?${params}`);
  },
  
  // Legacy Reports
  getDistrictPerformance: (startDate = null, endDate = null, blockId = null) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (blockId) params.append('block_id', blockId);
    return apiRequest(`/api/v2/reports/district/performance?${params}`);
  },
  exportDistrictReport: async (format, startDate = null, endDate = null, blockId = null) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (blockId) params.append('block_id', blockId);
    const token = getAuthToken();
    return fetch(`${API_BASE_URL}/api/v2/reports/district/export/${format}?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  },
  getBlockWardWise: (startDate = null, endDate = null, wardId = null) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (wardId) params.append('ward_id', wardId);
    return apiRequest(`/api/v2/reports/block/ward-wise?${params}`);
  },
  exportBlockReport: async (format, startDate = null, endDate = null, wardId = null) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (wardId) params.append('ward_id', wardId);
    const token = getAuthToken();
    return fetch(`${API_BASE_URL}/api/v2/reports/block/export/${format}?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  },
  getSubCentreActivity: (startDate = null, endDate = null) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return apiRequest(`/api/v2/reports/sub-centre/activity?${params}`);
  },
  getUSGCentreAppointments: (startDate = null, endDate = null) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return apiRequest(`/api/v2/reports/usg-centre/appointments?${params}`);
  },
  
  // Cache Management
  clearCache: () => apiRequest('/api/v2/reports/clear-cache', { method: 'POST' }),

  // Delivery Reports
  getDeliverySummary: (startDate = null, endDate = null) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return apiRequest(`/api/v2/reports/delivery/summary?${params}`);
  },
  getDeliveryOutcomeBreakdown: (startDate = null, endDate = null) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return apiRequest(`/api/v2/reports/delivery/outcome-breakdown?${params}`);
  },
  getDeliveryPointPerformance: (startDate = null, endDate = null) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return apiRequest(`/api/v2/reports/delivery/point-performance?${params}`);
  },
  getECGSummary: (startDate = null, endDate = null) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return apiRequest(`/api/v2/reports/ecg-summary?${params}`);
  },
};

export const auditAPI = {
  logout: () => apiRequest('/api/v2/auth/logout', { method: 'POST' }),
  getLogs: (skip = 0, limit = 100, userId = null, action = null, entityType = null, entityId = null, startDate = null, endDate = null) => {
    const params = new URLSearchParams();
    params.append('skip', skip);
    params.append('limit', limit);
    if (userId) params.append('user_id', userId);
    if (action) params.append('action', action);
    if (entityType) params.append('entity_type', entityType);
    if (entityId) params.append('entity_id', entityId);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return apiRequest(`/api/v2/audit/logs?${params}`);
  },
  getLogById: (logId) => apiRequest(`/api/v2/audit/logs/${logId}`),
  getUserActivity: (userId, days = 30) => apiRequest(`/api/v2/audit/user/${userId}/activity?days=${days}`),
  getEntityHistory: (entityType, entityId) => apiRequest(`/api/v2/audit/entity/${entityType}/${entityId}/history`),
  getStatistics: (days = 30) => apiRequest(`/api/v2/audit/statistics/summary?days=${days}`),
  getRecentActivities: (limit = 50) => apiRequest(`/api/v2/audit/recent?limit=${limit}`),
  getFilters: () => apiRequest('/api/v2/audit/filters'),
};

export const aiReportsAPI = {
  // Submit question — returns job_id instantly
  ask: async (question) => {
    const token = getAuthToken();
    const params = new URLSearchParams();
    params.append('question', question);

    const response = await fetch(`${API_BASE_URL}/api/v2/ai-reports/ask?${params}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Backend error response:', data);
      const error = new Error('AI Reports API Error');
      error.response = { data, status: response.status };
      throw error;
    }

    return data; // { job_id, status: 'processing', ... }
  },

  // Poll job status
  getJobStatus: (jobId) => apiRequest(`/api/v2/ai-reports/status/${jobId}`),

  getHistory: (startDate = null, endDate = null, skip = 0, limit = 20) => {
    const params = new URLSearchParams();
    params.append('skip', skip);
    params.append('limit', limit);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return apiRequest(`/api/v2/ai-reports/history?${params}`);
  },
};

export const deliveryReferralAPI = {
  getReferrals: (status = null) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    return apiRequest(`/api/v2/delivery-referrals/?${params}`);
  },
  getReferralById: (referralId) => apiRequest(`/api/v2/delivery-referrals/${referralId}`),
  createReferral: (data) => apiRequest('/api/v2/delivery-referrals/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  acceptReferral: (referralId) => apiRequest(`/api/v2/delivery-referrals/${referralId}/accept`, {
    method: 'POST',
  }),
  reRefer: (referralId, formData) => apiRequest(`/api/v2/delivery-referrals/${referralId}/re-refer`, {
    method: 'POST',
    body: formData,
  }),
  recordOutcome: (referralId, data) => apiRequest(`/api/v2/delivery-referrals/${referralId}/outcome`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  recordOutcomeBySubCentre: (referralId, data) => apiRequest(`/api/v2/delivery-referrals/${referralId}/outcome-by-subcentre`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
};

export const deliveryPointAPI = {
  getDeliveryPoints: (districtId = null, blockId = null, isActive = null) => {
    const params = new URLSearchParams();
    if (districtId) params.append('district_id', districtId);
    if (blockId) params.append('block_id', blockId);
    if (isActive !== null) params.append('is_active', isActive);
    return apiRequest(`/api/v2/admin/delivery-points?${params}`);
  },
  getDeliveryPointById: (dpId) => apiRequest(`/api/v2/admin/delivery-points/${dpId}`),
  createDeliveryPoint: (data) => apiRequest('/api/v2/admin/delivery-points', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  updateDeliveryPoint: (dpId, data) => apiRequest(`/api/v2/admin/delivery-points/${dpId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  deleteDeliveryPoint: (dpId) => apiRequest(`/api/v2/admin/delivery-points/${dpId}`, {
    method: 'DELETE',
  }),
};

export const notificationAPI = {
  getNotifications: (skip = 0, limit = 20, isRead = null, category = null, priority = null) => {
    const params = new URLSearchParams();
    params.append('skip', skip);
    params.append('limit', limit);
    if (isRead !== null) params.append('is_read', isRead);
    if (category) params.append('category', category);
    if (priority) params.append('priority', priority);
    return apiRequest(`/api/v2/notifications/?${params}`);
  },
  getUnreadCount: () => apiRequest('/api/v2/notifications/unread-count'),
  getStatistics: () => apiRequest('/api/v2/notifications/statistics'),
  getNotificationById: (notificationId) => apiRequest(`/api/v2/notifications/${notificationId}`),
  markAsRead: (notificationId) => apiRequest(`/api/v2/notifications/${notificationId}/read`, { method: 'PUT' }),
  markAllAsRead: () => apiRequest('/api/v2/notifications/mark-all-read', { method: 'PUT' }),
  deleteNotification: (notificationId) => apiRequest(`/api/v2/notifications/${notificationId}`, { method: 'DELETE' }),
  clearAllRead: () => apiRequest('/api/v2/notifications/clear-all', { method: 'DELETE' }),
};

export const ecgReportAPI = {
  createReport: (formData) => apiRequest('/api/v2/ecg-reports/', {
    method: 'POST',
    body: formData,
  }),
  getReports: (result = null, startDate = null, endDate = null) => {
    const params = new URLSearchParams();
    if (result) params.append('result', result);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return apiRequest(`/api/v2/ecg-reports/?${params}`);
  },
  getReportById: (id) => apiRequest(`/api/v2/ecg-reports/${id}`),
  getReportsForWoman: (pwId) => apiRequest(`/api/v2/ecg-reports/pregnant-woman/${pwId}`),
};

export const ivrAPI = {
  getCallLogs: (callType = null, callStatus = null, skip = 0, limit = 100) => {
    const params = new URLSearchParams();
    params.append('skip', skip);
    params.append('limit', limit);
    if (callType) params.append('call_type', callType);
    if (callStatus) params.append('call_status', callStatus);
    return apiRequest(`/api/v2/ivr/call-logs?${params}`);
  },
  getCallLogsForWoman: (pwId) => apiRequest(`/api/v2/ivr/call-logs/${pwId}`),
  triggerHighRiskCalls: () => apiRequest('/api/v2/ivr/trigger-high-risk', { method: 'POST' }),
  triggerFeedbackCall1: (usgAppointmentId) => apiRequest(`/api/v2/ivr/trigger-feedback-call-1/${usgAppointmentId}`, { method: 'POST' }),
  triggerFeedbackCall2: (pregnantWomanId) => apiRequest(`/api/v2/ivr/trigger-feedback-call-2/${pregnantWomanId}`, { method: 'POST' }),
  syncStatus: () => apiRequest('/api/v2/ivr/sync-status', { method: 'POST' }),
};