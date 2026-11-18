import { getDoctorProfile, getTodaysAppointments, getPendingAppointments } from '@/services/doctorService';
import { getCurrentUser } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import StatusBadge from '@/components/StatusBadge';
import Link from 'next/link';
import DoctorDashboardClient from './DoctorDashboardClient';
import {
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Activity,
  ArrowRight,
  ShieldCheck,
  Stethoscope
} from 'lucide-react';

export const metadata = {
  title: 'Dashboard Dokter',
  description: 'Panel antrean pasien dan validasi jadwal praktik dokter MedFlow HMIS.',
};

function formatDateIndo(date = new Date()) {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export default async function DoctorDashboardPage() {
  let user = null;
  let doctor = { full_name: 'Dokter MedFlow', poli_name: 'Poliklinik Rawat Jalan' };
  let todaysAppointments = [];
  let pendingAppointments = [];
  let loadError = '';

  try {
    user = await getCurrentUser();
    const [profileRes, todayRes, pendingRes] = await Promise.all([
      getDoctorProfile(),
      getTodaysAppointments(),
      getPendingAppointments(),
    ]);

    if (profileRes?.success && profileRes.data) doctor = profileRes.data;
    else if (profileRes?.error) loadError = profileRes.error;

    if (todayRes?.success && Array.isArray(todayRes.data)) {
      todaysAppointments = todayRes.data;
    } else if (todayRes?.error && !loadError) {
      loadError = todayRes.error;
    }

    if (pendingRes?.success && Array.isArray(pendingRes.data)) {
      pendingAppointments = pendingRes.data;
    } else if (pendingRes?.error && !loadError) {
      loadError = pendingRes.error;
    }
  } catch (err) {
    console.error('Error loading doctor dashboard:', err);
    loadError = 'Gagal memuat data dashboard dokter.';
  }

  const todayConfirmedCount = todaysAppointments.filter((a) => a.status === 'CONFIRMED').length;
  const todayTotalCount = todaysAppointments.length;
  const pendingCount = pendingAppointments.length;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans md:flex-row">
      {/* Sidebar for DOCTOR */}
      <Sidebar
        role="DOCTOR"
        userName={doctor?.full_name || 'dr. Spesialis'}
        userEmail={user?.email || 'dokter@medflow.com'}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-600 uppercase tracking-wider mb-1">
              <Stethoscope className="w-4 h-4" />
              <span>{doctor?.poli_name || 'Poliklinik Spesialis'}</span>
            </div>
            <h1 className="text-2xl font-heading font-extrabold text-slate-900">
              Selamat Bertugas, {doctor?.full_name || 'Dokter'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola antrean konsultasi medis dan validasi permohonan janji temu pasien hari ini.
            </p>
          </div>

          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-50 border border-sky-100 text-sky-800 text-xs font-semibold w-fit">
            <Calendar className="w-4 h-4 text-sky-600" />
            <span>{formatDateIndo(new Date())}</span>
          </div>
        </div>

        {loadError && (
          <div role="alert" className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {/* 3 Metric Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          {/* Card 1: Pasien Hari Ini */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 block">
                Pasien Terjadwal Hari Ini
              </span>
              <span className="text-3xl font-heading font-extrabold text-slate-900 mt-1 block">
                {todayConfirmedCount}
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Siap diperiksa
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: Menunggu Validasi */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 block">
                Menunggu Validasi
              </span>
              <span className="text-3xl font-heading font-extrabold text-amber-600 mt-1 block">
                {pendingCount}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Permohonan booking baru
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Total Konsultasi */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 block">
                Total Antrean Poli Hari Ini
              </span>
              <span className="text-3xl font-heading font-extrabold text-slate-900 mt-1 block">
                {todayTotalCount}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Termasuk menunggu & konfirmasi
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Doctor Dashboard Interactive Client Section */}
        <DoctorDashboardClient
          initialPending={pendingAppointments}
          initialToday={todaysAppointments}
        />
      </main>
    </div>
  );
}
