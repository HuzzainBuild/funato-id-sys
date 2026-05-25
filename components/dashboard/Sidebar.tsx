'use client';
// components/dashboard/Sidebar.tsx

import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: number;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/dashboard/students', label: 'Students', icon: '👥' },
  { href: '/dashboard/import', label: 'Import Excel', icon: '📥' },
  { href: '/dashboard/cards', label: 'ID Cards', icon: '🪪' },
  { href: '/dashboard/print', label: 'Print / Export', icon: '🖨️' },
];

export default function Sidebar({ adminName, adminEmail }: { adminName?: string; adminEmail?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('auth-token');
      localStorage.removeItem('admin-name');
      localStorage.removeItem('admin-email');
      router.push('/login');
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className="fixed top-0 left-0 h-full flex flex-col z-40 no-print"
      style={{
        width: '260px',
        background: 'linear-gradient(180deg, #1a4a1a 0%, #2d6a2d 50%, #1a4a1a 100%)',
      }}
    >
      {/* University Logo & Name */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-xl text-white flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.25)' }}
          >
            F
          </div>
          <div>
            <p className="text-white font-extrabold text-sm leading-tight">FUNATO</p>
            <p className="text-white/60 text-xs leading-tight">ID Card System</p>
          </div>
        </div>

        <div
          className="rounded-xl p-3"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        >
          <p className="text-xs text-white/50 mb-1">Federal University of Agriculture</p>
          <p className="text-xs text-white/50">& Technology, Okeho (FUNATO)</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="text-white/30 text-xs font-semibold uppercase tracking-widest px-4 mb-3">
          Main Menu
        </p>

        {navItems.map((item) => (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-left ${
              isActive(item.href)
                ? 'bg-white/20 text-white shadow-sm'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span className="text-lg w-6 text-center">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {isActive(item.href) && (
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
            )}
          </button>
        ))}
      </nav>

      {/* Admin Info & Logout */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            {(adminName || 'A')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">
              {adminName || 'Administrator'}
            </p>
            <p className="text-white/50 text-xs truncate">
              {adminEmail || 'admin@funato.edu.ng'}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-all duration-200 disabled:opacity-50"
        >
          <span className="text-lg">🚪</span>
          {loggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </div>
    </aside>
  );
}
