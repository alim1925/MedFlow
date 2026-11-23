import Link from 'next/link';
import { getMyExaminations, getDoctorProfile } from '@/services/doctorService';
import { getCurrentUser } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import MedicalRecordActions from '@/components/MedicalRecordActions';
import { CalendarDays, ClipboardList, FileText } from 'lucide-react';

export const metadata = {
  title: 'Riwayat Pemeriksaan',
  description: 'Riwayat pemeriksaan medis yang telah diselesaikan dokter.',
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
        month: 'long',
        year: 'numeric',
      }).format(date);
}

export default async function DoctorExaminationsPage() {
  const [user, profileRes, examinationsRes] = await Promise.all([
    getCurrentUser(),
    getDoctorProfile(),
    getMyExaminations(),
  ]);
  const doctor = profileRes?.success ? profileRes.data : null;
  const examinations =
    examinationsRes?.success && Array.isArray(examinationsRes.data)
      ? examinationsRes.data
      : [];
  const loadError = examinationsRes?.success
    ? ''
    : examinationsRes?.error || 'Riwayat pemeriksaan gagal dimuat.';

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans md:flex-row">
      <Sidebar
        role="DOCTOR"
        userName={doctor?.full_name || 'Dokter MedFlow'}
        userEmail={user?.email || 'dokter@medflow.com'}
      />

      <main className="min-w-0 flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
        <header className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">
                Praktik Dokter
              </p>
              <h1 className="mt-1 text-2xl font-heading font-extrabold text-slate-900">
                Riwayat Pemeriksaan
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Rekam medis yang telah Anda buat dan kunci setelah pemeriksaan.
              </p>
            </div>
          </div>
        </header>

        {loadError && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {loadError}
          </p>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-heading font-bold text-slate-800">Pemeriksaan Selesai</h2>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              {examinations.length} rekam medis
            </span>
          </div>

          {examinations.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <FileText className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">
                {loadError ? 'Data belum tersedia' : 'Belum ada pemeriksaan selesai'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Rekam medis yang sudah disimpan akan tampil di halaman ini.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {examinations.map((exam) => (
                <article
                  key={exam.id}
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h3 className="font-semibold text-slate-800">{exam.patient_name}</h3>
                      <span className="text-xs text-slate-500">
                        No. RM {exam.medical_record_no}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-700">
                      Diagnosis: {exam.diagnosis}
                      {exam.icd10_code ? ` (${exam.icd10_code})` : ''}
                    </p>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(exam.appointment_date)}
                      {exam.slot_start && ` · ${String(exam.slot_start).slice(0, 5)} WIB`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <MedicalRecordActions recordId={exam.id} size="xs" />
                    <Link
                      href={`/doctor/exam/${exam.appointment_id}`}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Lihat rekam medis
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
