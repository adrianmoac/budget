import {
  LayoutDashboard,
  CalendarDays,
  CalendarRange,
  Tags,
  CreditCard,
  TrendingUp,
  Lightbulb,
  LogOut,
  Wallet,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from './auth';
import { OfflineBanner } from '@/components/OfflineBanner';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { toast } from '@/store/toast';

// Surface through Phase 6: Dashboard, Month, Year, Categories, Debts, Investments,
// and Recommended items.
const NAV = [
  { to: '/', label: 'Resumen', icon: LayoutDashboard, end: true },
  { to: '/month', label: 'Mes', icon: CalendarDays, end: false },
  { to: '/year', label: 'Año', icon: CalendarRange, end: false },
  { to: '/categories', label: 'Categorías', icon: Tags, end: false },
  { to: '/debts', label: 'Deudas', icon: CreditCard, end: false },
  { to: '/investments', label: 'Inversiones', icon: TrendingUp, end: false },
  { to: '/recommended', label: 'Recomendados', icon: Lightbulb, end: false },
];

export function AppLayout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    try {
      await signOut();
      void navigate('/login', { replace: true });
    } catch {
      toast.error('No se pudo cerrar sesión');
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <OfflineBanner />
      <header className="border-b bg-card">
        <div className="container flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-semibold">
            <Wallet className="h-5 w-5" />
            <span>Budget Manager</span>
          </div>
          <nav className="flex items-center gap-1" aria-label="Principal">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-secondary text-secondary-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleSignOut()}
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </nav>
        </div>
      </header>
      <main className="container flex-1 py-6">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}
