'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/apiClient';
import {
  Home,
  CalendarPlus,
  ClipboardList,
  FileText,
  Pill,
  Activity,
  Bell,
  LogOut,
} from 'lucide-react';

const PATIENT_NAV_ITEMS = [
  { label: 'Beranda', href: '/patient/dashboard', icon: Home },
  { label: 'Booking', href: '/patient/booking', icon: CalendarPlus },
  { label: 'Janji Temu', href: '/patient/appointments', icon: ClipboardList },
  { label: 'Rekam Medis', href: '/patient/records', icon: FileText },
  { label: 'Resep', href: '/patient/prescriptions', icon: Pill },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi Pasien"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/98 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_10px_rgba(0,0,0,0.04)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="max-w-md mx-auto px-2 py-1.5 flex items-center justify-around">
        {PATIENT_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 relative transition-colors duration-200 ${
                isActive ? 'text-sky-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {/* Active Dot Indicator */}
              {isActive ? (
                <span className="w-1.5 h-1.5 bg-sky-500 rounded-full mb-1 shadow-sm shadow-sky-500/50" />
              ) : (
                <span className="w-1.5 h-1.5 bg-transparent mb-1" />
              )}

              <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
              <span className={`text-[11px] mt-1 tracking-tight leading-tight ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNav;

export function PatientHeader({
  userName = 'Pasien',
  notificationCount = 0,
  onNotificationClick,
}) {
  const initials = userName
    ? userName
        .split(' ')
        .map((n) => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'P'
    : 'P';
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [logoutError, setLogoutError] = React.useState('');

  const handleLogout = async () => {
    setLogoutError('');
    setIsLoggingOut(true);
    try {
      const result = await apiRequest('/api/auth/logout', { method: 'POST' });
      if (!result.success) {
        setLogoutError(result.error || 'Gagal keluar dari sistem.');
        return;
      }
      router.replace('/login');
    } catch (error) {
      console.error('Patient logout error:', error);
      setLogoutError(
        error instanceof Error ? error.message : 'Gagal keluar dari sistem.'
      );
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: MedFlow Logo */}
        <Link href="/patient/dashboard" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-sky-600 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-bold text-lg text-slate-800 leading-none">
              Med<span className="text-sky-500">Flow</span>
            </span>
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
              Pasien Portal
            </span>
          </div>
        </Link>

        {/* Right: Notifications & User Avatar */}
        <div className="flex items-center gap-3">
          {/* Notification Button */}
          <button
            type="button"
            onClick={onNotificationClick}
            aria-label={`Notifikasi (${notificationCount} belum dibaca)`}
            className="relative p-2 rounded-xl text-slate-600 hover:text-sky-600 hover:bg-sky-50 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>

          {/* User Profile Avatar */}
          <Link
            href="/patient/profile"
            className="flex items-center gap-2 pl-1 group"
            title={`Profil ${userName}`}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-[#084C61] text-white flex items-center justify-center text-xs font-bold ring-2 ring-sky-100 group-hover:ring-sky-300 transition-all">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-800 group-hover:text-sky-600 transition-colors truncate max-w-[120px]">
                {userName}
              </p>
              <p className="text-[10px] text-slate-400 leading-none">Pasien</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            aria-label="Keluar dari akun"
            title={logoutError || 'Keluar dari akun'}
            className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
      {logoutError && (
        <p role="alert" className="px-4 pb-2 text-right text-xs text-red-600">
          {logoutError}
        </p>
      )}
    </header>
  );
}
