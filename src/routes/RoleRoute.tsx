import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from '../components/common/LoadingScreen';
import { logSecurityEvent } from '../services/auditService';
import type { UserRole } from '../types';

export default function RoleRoute({ allow }: { allow: UserRole[] }) {
  const { profile, loading } = useAuth();
  const location = useLocation();

  const isUnauthorized = !loading && profile && !allow.includes(profile.role);

  useEffect(() => {
    if (isUnauthorized) {
      logSecurityEvent({
        employeeId: profile!.id,
        eventType: 'ACCESS_DENIED',
        description: `${profile!.role} tried to access ${location.pathname} (requires: ${allow.join(', ')})`,
      }).catch((err) => console.error('Failed to log security event:', err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUnauthorized, location.pathname]);

  if (loading) return <LoadingScreen />;
  if (!profile) return <Navigate to="/login" replace />;
  if (!allow.includes(profile.role)) return <Navigate to="/access-denied" replace />;

  return <Outlet />;
}