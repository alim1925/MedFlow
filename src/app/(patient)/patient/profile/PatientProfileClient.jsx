'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/apiClient';
import {
  CalendarDays,
  Droplet,
  FileText,
  HeartPulse,
  MapPin,
  Phone,
  UserRound,
  Pencil,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Save,
  IdCard,
} from 'lucide-react';

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

function toInputDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return '';
  }
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

export default function PatientProfileClient({ initialPatient, userEmail }) {
  const router = useRouter();
  const [patient, setPatient] = useState(initialPatient);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    full_name: initialPatient?.full_name || '',
    nik: initialPatient?.nik || '',
    birth_date: toInputDate(initialPatient?.birth_date),
    gender: initialPatient?.gender || 'L',
    blood_type: initialPatient?.blood_type || '',
    phone: initialPatient?.phone || '',
    emergency_contact: initialPatient?.emergency_contact || '',
    allergies: initialPatient?.allergies || '',
    address: initialPatient?.address || '',
  });

  const startEdit = () => {
    setFormData({
      full_name: patient?.full_name || '',
      nik: patient?.nik || '',
      birth_date: toInputDate(patient?.birth_date),
      gender: patient?.gender || 'L',
      blood_type: patient?.blood_type || '',
      phone: patient?.phone || '',
      emergency_contact: patient?.emergency_contact || '',
      allergies: patient?.allergies || '',
      address: patient?.address || '',
    });
    setError('');
    setIsEditing(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await apiRequest('/api/patient/profile', {
        method: 'PATCH',
        body: formData,
      });

      if (res?.success && res.data) {
        setPatient(res.data);
        setIsEditing(false);
        setToast('Informasi pribadi Anda berhasil diperbarui.');
        router.refresh();
        setTimeout(() => setToast(''), 4000);
      } else {
        setError(res?.error || 'Gagal memperbarui profil pasien.');
      }
    } catch {
      setError('Terjadi kendala jaringan saat menyimpan profil.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!patient) return null;

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
              {patient.full_name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">{userEmail || ''}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {patient.medical_record_no && (
            <div className="flex items-center gap-2 rounded-xl bg-sky-50 border border-sky-100 px-3.5 py-2 text-xs font-semibold text-sky-800">
              <FileText className="h-4 w-4 text-sky-600" />
              <span>
                No. RM: <strong className="font-mono">{patient.medical_record_no}</strong>
              </span>
            </div>
          )}

          {!isEditing && (
            <button
              type="button"
              onClick={startEdit}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit Informasi Pribadi</span>
            </button>
          )}
        </div>
      </header>

      {toast && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {error && (
        <div role="alert" className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isEditing ? (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-heading font-bold text-base text-slate-900">
              Perbarui Informasi Pribadi Pasien
            </h2>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">NIK (16 Digit)</label>
              <input
                type="text"
                maxLength={16}
                value={formData.nik}
                onChange={(e) => setFormData({ ...formData, nik: e.target.value.replace(/\D/g, '') })}
                placeholder="16 digit NIK"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tanggal Lahir *</label>
              <input
                type="date"
                required
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Jenis Kelamin *</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Golongan Darah</label>
              <select
                value={formData.blood_type}
                onChange={(e) => setFormData({ ...formData, blood_type: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">Belum diketahui</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="AB">AB</option>
                <option value="O">O</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nomor Telepon</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="0812xxxxxxxx"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kontak Darurat</label>
              <input
                type="text"
                value={formData.emergency_contact}
                onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                placeholder="Nama & nomor telepon kerabat"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Riwayat Alergi</label>
              <input
                type="text"
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                placeholder="Contoh: Penicillin, Udang, Tidak ada"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Alamat Lengkap</label>
              <textarea
                rows={3}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Alamat domisili saat ini..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsEditing(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      ) : (
        <section className="space-y-3">
          <h2 className="text-sm font-heading font-bold text-slate-800 uppercase tracking-wider">
            Data Identitas & Medis Pribadi
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ProfileField icon={UserRound} label="Nama Lengkap" value={patient.full_name} />
            <ProfileField icon={IdCard} label="NIK" value={patient.nik} />
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
      )}
    </div>
  );
}
