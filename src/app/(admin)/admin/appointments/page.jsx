import Link from 'next/link';
import { getAllAppointments, getDoctors } from '@/services/adminService';
import { getCurrentUser } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import { CalendarDays, Filter, Users } from 'lucide-react';

export const metadata = {
  title: 'Semua Janji Temu',
  description: 'Pantau dan filter janji temu pasien di seluruh poliklinik.',
};

const APPOINTMENT_STATUSES = [
  ['PENDING', 'Menunggu'],
  ['CONFIRMED', 'Dikonfirmasi'],
  ['COMPLETED', 'Selesai'],
  ['REJECTED', 'Ditolak'],
  ['CANCELLED', 'Dibatalkan'],
  ['NO_SHOW', 'Tidak hadir'],
];

const STATUS_STYLES = {
  PENDING: 'bg-amber-50 text-amber-700',
  CONFIRMED: 'bg-sky-50 text-sky-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-red-50 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-600',
};

function formatDate(value) {
  if (!value) return '-';
  const date =
    value instanceof Date
      ? value
      : new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime())
    ? '-'
    : new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(date);
}

function formatTime(value) {
  return typeof value === 'string' ? value.slice(0, 5) : '-';
}

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

        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-heading font-bold text-slate-800">Daftar Janji Temu</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {appointments.length} data
            </span>
          </div>

          {appointments.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <Users className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">
                {loadError ? 'Data belum tersedia' : 'Tidak ada janji temu'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Coba ubah filter atau periksa kembali nanti.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Pasien</th>
                    <th className="px-5 py-3 font-semibold">Dokter / Poli</th>
                    <th className="px-5 py-3 font-semibold">Jadwal</th>
                    <th className="px-5 py-3 font-semibold">Antrean</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Keluhan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {appointments.map((appointment) => (
                    <tr key={appointment.id} className="align-top hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800">{appointment.patient_name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          RM {appointment.medical_record_no}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-700">{appointment.doctor_name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{appointment.poli_name}</p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {formatDate(appointment.appointment_date)}
                        <span className="ml-2 text-xs text-slate-400">
                          {formatTime(appointment.slot_start)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{appointment.queue_no || '-'}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[appointment.status] || 'bg-slate-100 text-slate-600'}`}>
                          {APPOINTMENT_STATUSES.find(([value]) => value === appointment.status)?.[1] || appointment.status}
                        </span>
                        {appointment.rejection_reason && (
                          <p className="mt-1 max-w-40 text-xs text-red-600">
                            {appointment.rejection_reason}
                          </p>
                        )}
                      </td>
                      <td className="max-w-56 px-5 py-4 text-xs leading-relaxed text-slate-600">
                        {appointment.complaint || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <Link href="/admin/dashboard" className="inline-flex text-sm font-medium text-sky-700 hover:text-sky-800">
          Kembali ke dashboard
        </Link>
      </main>
    </div>
  );
}
