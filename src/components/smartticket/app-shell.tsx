'use client';

import { useState } from 'react';
import {
  Bus,
  Users,
  MapPin,
  Ticket,
  Shield,
  BarChart3,
  ScanLine,
  Settings,
  LogOut,
  Store,
  Wallet,
  Clock,
  LayoutDashboard,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuthStore, type UserRole } from '@/stores/auth-store';
import { getRoleLabel, getRoleColor } from '@/lib/api';
import { AdminDashboard } from './views/admin-dashboard';
import ZonesFares from './views/zones-fares';
import LinesStops from './views/lines-stops';
import UsersManagement from './views/users-management';
import Reports from './views/reports';
import Guichet from './views/guichet';
import SalesHistory from './views/sales-history';
import CashSession from './views/cash-session';
import QrScanner from './views/qr-scanner';
import MyControls from './views/my-controls';
import ControllerStats from './views/controller-stats';

export type ViewId =
  | 'dashboard'
  | 'lines'
  | 'zones'
  | 'users'
  | 'tickets'
  | 'controls'
  | 'reports'
  | 'sell-ticket'
  | 'my-sales'
  | 'cash-close'
  | 'scan-qr'
  | 'my-controls'
  | 'controller-stats';

interface NavItem {
  id: ViewId;
  label: string;
  icon: React.ReactNode;
}

const navByRole: Record<UserRole, NavItem[]> = {
  SUPERADMIN: [
    { id: 'dashboard', label: 'Tableau de Bord', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'lines', label: 'Lignes & Arrêts', icon: <MapPin className="w-4 h-4" /> },
    { id: 'zones', label: 'Zones & Tarifs', icon: <Settings className="w-4 h-4" /> },
    { id: 'users', label: 'Utilisateurs', icon: <Users className="w-4 h-4" /> },
    { id: 'tickets', label: 'Billetterie', icon: <Ticket className="w-4 h-4" /> },
    { id: 'controls', label: 'Contrôles', icon: <ScanLine className="w-4 h-4" /> },
    { id: 'reports', label: 'Rapports', icon: <BarChart3 className="w-4 h-4" /> },
  ],
  OPERATOR: [
    { id: 'sell-ticket', label: 'Guichet', icon: <Store className="w-4 h-4" /> },
    { id: 'my-sales', label: 'Mes Ventes', icon: <Wallet className="w-4 h-4" /> },
    { id: 'cash-close', label: 'Clôture de Caisse', icon: <Clock className="w-4 h-4" /> },
  ],
  CONTROLLER: [
    { id: 'scan-qr', label: 'Scanner QR', icon: <ScanLine className="w-4 h-4" /> },
    { id: 'my-controls', label: 'Mes Contrôles', icon: <Shield className="w-4 h-4" /> },
    { id: 'controller-stats', label: 'Statistiques', icon: <BarChart3 className="w-4 h-4" /> },
  ],
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function PlaceholderView({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[60vh]">
      <div className="text-center space-y-3">
        <Bus className="w-16 h-16 mx-auto text-muted-foreground/40" />
        <h2 className="text-2xl font-semibold text-muted-foreground">{title}</h2>
        <p className="text-muted-foreground/70">Cette vue sera disponible prochainement.</p>
      </div>
    </div>
  );
}

export function AppShell() {
  const { user, logout } = useAuthStore();
  const [currentView, setCurrentView] = useState<ViewId>(
    user?.role === 'SUPERADMIN'
      ? 'dashboard'
      : user?.role === 'OPERATOR'
        ? 'sell-ticket'
        : 'scan-qr'
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return null;

  const navItems = navByRole[user.role] || [];

  const handleNavClick = (viewId: ViewId) => {
    setCurrentView(viewId);
    setMobileMenuOpen(false);
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <AdminDashboard onNavigate={handleNavClick} />;
      case 'lines':
        return <LinesStops />;
      case 'zones':
        return <ZonesFares />;
      case 'users':
        return <UsersManagement />;
      case 'tickets':
        return <SalesHistory />;
      case 'controls':
        return <ControllerStats />;
      case 'reports':
        return <Reports />;
      case 'sell-ticket':
        return <Guichet />;
      case 'my-sales':
        return <SalesHistory />;
      case 'cash-close':
        return <CashSession />;
      case 'scan-qr':
        return <QrScanner />;
      case 'my-controls':
        return <MyControls />;
      case 'controller-stats':
        return <ControllerStats />;
      default:
        return <PlaceholderView title={navItems.find((n) => n.id === currentView)?.label || ''} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 lg:px-6 gap-3">
          {/* Left: Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
              <Bus className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg hidden sm:inline">SmartTicket</span>
          </div>

          {/* Center: Navigation Tabs (Desktop) */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center overflow-x-auto">
            {navItems.map((item) => (
              <Button
                key={item.id}
                variant={currentView === item.id ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => handleNavClick(item.id)}
                className="gap-1.5 text-sm font-medium whitespace-nowrap"
              >
                {item.icon}
                {item.label}
              </Button>
            ))}
          </nav>

          {/* Right: User Menu */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 h-9 px-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">
                    {user.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <Badge variant="outline" className={`w-fit mt-1 text-xs ${getRoleColor(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Se déconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background">
            <nav className="flex flex-col p-2 gap-1">
              {navItems.map((item) => (
                <Button
                  key={item.id}
                  variant={currentView === item.id ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => handleNavClick(item.id)}
                  className="justify-start gap-2 text-sm font-medium h-10"
                >
                  {item.icon}
                  {item.label}
                </Button>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {renderView()}
      </main>

      {/* Footer */}
      <footer className="border-t py-3 px-4 text-center text-xs text-muted-foreground bg-background">
        &copy; {new Date().getFullYear()} SmartTicket Bus &mdash; Système de billetterie intelligent pour transport en commun
      </footer>
    </div>
  );
}
