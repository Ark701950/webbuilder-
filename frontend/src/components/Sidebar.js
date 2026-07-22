import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Briefcase, FolderOpen, Calendar, MessageSquare, BarChart3, Bot, Settings, LayoutDashboard, Building2, FileText, DollarSign, HeadphonesIcon, Palette } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, testId: 'nav-dashboard' },
  { name: 'CRM', href: '/crm', icon: Building2, testId: 'nav-crm' },
  { name: 'Projects', href: '/projects', icon: Briefcase, testId: 'nav-projects' },
  { name: 'Documents', href: '/documents', icon: FileText, testId: 'nav-documents' },
  { name: 'HR', href: '/hr', icon: Users, testId: 'nav-hr' },
  { name: 'Finance', href: '/finance', icon: DollarSign, testId: 'nav-finance' },
  { name: 'Calendar', href: '/calendar', icon: Calendar, testId: 'nav-calendar' },
  { name: 'Messages', href: '/messages', icon: MessageSquare, testId: 'nav-messages' },
  { name: 'Analytics', href: '/analytics', icon: BarChart3, testId: 'nav-analytics' },
  { name: 'AI Assistant', href: '/ai', icon: Bot, testId: 'nav-ai' },
  { name: 'Support', href: '/support', icon: HeadphonesIcon, testId: 'nav-support' },
];

const bottomNavigation = [
  { name: 'Design Studio', href: '/design-studio', icon: Palette, testId: 'nav-design-studio' },
  { name: 'Admin Portal', href: '/admin', icon: Settings, testId: 'nav-admin' },
];

export const Sidebar = ({ open = true }) => {
  const location = useLocation();

  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen transition-transform ${
        open ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}
      style={{ width: '240px' }}
    >
      <div className="flex h-full flex-col border-r border-border bg-surface">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-border px-6">
          <Link to="/dashboard" className="flex items-center gap-2" data-testid="sidebar-logo">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-white">W</span>
            </div>
            <span className="logo text-foreground">WebBuilder</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" data-testid="sidebar-nav">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                to={item.href}
                data-testid={item.testId}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-muted-foreground hover:bg-surface-elevated hover:text-foreground'
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Navigation */}
        <div className="border-t border-border px-3 py-4">
          {bottomNavigation.map((item) => {
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                to={item.href}
                data-testid={item.testId}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-muted-foreground hover:bg-surface-elevated hover:text-foreground'
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
