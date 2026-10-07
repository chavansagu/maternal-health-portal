import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardDistrictPage from "./pages/DashboardDistrictPage";
import DashboardBlockPage from "./pages/DashboardBlockPage";
import DashboardSubCentrePage from "./pages/DashboardSubCentrePage";
import DashboardUSGCentrePage from "./pages/DashboardUSGCentrePage";
import ErrorPage from "./pages/ErrorPage";
import SignInPage from "./pages/SignInPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import AddUserPage from "./pages/AddUserPage";
import UsersListPage from "./pages/UsersListPage";
import RouteScrollToTop from "./helper/RouteScrollToTop";
import AdministrativeManagementPage from "./pages/AdministrativeManagementPage";
import PregnantWomenManagementPage from "./pages/PregnantWomenManagementPage";
import USGAppointmentManagementPage from "./pages/USGAppointmentManagementPage";
import ANCVisitManagementPage from "./pages/ANCVisitManagementPage";
import ReportsPage from "./pages/ReportsPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import NotificationPage from "./pages/NotificationPage";
import DashboardDPPage from "./pages/DashboardDPPage";
import DashboardPMSMAPage from "./pages/DashboardPMSMAPage";
import PMSMASessionManagementPage from "./pages/PMSMASessionManagementPage";
import PMSMASchedulingPage from "./pages/PMSMASchedulingPage";
import DeliveryReferralManagementPage from "./pages/DeliveryReferralManagementPage";
import MobilisationManagementPage from "./pages/MobilisationManagementPage";
import PNCReminderManagementPage from "./pages/PNCReminderManagementPage";
import IVRCallLogsPage from "./pages/IVRCallLogsPage";

function App() {
  return (
    <BrowserRouter>
      <RouteScrollToTop />
      <Routes>
        <Route exact path='/' element={<Navigate to='/sign-in' replace />} />
        
        <Route exact path='/users-list' element={<UsersListPage />} />
        <Route exact path='/add-user' element={<AddUserPage />} />
        <Route exact path='/dashboard-district' element={<ProtectedRoute allowedRoles={['district']}><DashboardDistrictPage /></ProtectedRoute>} />
        <Route exact path='/dashboard-block' element={<ProtectedRoute allowedRoles={['block']}><DashboardBlockPage /></ProtectedRoute>} />
        <Route exact path='/dashboard-sub-centre' element={<ProtectedRoute allowedRoles={['sub_centre']}><DashboardSubCentrePage /></ProtectedRoute>} />
        <Route exact path='/dashboard-usg-centre' element={<ProtectedRoute allowedRoles={['usg_centre']}><DashboardUSGCentrePage /></ProtectedRoute>} />
        <Route exact path='/sign-in' element={<SignInPage />} />
        <Route exact path='/forgot-password' element={<ForgotPasswordPage />} />
        <Route exact path='/reset-password' element={<ResetPasswordPage />} />
        <Route exact path='/change-password' element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
        <Route exact path='/administrative-management' element={<AdministrativeManagementPage />} />
        <Route exact path='/pregnant-women-management' element={<ProtectedRoute allowedRoles={['district', 'block', 'sub_centre']}><PregnantWomenManagementPage /></ProtectedRoute>} />
        <Route exact path='/usg-appointment-management' element={<ProtectedRoute allowedRoles={['block', 'usg_centre', 'district', 'pmsma']}><USGAppointmentManagementPage /></ProtectedRoute>} />
        <Route exact path='/anc-visit-management' element={<ANCVisitManagementPage />} />
        <Route exact path='/reports' element={<ReportsPage />} />
        <Route exact path='/audit-logs' element={<ProtectedRoute allowedRoles={['district', 'block']}><AuditLogsPage /></ProtectedRoute>} />
        <Route exact path='/notifications' element={<ProtectedRoute><NotificationPage /></ProtectedRoute>} />
        <Route exact path='/dashboard-dp' element={<ProtectedRoute allowedRoles={['dp']}><DashboardDPPage /></ProtectedRoute>} />
        <Route exact path='/dashboard-pmsma' element={<ProtectedRoute allowedRoles={['pmsma']}><DashboardPMSMAPage /></ProtectedRoute>} />
        <Route exact path='/pmsma-sessions' element={<ProtectedRoute allowedRoles={['pmsma', 'district']}><PMSMASessionManagementPage /></ProtectedRoute>} />
        <Route exact path='/pmsma-scheduling' element={<ProtectedRoute allowedRoles={['sub_centre']}><PMSMASchedulingPage /></ProtectedRoute>} />
        <Route exact path='/delivery-referral-management' element={<ProtectedRoute allowedRoles={['sub_centre', 'dp', 'block', 'district', 'pmsma']}><DeliveryReferralManagementPage /></ProtectedRoute>} />
        <Route exact path='/mobilisation-management' element={<ProtectedRoute allowedRoles={['sub_centre', 'block', 'district']}><MobilisationManagementPage /></ProtectedRoute>} />
        <Route exact path='/pnc-reminders' element={<ProtectedRoute allowedRoles={['sub_centre', 'block', 'district']}><PNCReminderManagementPage /></ProtectedRoute>} />
        <Route exact path='/ivr-call-logs' element={<ProtectedRoute allowedRoles={['district', 'block']}><IVRCallLogsPage /></ProtectedRoute>} />
        <Route exact path='*' element={<ErrorPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;