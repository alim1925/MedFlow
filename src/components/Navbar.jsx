'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Menu, X, Type, Eye, LayoutDashboard } from 'lucide-react';
import { useAccessibility } from '@/components/AccessibilityProvider';

const ROLE_DASHBOARDS = {
  ADMIN: '/admin/dashboard',
  DOCTOR: '/doctor/dashboard',
  PATIENT: '/patient/dashboard',
};

export default function Navbar({ currentUser = null }) {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { isLargeText, toggleLargeText, isHighContrast, toggleHighContrast } = useAccessibility();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const dashboardHref = currentUser?.role ? ROLE_DASHBOARDS[currentUser.role] || '/' : null;

  const navLinks = [
    { label: 'Beranda', href: '/' },
    { label: 'Poli', href: '/polis' },
    { label: 'Dokter & Jadwal', href: '/doctors' },
    ...(dashboardHref
      ? [{ label: 'Dashboard', href: dashboardHref }]
      : [{ label: 'Masuk', href: '/login' }]),
  ];

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100 py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-sky-600 flex items-center justify-center text-white shadow-sm shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-bold text-xl text-slate-800 tracking-tight leading-none group-hover:text-sky-600 transition-colors">
                Med<span className="text-sky-500">Flow</span>
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
                Hospital System
              </span>
            </div>
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1 bg-white/70 backdrop-blur-xs px-3 py-1.5 rounded-full border border-slate-200/70 shadow-sm">
            {navLinks.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'text-sky-600 font-semibold bg-sky-50 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Action CTAs & Quick Accessibility */}
          <div className="hidden md:flex items-center gap-3">
            {/* Quick Access Accessibility Toggles */}
            <div className="flex items-center bg-white border border-slate-200/80 rounded-full p-1 shadow-sm">
              <button
                type="button"
                onClick={toggleLargeText}
                aria-label="Ubah Ukuran Teks"
                title={`Teks Besar: ${isLargeText ? 'Aktif' : 'Nonaktif'}`}
                className={`p-1.5 rounded-full transition-colors ${
                  isLargeText
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-sky-600 hover:bg-slate-50'
                }`}
              >
                <Type className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={toggleHighContrast}
                aria-label="Ubah Kontras Tampilan"
                title={`Kontras Tinggi: ${isHighContrast ? 'Aktif' : 'Nonaktif'}`}
                className={`p-1.5 rounded-full transition-colors ${
                  isHighContrast
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-sky-600 hover:bg-slate-50'
                }`}
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>

            {dashboardHref ? (
              <Link
                href={dashboardHref}
                className="px-5 py-2.5 rounded-full font-medium text-white text-sm bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 shadow-sm hover:shadow-md hover:shadow-sky-500/20 active:scale-[0.98] transition-all duration-200 inline-flex items-center justify-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Portal Saya</span>
              </Link>
            ) : (
              <Link
                href="/register"
                className="px-5 py-2.5 rounded-full font-medium text-white text-sm bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 shadow-sm hover:shadow-md hover:shadow-sky-500/20 active:scale-[0.98] transition-all duration-200 inline-flex items-center justify-center"
              >
                Daftar Pasien
              </Link>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={toggleLargeText}
              aria-label="Ubah Ukuran Teks"
              className={`p-2 rounded-xl border border-slate-200 bg-white ${isLargeText ? 'text-sky-600 bg-sky-50 border-sky-300' : 'text-slate-600'}`}
            >
              <Type className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Buka Menu Navigasi"
              className="p-2.5 rounded-xl text-slate-700 hover:bg-white bg-white/70 border border-slate-200 shadow-sm transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6 text-slate-800" /> : <Menu className="w-6 h-6 text-slate-800" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Slide-down Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white/98 backdrop-blur-md px-4 pt-3 pb-6 animate-slideUp shadow-lg">
          <div className="space-y-1">
            {navLinks.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                    isActive
                      ? 'text-sky-600 font-semibold bg-sky-50 border-l-4 border-sky-500'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-3">
            <div className="flex items-center justify-between px-2 text-sm text-slate-600">
              <span>Pengaturan Visual:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleLargeText}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 ${
                    isLargeText ? 'bg-sky-50 text-sky-700 border-sky-300' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <Type className="w-3.5 h-3.5" />
                  Teks Besar
                </button>
                <button
                  type="button"
                  onClick={toggleHighContrast}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 ${
                    isHighContrast ? 'bg-sky-50 text-sky-700 border-sky-300' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Kontras
                </button>
              </div>
            </div>

            {dashboardHref ? (
              <Link
                href={dashboardHref}
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-3 rounded-xl font-medium text-white text-center text-sm bg-gradient-to-r from-sky-500 to-sky-600 shadow-sm"
              >
                Buka Portal Saya
              </Link>
            ) : (
              <Link
                href="/register"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-3 rounded-xl font-medium text-white text-center text-sm bg-gradient-to-r from-sky-500 to-sky-600 shadow-sm"
              >
                Daftar Pasien Baru
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
