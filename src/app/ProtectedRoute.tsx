import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Gate for authenticated routes. While the initial session check runs, show a
 * skeleton; if unauthenticated, redirect to /login preserving the intended path.
 */
export function ProtectedRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-8" aria-busy="true">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
