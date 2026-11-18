import { getPatientProfile } from '@/services/patientService';
import { getCurrentUser } from '@/lib/auth';
import {
  CalendarDays,
  Droplet,
  FileText,
  HeartPulse,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

export const metadata = {
  title: 'Profil Pasien',
  description: 'Informasi profil dan kontak pasien MedFlow.',
};

function formatDate(value) {
  if (!value) return 'Belum diisi';
  const date =
    value instanceof Date
      ? value
      : new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime())
    ? 'Belum diisi'
    : new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(date);
}

function ProfileField({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold text-slate-800">{value || 'Belum diisi'}</p>
      </div>
    </div>
  );
}

export default async function PatientProfilePage() {
  const [user, profileRes] = await Promise.all([
    getCurrentUser(),
    getPatientProfile(),
  ]);
  const patient = profileRes?.success ? profileRes.data : null;

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-[#084C61] text-white shadow-sm">
            <UserRound className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-600">
              Profil Pasien
            </p>
            <h1 className="truncate text-2xl font-heading font-extrabold text-slate-900">
              {patient?.full_name || 'Data Profil Pasien'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">{user?.email || ''}</p>
          </div>
        </div>

        {patient?.medical_record_no && (
          <div className="flex items-center gap-2 rounded-xl bg-sky-50 border border-sky-100 px-4 py-2.5 text-xs font-semibold text-sky-800 w-fit">
            <FileText className="h-4 w-4 text-sky-600" />
            <span>No. RM: <strong className="font-mono">{patient.medical_record_no}</strong></span>
          </div>
        )}
      </header>

      {!profileRes?.success && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {profileRes?.error || 'Profil pasien gagal dimuat.'}
        </p>
      )}

      {patient && (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-heading font-bold text-slate-800 uppercase tracking-wider">
              Data Identitas & Medis Pribadi
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <ProfileField icon={UserRound} label="Nama Lengkap" value={patient.full_name} />
              <ProfileField icon={CalendarDays} label="Tanggal Lahir" value={formatDate(patient.birth_date)} />
              <ProfileField
                icon={UserRound}
                label="Jenis Kelamin"
                value={{ L: 'Laki-laki', P: 'Perempuan' }[patient.gender] || patient.gender}
              />
              <ProfileField icon={Droplet} label="Golongan Darah" value={patient.blood_type} />
              <ProfileField icon={Phone} label="Nomor Telepon" value={patient.phone} />
              <ProfileField icon={Phone} label="Kontak Darurat" value={patient.emergency_contact} />
              <ProfileField icon={HeartPulse} label="Riwayat Alergi" value={patient.allergies} />
              <ProfileField icon={MapPin} label="Alamat Lengkap" value={patient.address} />
            </div>
          </section>

          <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-500/10 p-4 text-xs leading-relaxed text-sky-900">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
            <p>
              Data profil hanya dapat diubah melalui petugas administrasi. Hubungi fasilitas kesehatan jika ada informasi yang perlu diperbarui.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
