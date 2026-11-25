'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { apiRequest } from '@/lib/apiClient';
import {
  UserCheck,
  Plus,
  Pencil,
  Power,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Stethoscope,
  Mail,
  Lock,
  FileText
} from 'lucide-react';

function getInitials(name = '') {
  const clean = name.replace(/^(drg?\.|dr\.|Prof\.|Sp\.[A-Z()]+)/gi, '').trim();
  const parts = clean.split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] ? parts[0].substring(0, 2) : 'DR').toUpperCase();
}

export default function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [polis, setPolis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    poli_id: '',
    str_number: '',
    birth_date: '',
    bio: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [docsRes, polisRes] = await Promise.all([
        apiRequest('/api/admin/doctors'),
        apiRequest('/api/admin/polis'),
      ]);
      if (docsRes?.success && Array.isArray(docsRes.data)) setDoctors(docsRes.data);
      if (polisRes?.success && Array.isArray(polisRes.data)) setPolis(polisRes.data);
    } catch (err) {
      console.error('Error loading doctors data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      email: '',
      password: '',
      full_name: '',
      poli_id: polis.length > 0 ? String(polis[0].id) : '',
      str_number: '',
      birth_date: '',
      bio: '',
    });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (doc) => {
    setEditingId(doc.id);
    setFormData({
      email: doc.email || '',
      password: '',
      full_name: doc.full_name || '',
      poli_id: String(doc.poli_id || ''),
      str_number: doc.str_number || '',
      birth_date: doc.birth_date ? String(doc.birth_date).slice(0, 10) : '',
      bio: doc.bio || '',
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      setError('Nama dokter wajib diisi.');
      return;
    }
    if (!formData.poli_id) {
      setError('Pilih poliklinik tempat dokter bertugas.');
      return;
    }
    if (!editingId && (!formData.email.trim() || !formData.password.trim())) {
      setError('Email dan kata sandi wajib diisi untuk pembuatan akun dokter baru.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const data = new FormData();
      data.append('full_name', formData.full_name.trim());
      data.append('poli_id', formData.poli_id);
      data.append('str_number', formData.str_number.trim());
      data.append('birth_date', formData.birth_date || '');
      data.append('bio', formData.bio.trim());

      let res;
      if (editingId) {
        res = await apiRequest(`/api/admin/doctors/${editingId}`, {
          method: 'PATCH',
          body: data,
        });
      } else {
        data.append('email', formData.email.trim());
        data.append('password', formData.password);
        res = await apiRequest('/api/admin/doctors', {
          method: 'POST',
          body: data,
        });
      }

      if (res && res.success) {
        setToast(editingId ? 'Profil dokter berhasil diperbarui.' : 'Dokter baru berhasil didaftarkan.');
        setShowModal(false);
        await loadData();
      } else {
        setError(res?.error || 'Gagal menyimpan data dokter.');
      }
    } catch (err) {
      console.error('Submit doctor error:', err);
      setError('Terjadi kendala jaringan saat memproses data dokter.');
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast(''), 4000);
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    const actionName = currentStatus ? 'menonaktifkan' : 'mengaktifkan kembali';
    if (!window.confirm(`Apakah Anda yakin ingin ${actionName} dokter ini?`)) return;

    try {
      const res = await apiRequest(`/api/admin/doctors/${id}/toggle-active`, {
        method: 'PATCH',
      });
      if (res && res.success) {
        setToast('Status dokter berhasil diubah.');
        await loadData();
      } else {
        alert(res?.error || 'Gagal mengubah status dokter.');
      }
    } catch (err) {
      console.error('Toggle doctor error:', err);
      alert('Terjadi kesalahan saat memproses status.');
    } finally {
      setTimeout(() => setToast(''), 4000);
    }
  };

  const filteredDoctors = doctors.filter((d) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      d.full_name.toLowerCase().includes(q) ||
      (d.poli_name && d.poli_name.toLowerCase().includes(q)) ||
      (d.str_number && d.str_number.toLowerCase().includes(q)) ||
      (d.email && d.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans md:flex-row">
      <Sidebar role="ADMIN" userName="Administrator" userEmail="admin@medflow.com" />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-extrabold text-slate-900">
              Direktori Dokter Spesialis
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Pendaftaran akun dokter, penempatan poliklinik, nomor Surat Tanda Registrasi (STR)
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs sm:text-sm shadow-sm transition cursor-pointer w-fit"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Dokter Baru</span>
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2.5 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{toast}</span>
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari dokter, poli, nomor STR, atau email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {filteredDoctors.length} Dokter
          </span>
        </div>

        {/* Doctors Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="w-8 h-8 text-sky-500 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">Memuat data dokter...</p>
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="py-16 text-center">
              <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-heading font-bold text-slate-700">
                Tidak Ada Dokter Ditemukan
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Silakan sesuaikan kata kunci pencarian atau daftarkan dokter baru.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Nama Dokter & Akun</th>
                    <th className="py-3 px-4">Poliklinik</th>
                    <th className="py-3 px-4">Nomor STR</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDoctors.map((doc) => {
                    const initials = getInitials(doc.full_name);
                    const isActive = doc.is_active !== false;

                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/60 transition">
                        {/* Name + Avatar */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 text-white font-heading font-bold text-xs flex items-center justify-center flex-shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate">
                                {doc.full_name}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate font-mono">
                                {doc.email || 'Akun Dokter'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Poli */}
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-100">
                            {doc.poli_name || 'Poli Umum'}
                          </span>
                        </td>

                        {/* STR */}
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-600">
                          {doc.str_number || '-'}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                              Nonaktif
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(doc)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition cursor-pointer"
                              title="Edit Dokter"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleActive(doc.id, isActive)}
                              className={`p-1.5 rounded-lg transition cursor-pointer ${
                                isActive
                                  ? 'text-slate-500 hover:text-red-600 hover:bg-red-50'
                                  : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={isActive ? 'Nonaktifkan Dokter' : 'Aktifkan Dokter'}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Add / Edit Doctor Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl animate-scale-up space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-heading font-bold text-base text-slate-900">
                {editingId ? 'Edit Profil Dokter' : 'Pendaftaran Dokter Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Email & Password (only when adding new doctor) */}
            {!editingId && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Email Login Dokter *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="dokter@medflow.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Kata Sandi Awal *
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min. 8 karakter"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            )}

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Nama Lengkap & Gelar Spesialis *
              </label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Contoh: dr. Amanda Pratama, Sp.A"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Poli Selection & STR */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Poliklinik Bertugas *
                </label>
                <select
                  required
                  value={formData.poli_id}
                  onChange={(e) => setFormData({ ...formData, poli_id: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="">-- Pilih Poliklinik --</option>
                  {polis.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Nomor STR (Konsil Kedokteran)
                </label>
                <input
                  type="text"
                  value={formData.str_number}
                  onChange={(e) => setFormData({ ...formData, str_number: e.target.value })}
                  placeholder="STR-2024-XXXXXXX"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Birth Date */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Tanggal Lahir Dokter
              </label>
              <input
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Digunakan untuk verifikasi pemilik akun saat menggunakan fitur lupa kata sandi.
              </p>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Profil Singkat & Keahlian Klinis
              </label>
              <textarea
                rows={3}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tuliskan latar belakang pendidikan dan spesialisasi fokus dokter..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowModal(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Simpan Dokter'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
