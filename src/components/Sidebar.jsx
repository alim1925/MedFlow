'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/apiClient';
import {
  Activity,
  LayoutDashboard,
  Calendar,
  ClipboardCheck,
  Stethoscope,
  Users,
  Building2,
  UserCheck,
  Pill,
  ShoppingBag,
  CalendarDays,
  History,
  LogOut,
  X,
  Menu,
  CalendarPlus,
  ClipboardList,
  FileText,
  Bell,
  UserRound,
} from 'lucide-react';

const DOCTOR_NAV_ITEMS = [
  { label: 'Dashboard', href: '/doctor/dashboard', icon: LayoutDashboard },
  { label: 'Jadwal Saya', href: '/doctor/schedules', icon: Calendar },
  { label: 'Validasi Janji', href: '/doctor/appointments', icon: ClipboardCheck },
  { label: 'Pemeriksaan', href: '/doctor/examinations', icon: Stethoscope },
];

const ADMIN_NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Pengguna', href: '/admin/users', icon: Users },
  { label: 'Poli', href: '/admin/polis', icon: Building2 },
  { label: 'Dokter', href: '/admin/doctors', icon: UserCheck },
  { label: 'Obat & Stok', href: '/admin/medicines', icon: Pill },
  { label: 'Farmasi', href: '/admin/pharmacy', icon: ShoppingBag },
  { label: 'Semua Janji', href: '/admin/appointments', icon: CalendarDays },
  { label: 'Audit Log', href: '/admin/audit-logs', icon: History },
];

const PATIENT_NAV_ITEMS = [
  { label: 'Dashboard', href: '/patient/dashboard', icon: LayoutDashboard },
  { label: 'Dokter & Jadwal', href: '/patient/doctors', icon: Stethoscope },
  { label: 'Booking Janji', href: '/patient/booking', icon: CalendarPlus },
  { label: 'Janji Temu', href: '/patient/appointments', icon: ClipboardList },
  { label: 'Rekam Medis', href: '/patient/records', icon: FileText },
  { label: 'Resep Obat', href: '/patient/prescriptions', icon: Pill },
  { label: 'Pesan', href: '/patient/messages', icon: Bell, showUnread: true },
  { label: 'Profil Saya', href: '/patient/profile', icon: UserRound },
];

const ROLE_CONFIG = {
  DOCTOR: {
    items: DOCTOR_NAV_ITEMS,
    label: 'Dokter Spesialis',
  },
  ADMIN: {
    items: ADMIN_NAV_ITEMS,
    label: 'Administrator Sistem',
  },
  PATIENT: {
    items: PATIENT_NAV_ITEMS,
    label: 'Pasien MedFlow',
  },
};

export default function Sidebar({
  role = 'DOCTOR',
  userName = 'Pengguna MedFlow',
  userEmail = 'user@medflow.id',
  unreadCount = 0,
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [logoutError, setLogoutError] = React.useState('');
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const normalizedRole = role?.toUpperCase() || 'ADMIN';
  const roleConfig = ROLE_CONFIG[normalizedRole] || ROLE_CONFIG.ADMIN;
  const navItems = roleConfig.items;
  const roleDisplay = roleConfig.label;

  // Extract initials
  const initials = userName
    ? userName
        .replace(/^(dr\.|drg\.|prof\.)\s*/i, '')
        .split(' ')
        .map((n) => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'MF'
    : 'MF';

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
      console.error('Logout error:', error);
      setLogoutError(
        error instanceof Error ? error.message : 'Gagal keluar dari sistem.'
      );
    } finally {
      setIsLoggingOut(false);
    }
  };

  const sidebarContent = (
    <aside className="w-64 h-full bg-gradient-to-b from-[#084C61] to-[#0E7490] text-white flex flex-col justify-between shadow-xl">
      {/* Top Branding */}
      <div>
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-sm">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-heading font-bold text-xl leading-none text-white tracking-tight">
                Med<span className="text-sky-300">Flow</span>
              </div>
              <div className="text-[11px] text-sky-200/80 font-medium tracking-wider uppercase mt-1">
                HMIS PORTAL
              </div>
            </div>
          </Link>

          {/* Close button for mobile */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10"
            aria-label="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="px-4 py-6">
          <div className="text-[11px] font-semibold text-sky-200/60 uppercase tracking-wider px-3 mb-3">
            Menu Utama
          </div>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-[#084C61] font-semibold shadow-sm'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#084C61]' : 'text-white/80'}`} />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.showUnread && unreadCount > 0 && (
                    <span
                      className={`inline-flex min-w-[20px] h-5 px-1.5 items-center justify-center rounded-full text-[11px] font-bold ${
                        isActive
                          ? 'bg-sky-500 text-white'
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom User Profile & Logout */}
      <div className="p-4 border-t border-white/10 bg-black/10">
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="w-10 h-10 rounded-full bg-white text-[#084C61] flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-white/20 flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate leading-tight">{userName}</p>
            <p className="text-xs text-sky-200/70 truncate">{userEmail}</p>
            <div className="mt-1">
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/15 text-sky-100 border border-white/10">
                {roleDisplay}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 border border-white/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>{isLoggingOut ? 'Sedang keluar...' : 'Keluar Akun'}</span>
        </button>
        {logoutError && (
          <p role="alert" className="mt-2 text-xs text-red-200">
            {logoutError}
          </p>
        )}
      </div>
    </aside>
  );

  return (
    <>
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm md:hidden">
        <Link href="/" className="flex items-center gap-2 font-heading font-bold text-slate-800">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-white">
            <Activity className="h-4 w-4" />
          </span>
          Med<span className="text-sky-500">Flow</span>
        </Link>
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          aria-label="Buka menu navigasi"
          aria-expanded={isMobileOpen}
          aria-controls="role-navigation"
          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Desktop Static Sidebar */}
      <div className="hidden md:flex h-screen sticky top-0 flex-shrink-0 z-30">
        {sidebarContent}
      </div>

      {/* Mobile Modal / Overlay Sidebar */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <button
            type="button"
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Tutup menu navigasi"
          />

          {/* Drawer */}
          <div id="role-navigation" className="relative z-50 flex h-full w-full max-w-xs flex-1 animate-slideUp">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

export function SidebarToggle({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Buka Menu Samping"
      className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-sky-600 hover:bg-slate-50 shadow-sm md:hidden"
    >
      <Menu className="w-5 h-5" />
    </button>
  );
}
