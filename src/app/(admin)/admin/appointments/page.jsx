import Link from 'next/link';
import { getAllAppointments, getDoctors } from '@/services/adminService';
import { getCurrentUser } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import AdminAppointmentsClient from './AdminAppointmentsClient';
import { CalendarDays, Filter } from 'lucide-react';

export const metadata = {
  title: 'Semua Janji Temu',
  description: 'Pantau, filter, dan validasi (Approved/Rejected) janji temu pasien di seluruh poliklinik.',
};

const APPOINTMENT_STATUSES = [
  ['PENDING', 'Menunggu'],
  ['CONFIRMED', 'Approved'],
  ['COMPLETED', 'Selesai'],
  ['REJECTED', 'Rejected'],
  ['CANCELLED', 'Dibatalkan'],
  ['NO_SHOW', 'Tidak hadir'],
];

export default async function AdminAppointmentsPage({ searchParams }) {
  const params = await searchParams;
  const filters = {};
  const status = params?.status;
  const date = params?.date;
  const doctorId = params?.doctor_id;

  if (APPOINTMENT_STATUSES.some(([value]) => value === status)) {
    filters.status = status;
  }
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const parsedDate = new Date(`${date}T00:00:00Z`);
    if (
      !Number.isNaN(parsedDate.getTime()) &&
      parsedDate.toISOString().slice(0, 10) === date
    ) {
      filters.date = date;
    }
  }
  if (
    typeof doctorId === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(doctorId)
  ) {
    filters.doctor_id = doctorId;
  }

  const [user, appointmentsRes, doctorsRes] = await Promise.all([
    getCurrentUser(),
    getAllAppointments(filters),
    getDoctors(),
  ]);
  const appointments =
    appointmentsRes?.success && Array.isArray(appointmentsRes.data)
      ? appointmentsRes.data
      : [];
  const doctors =
    doctorsRes?.success && Array.isArray(doctorsRes.data)
      ? doctorsRes.data
      : [];
  const loadError = appointmentsRes?.success
    ? ''
    : appointmentsRes?.error || 'Data janji temu gagal dimuat.';

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans md:flex-row">
      <Sidebar
        role="ADMIN"
        userName="Administrator"
        userEmail={user?.email || 'admin@medflow.com'}
      />

      <main className="min-w-0 flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
        <header className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">
                Administrasi
              </p>
              <h1 className="mt-1 text-2xl font-heading font-extrabold text-slate-900">
                Semua Janji Temu
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Pantau jadwal pasien, dokter, status, dan nomor antrean dari satu halaman.
              </p>
            </div>
          </div>
        </header>

        <form
          method="get"
          className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.5fr_auto]"
        >
          <label className="space-y-1 text-xs font-medium text-slate-600">
            Status
            <select
              name="status"
              defaultValue={filters.status || ''}
              className="input-field"
            >
              <option value="">Semua status</option>
              {APPOINTMENT_STATUSES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600">
            Tanggal
            <input
              type="date"
              name="date"
              defaultValue={filters.date || ''}
              className="input-field"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600">
            Dokter
            <select
              name="doctor_id"
              defaultValue={filters.doctor_id || ''}
              className="input-field"
            >
              <option value="">Semua dokter</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.full_name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn-primary self-end">
            <Filter className="h-4 w-4" />
            Terapkan
          </button>
        </form>

        {!doctorsRes?.success && (
          <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Daftar dokter tidak dapat dimuat: {doctorsRes?.error || 'Terjadi kesalahan.'}
          </p>
        )}
        {loadError && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {loadError}
          </p>
        )}

        <AdminAppointmentsClient
          initialAppointments={appointments}
          loadError={loadError}
        />

        <Link href="/admin/dashboard" className="inline-flex text-sm font-medium text-sky-700 hover:text-sky-800">
          Kembali ke dashboard
        </Link>
      </main>
    </div>
  );
}
