import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from '../components/common/LoadingScreen';
import type { UserRole } from '../types';

export default function RoleRoute({ allow }: { allow: UserRole[] }) {
  const { profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!profile) return <Navigate to="/login" replace />;
  if (!allow.includes(profile.role)) return <Navigate to="/access-denied" replace />;

  return <Outlet />;
}
