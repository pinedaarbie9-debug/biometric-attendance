import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';

import Login from '../pages/Login';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import AccessDenied from '../pages/AccessDenied';
import BiometricTerminal from '../pages/BiometricTerminal';

import AdminDashboard from '../pages/AdminDashboard';
import StudentDirectory from '../pages/EmployeeDirectory';
import DepartmentManagement from '../pages/DepartmentManagement';
import AttendanceLog from '../pages/AttendanceLog';
import LeaveManagement from '../pages/LeaveManagement';
import Reports from '../pages/Reports';
import Settings from '../pages/Settings';
import AuditLogs from '../pages/AuditLogs';

import MyAttendance from '../pages/employee/MyAttendance';
import CredentialSettings from '../pages/employee/CredentialSettings';

function RootRedirect() {
  const { session, profile, isAdmin, loading } = useAuth();

  // Wait for both loading AND profile to be ready
  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;

  // If session exists but profile hasn't loaded yet, wait
  if (!profile) return null;

  return <Navigate to={isAdmin ? '/admin' : '/me'} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/access-denied" element={<AccessDenied />} />
      <Route path="/" element={<RootRedirect />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/terminal" element={<BiometricTerminal />} />

        {/* Admin-only */}
        <Route element={<RoleRoute allow={['admin']} />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/employees" element={<StudentDirectory />} />
          <Route path="/admin/departments" element={<DepartmentManagement />} />
          <Route path="/admin/attendance" element={<AttendanceLog />} />
          <Route path="/admin/leave" element={<LeaveManagement />} />
          <Route path="/admin/reports" element={<Reports />} />
          <Route path="/admin/settings" element={<Settings />} />
          <Route path="/admin/audit-logs" element={<AuditLogs />} />
        </Route>

        {/* Student (and admin can view own too) */}
        <Route element={<RoleRoute allow={['admin', 'student']} />}>
          <Route path="/me" element={<MyAttendance />} />
          <Route path="/me/leave" element={<LeaveManagement />} />
          <Route path="/me/settings" element={<CredentialSettings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}