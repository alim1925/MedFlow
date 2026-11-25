'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/apiClient';
import {
  Stethoscope,
  Award,
  CalendarDays,
  Phone,
  FileText,
  Mail,
  Building2,
  Pencil,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Save,
  Image as ImageIcon,
} from 'lucide-react';

function formatBirthDate(value) {
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

export default function DoctorProfileClient({ initialDoctor }) {
  const router = useRouter();
  const [doctor, setDoctor] = useState(initialDoctor);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    full_name: initialDoctor?.full_name || '',
    str_number: initialDoctor?.str_number || '',
    birth_date: initialDoctor?.birth_date ? String(initialDoctor.birth_date).slice(0, 10) : '',
    phone: initialDoctor?.phone || '',
    bio: initialDoctor?.bio || '',
    photo_url: initialDoctor?.photo_url || '',
  });

  const startEdit = () => {
    setFormData({
      full_name: doctor?.full_name || '',
      str_number: doctor?.str_number || '',
      birth_date: doctor?.birth_date ? String(doctor.birth_date).slice(0, 10) : '',
      phone: doctor?.phone || '',
      bio: doctor?.bio || '',
      photo_url: doctor?.photo_url || '',
    });
    setError('');
    setIsEditing(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await apiRequest('/api/doctor/profile', {
        method: 'PATCH',
        body: formData,
      });

      if (res?.success && res.data) {
        setDoctor(res.data);
        setIsEditing(false);
        setToast('Informasi pribadi dokter berhasil diperbarui.');
        router.refresh();
        setTimeout(() => setToast(''), 4000);
      } else {
        setError(res?.error || 'Gagal memperbarui profil dokter.');
      }
    } catch {
      setError('Terjadi kendala jaringan saat menyimpan profil.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!doctor) return null;

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {doctor.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={doctor.photo_url}
              alt={doctor.full_name}
              className="h-14 w-14 shrink-0 rounded-2xl object-cover border border-slate-200 bg-slate-50"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-[#084C61] text-white shadow-sm">
              <Stethoscope className="h-7 w-7" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-600">
              Profil Dokter
            </p>
            <h1 className="truncate text-2xl font-heading font-extrabold text-slate-900">
              {doctor.full_name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {doctor.poli_name || 'Poliklinik'} • {doctor.email}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {doctor.str_number && (
            <div className="flex items-center gap-2 rounded-xl bg-sky-50 border border-sky-100 px-3.5 py-2 text-xs font-semibold text-sky-800">
              <Award className="h-4 w-4 text-sky-600" />
              <span>
                STR: <strong className="font-mono">{doctor.str_number}</strong>
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
              Perbarui Informasi Pribadi Dokter
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
              <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap & Gelar *</label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nomor STR *</label>
              <input
                type="text"
                required
                value={formData.str_number}
                onChange={(e) => setFormData({ ...formData, str_number: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tanggal Lahir</label>
              <input
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
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

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">URL Foto Profil</label>
              <input
                type="text"
                value={formData.photo_url}
                onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Biografi & Pengalaman Klinis</label>
              <textarea
                rows={4}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tuliskan latar belakang pendidikan, keahlian, atau pengalaman praktik..."
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
            Data Pribadi & Kredensial Dokter
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ProfileField icon={Stethoscope} label="Nama Lengkap & Gelar" value={doctor.full_name} />
            <ProfileField icon={Award} label="Nomor STR" value={doctor.str_number} />
            <ProfileField icon={Building2} label="Poliklinik" value={doctor.poli_name} />
            <ProfileField icon={Mail} label="Email Akun" value={doctor.email} />
            <ProfileField icon={CalendarDays} label="Tanggal Lahir" value={formatBirthDate(doctor.birth_date)} />
            <ProfileField icon={Phone} label="Nomor Telepon" value={doctor.phone} />
            <ProfileField icon={ImageIcon} label="URL Foto Profil" value={doctor.photo_url} />
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
              <FileText className="h-4 w-4 text-sky-600" />
              <span>Biografi & Pengalaman Klinis</span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              {doctor.bio || 'Belum ada biografi yang ditambahkan.'}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
