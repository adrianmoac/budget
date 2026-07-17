import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  LayoutDashboard,
  CalendarDays,
  CalendarRange,
  Tags,
  CreditCard,
  TrendingUp,
  Lightbulb,
  LogOut,
  Menu,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';
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

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-secondary text-secondary-foreground'
      : 'text-muted-foreground hover:text-foreground',
  );
}

export function AppLayout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

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
          <div className="flex items-center gap-2">
            {/* The seven nav items cannot fit one row at phone widths, so below md
                they move into a drawer and the top bar keeps only the trigger. */}
            <DialogPrimitive.Root open={menuOpen} onOpenChange={setMenuOpen}>
              <DialogPrimitive.Trigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Abrir menú"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </DialogPrimitive.Trigger>
              <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 md:hidden" />
                <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 flex w-64 max-w-[80vw] flex-col overflow-y-auto border-r bg-card p-4 shadow-lg data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left md:hidden">
                  <DialogPrimitive.Title className="mb-4 flex items-center gap-2 px-3 font-semibold">
                    <Wallet className="h-5 w-5" />
                    <span>Budget Manager</span>
                  </DialogPrimitive.Title>
                  <nav className="flex flex-col gap-1" aria-label="Principal (móvil)">
                    {NAV.map(({ to, label, icon: Icon, end }) => (
                      <NavLink
                        key={to}
                        to={to}
                        end={end}
                        className={navLinkClass}
                        onClick={() => setMenuOpen(false)}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </NavLink>
                    ))}
                  </nav>
                </DialogPrimitive.Content>
              </DialogPrimitive.Portal>
            </DialogPrimitive.Root>
            <div className="flex items-center gap-2 font-semibold">
              <Wallet className="h-5 w-5" />
              <span>Budget Manager</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
              {NAV.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} className={navLinkClass}>
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
            </nav>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleSignOut()}
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="container flex-1 py-6">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}
