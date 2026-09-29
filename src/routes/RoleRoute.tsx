import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from '../components/common/LoadingScreen';
import { logSecurityEvent } from '../services/auditService';
import type { UserRole } from '../types';

export default function RoleRoute({ allow }: { allow: UserRole[] }) {
  const { profile, loading } = useAuth();
  const location = useLocation();

  // Only unauthorized if: not loading, profile exists, and role is not allowed
  const isUnauthorized = !loading && profile !== null && !allow.includes(profile.role);

  useEffect(() => {
    if (isUnauthorized && profile) {
      logSecurityEvent({
        employeeId: profile.id,
        eventType: 'ACCESS_DENIED',
        description: `${profile.role} tried to access ${location.pathname} (requires: ${allow.join(', ')})`,
      }).catch((err) => console.error('Failed to log security event:', err));
    }
  }, [isUnauthorized, location.pathname, profile, allow]);

  // Wait for auth to finish loading before making any decisions
  if (loading) return <LoadingScreen />;

  // If no profile after loading, redirect to login
  if (!profile) return <Navigate to="/login" replace />;

  // If role is not allowed, redirect to access denied
  if (!allow.includes(profile.role)) return <Navigate to="/access-denied" replace />;

  // Authorized - render the protected route
  return <Outlet />;
}