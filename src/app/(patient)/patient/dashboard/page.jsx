import Link from 'next/link';
import { getDashboardData } from '@/services/patientService';
import StatusBadge from '@/components/StatusBadge';
import { formatRupiah } from '@/lib/currency';
import {
  Calendar,
  CalendarPlus,
  ClipboardList,
  FileText,
  Pill,
  ArrowRight,
  Bell,
  CheckCircle2,
  Stethoscope,
  Users,
  Activity,
  HeartPulse,
  MailOpen,
} from 'lucide-react';

export const metadata = {
  title: 'Dashboard Pasien',
  description: 'Ringkasan janji temu, pesan, rekam medis, dan status resep pasien MedFlow.',
};

function getIndonesianGreeting() {
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 11) return 'Selamat Pagi';
  if (hour >= 11 && hour < 15) return 'Selamat Siang';
  if (hour >= 15 && hour < 18) return 'Selamat Sore';
  return 'Selamat Malam';
}

function formatDateIndo(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateTimeShort(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default async function PatientDashboardPage() {
  let patient = { full_name: 'Pasien MedFlow', medical_record_no: 'MR-NEW' };
  let nextAppointment = null;
  let latestPrescription = null;
  let stats = { totalAppointments: 0, completedAppointments: 0, activeAppointments: 0 };
  let notifications = [];
  let unreadNotificationCount = 0;

  try {
    const response = await getDashboardData();
    const dashboardData = response?.success ? response.data : null;
    if (dashboardData) {
      if (dashboardData.patient) patient = dashboardData.patient;
      if (dashboardData.nextAppointment) nextAppointment = dashboardData.nextAppointment;
      if (dashboardData.latestPrescription) latestPrescription = dashboardData.latestPrescription;
      if (dashboardData.stats) {
        stats = {
          totalAppointments: dashboardData.stats.total_appointments || 0,
          completedAppointments: dashboardData.stats.completed_appointments || 0,
          activeAppointments: dashboardData.stats.active_appointments || 0,
        };
      }
      if (Array.isArray(dashboardData.notifications)) {
        notifications = dashboardData.notifications;
      }
      unreadNotificationCount =
        dashboardData.unreadNotificationCount ??
        notifications.filter((n) => !n.is_read).length;
    }
  } catch (err) {
    console.error('Error loading patient dashboard:', err);
  }

  const greeting = getIndonesianGreeting();

  return (
    <div className="space-y-8">
      {/* Top Header Banner (matches Doctor & Admin dashboards) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-600 uppercase tracking-wider mb-1">
            <HeartPulse className="w-4 h-4" />
            <span>Portal Pasien • No. RM: {patient?.medical_record_no || 'MR-MEDFLOW'}</span>
          </div>
          <h1 className="text-2xl font-heading font-extrabold text-slate-900">
            {greeting}, {patient?.full_name || 'Sahabat MedFlow'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pantau jadwal konsultasi, lihat jadwal praktik dokter, cek rekam medis, dan status penyiapan obat Anda.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-50 border border-sky-100 text-sky-800 text-xs font-semibold w-fit">
            <Calendar className="w-4 h-4 text-sky-600" />
            <span>{formatDateIndo(new Date())}</span>
          </div>
          <Link href="/patient/booking" className="btn-primary text-xs">
            <CalendarPlus className="w-4 h-4" />
            <span>Buat Janji Baru</span>
          </Link>
        </div>
      </div>

      {/* 3 Metric Stat Cards (matches Doctor Dashboard) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block">
              Total Konsultasi
            </span>
            <span className="text-3xl font-heading font-extrabold text-slate-900 mt-1 block">
              {stats.totalAppointments}
            </span>
            <span className="text-[11px] text-sky-600 font-semibold mt-1 block">
              Riwayat kunjungan terdaftar
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block">
              Janji Temu Aktif
            </span>
            <span className="text-3xl font-heading font-extrabold text-amber-600 mt-1 block">
              {stats.activeAppointments}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Menunggu / Dikonfirmasi
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block">
              Selesai Diperiksa
            </span>
            <span className="text-3xl font-heading font-extrabold text-emerald-600 mt-1 block">
              {stats.completedAppointments}
            </span>
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Tersimpan di RME
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Next Appointment + Quick Services */}
        <div className="lg:col-span-7 space-y-6">
          {/* Next Appointment */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-heading font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-sky-500" />
                <span>Janji Temu Mendatang</span>
              </h2>
              <Link
                href="/patient/appointments"
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
              >
                <span>Lihat Semua</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {nextAppointment ? (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 via-sky-600 to-[#084C61] text-white p-5 shadow-md">
                <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
                  <Calendar className="w-40 h-40 text-white" />
                </div>

                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white/20 backdrop-blur-sm border border-white/20 text-sky-50">
                      {nextAppointment.poli_name || 'Poli Rawat Jalan'}
                    </span>
                    <div className="bg-white/95 rounded-xl px-2.5 py-1">
                      <StatusBadge status={nextAppointment.status} size="sm" />
                    </div>
                  </div>

                  <h3 className="text-lg font-heading font-bold leading-tight mb-1 text-white">
                    {nextAppointment.doctor_name || 'dr. Spesialis'}
                  </h3>
                  <p className="text-xs text-sky-100 mb-4 line-clamp-1">
                    Keluhan: {nextAppointment.complaint || 'Pemeriksaan rutin'}
                  </p>

                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-sky-200 block uppercase font-medium">Tanggal</span>
                      <span className="font-semibold">{formatDateIndo(nextAppointment.appointment_date)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-sky-200 block uppercase font-medium">Waktu & Antrean</span>
                      <span className="font-semibold">
                        {nextAppointment.slot_start?.substring(0, 5) || '09:00'} WIB
                        {nextAppointment.queue_no && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-400 text-slate-900 font-extrabold text-[10px]">
                            Antrean #{nextAppointment.queue_no}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 text-center">
                <div className="w-12 h-12 rounded-full bg-white text-sky-500 flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-heading font-bold text-slate-800 mb-1">
                  Belum Ada Janji Temu Aktif
                </h3>
                <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
                  Jadwalkan konsultasi dokter pilihan Anda dengan mudah atau cek jadwal praktik dokter terlebih dahulu.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Link href="/patient/doctors" className="btn-outline text-xs py-2">
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>Lihat Jadwal Dokter</span>
                  </Link>
                  <Link href="/patient/booking" className="btn-primary text-xs py-2">
                    <CalendarPlus className="w-3.5 h-3.5" />
                    <span>Buat Janji Sekarang</span>
                  </Link>
                </div>
              </div>
            )}
          </section>

          {/* Quick Services Grid */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h2 className="text-base font-heading font-bold text-slate-900">
              Menu Layanan Cepat
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Link
                href="/patient/doctors"
                className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-sky-300 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center mb-3 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-heading font-bold text-slate-800">Dokter & Jadwal</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Cek jadwal praktik</p>
              </Link>

              <Link
                href="/patient/booking"
                className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-sky-300 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                  <CalendarPlus className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-heading font-bold text-slate-800">Booking Janji</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Reservasi poliklinik</p>
              </Link>

              <Link
                href="/patient/appointments"
                className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-sky-300 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-heading font-bold text-slate-800">Janji Saya</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Riwayat & antrean</p>
              </Link>

              <Link
                href="/patient/records"
                className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-sky-300 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-heading font-bold text-slate-800">Rekam Medis</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Catatan dokter resmi</p>
              </Link>

              <Link
                href="/patient/prescriptions"
                className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-sky-300 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-3 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                  <Pill className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-heading font-bold text-slate-800">Resep Obat</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Status apotek</p>
              </Link>

              <Link
                href="/patient/messages"
                className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-sky-300 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-3 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                  <Bell className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-heading font-bold text-slate-800">Pesan Masuk</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {unreadNotificationCount > 0 ? `${unreadNotificationCount} belum dibaca` : 'Notifikasi sistem'}
                </p>
              </Link>
            </div>
          </section>
        </div>

        {/* Right Column (5 cols): Latest Messages + Latest Prescription */}
        <div className="lg:col-span-5 space-y-6">
          {/* Messages / Notifications Preview */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-sky-600" />
                <h2 className="text-base font-heading font-bold text-slate-900">
                  Pesan & Notifikasi
                </h2>
                {unreadNotificationCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-600 border border-red-200">
                    {unreadNotificationCount} Baru
                  </span>
                )}
              </div>
              <Link
                href="/patient/messages"
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
              >
                <span>Buka Semua</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {notifications.length === 0 ? (
              <div className="py-8 text-center">
                <MailOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">
                  Belum ada pesan atau notifikasi terbaru.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {notifications.slice(0, 4).map((notif) => (
                  <Link
                    key={notif.id}
                    href="/patient/messages"
                    className={`block p-3 rounded-xl border transition hover:border-sky-200 ${
                      notif.is_read
                        ? 'bg-slate-50/70 border-slate-100'
                        : 'bg-sky-50/60 border-sky-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                        {!notif.is_read && (
                          <span className="w-2 h-2 rounded-full bg-sky-500 flex-shrink-0" />
                        )}
                        {notif.title}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                        {formatDateTimeShort(notif.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Latest Prescription Card */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-heading font-bold text-slate-900 flex items-center gap-2">
                <Pill className="w-5 h-5 text-purple-600" />
                <span>Status Resep Terakhir</span>
              </h2>
              <Link
                href="/patient/prescriptions"
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
              >
                <span>Rincian</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {latestPrescription ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Resep #{latestPrescription.id?.substring(0, 8).toUpperCase() || 'RSP'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {formatDateIndo(latestPrescription.created_at)} • {latestPrescription.doctor_name}
                    </p>
                  </div>
                  <StatusBadge status={latestPrescription.status} size="sm" />
                </div>

                {latestPrescription.status === 'READY' && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Obat Anda siap diambil di Apotek MedFlow (Lantai 1).</span>
                  </div>
                )}

                {latestPrescription.items && latestPrescription.items.length > 0 && (
                  <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                    <div>
                      <span className="font-semibold text-slate-700 block mb-1">Daftar Obat:</span>
                      {latestPrescription.items.map((it) => it.medicine_name || it.name).join(', ')}
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="font-semibold text-slate-700">
                        Total Biaya Obat: <strong className="text-sky-700">{formatRupiah(latestPrescription.total_amount)}</strong>
                      </span>
                      <StatusBadge
                        status={
                          latestPrescription.payment_status === 'REJECTED'
                            ? 'PAYMENT_REJECTED'
                            : latestPrescription.payment_status || 'UNPAID'
                        }
                        size="sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-xs text-slate-400">
                  Tidak ada resep obat aktif yang sedang diproses.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
