import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireApproval?: boolean;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requireApproval = true,
  requireAdmin = false,
  requireSuperAdmin = false
}: ProtectedRouteProps) {
  const { user, profile, memberships, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/sign-in" replace />;
  }

  if (requireApproval) {
    const hasApprovedMembership = memberships.some(m => m.is_approved);
    if (!hasApprovedMembership) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
          <div className="text-center space-y-4 max-w-md">
            <h2 className="text-2xl font-bold">Pending Approval</h2>
            <p className="text-muted-foreground">
              Your account is awaiting approval from an administrator. 
              You'll receive an email notification once your access is approved.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="text-primary hover:underline"
            >
              Refresh page
            </button>
          </div>
        </div>
      );
    }
  }

  if (requireSuperAdmin && !profile?.is_super_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireAdmin && !profile?.is_super_admin) {
    const isAdmin = memberships.some(m => m.is_admin && m.is_approved);
    if (!isAdmin) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}