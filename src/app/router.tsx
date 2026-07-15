import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { RouteError } from './RouteError';
import { Skeleton } from '@/components/ui/skeleton';

// Per-route code-splitting (architecture §14). Pages are named exports, so map
// them to the default export React.lazy expects.
const Dashboard = lazy(() =>
  import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })),
);
const MonthView = lazy(() =>
  import('@/pages/MonthView').then((m) => ({ default: m.MonthView })),
);
const Categories = lazy(() =>
  import('@/pages/Categories').then((m) => ({ default: m.Categories })),
);
const Debts = lazy(() => import('@/pages/Debts').then((m) => ({ default: m.Debts })));
const Investments = lazy(() =>
  import('@/pages/Investments').then((m) => ({ default: m.Investments })),
);
const Login = lazy(() => import('@/pages/Login').then((m) => ({ default: m.Login })));

function Lazy({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 p-8">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-40 w-full" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

// Routes through Phase 5: dashboard (index), month view, categories, debts,
// investments. Later phases register /year, /recommended.
export const router = createBrowserRouter([
  { path: '/login', element: <Lazy><Login /></Lazy>, errorElement: <RouteError /> },
  {
    element: <ProtectedRoute />,
    errorElement: <RouteError />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Lazy><Dashboard /></Lazy> },
          { path: 'month', element: <Lazy><MonthView /></Lazy> },
          { path: 'categories', element: <Lazy><Categories /></Lazy> },
          { path: 'debts', element: <Lazy><Debts /></Lazy> },
          { path: 'investments', element: <Lazy><Investments /></Lazy> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
