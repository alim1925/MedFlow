'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { apiRequest } from '@/lib/apiClient';
import {
  Layers,
  Plus,
  Pencil,
  Power,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Stethoscope,
  Smile,
  Eye,
  Heart,
  Baby,
  Flower2,
  Activity,
  Brain,
  Bone
} from 'lucide-react';

const ICON_MAP = {
  Stethoscope,
  Smile,
  Eye,
  Heart,
  Baby,
  Flower2,
  Activity,
  Brain,
  Bone,
};

function getPoliIcon(iconName) {
  return ICON_MAP[iconName] || Activity;
}

export default function AdminPolisPage() {
  const [polis, setPolis] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: 'Stethoscope',
  });

  const loadPolisList = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/api/admin/polis');
      setPolis(res?.success && Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching polis:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolisList();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      name: '',
      description: '',
      icon: 'Stethoscope',
    });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (poli) => {
    setEditingId(poli.id);
    setFormData({
      name: poli.name || '',
      description: poli.description || '',
      icon: poli.icon || 'Stethoscope',
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Nama poliklinik wajib diisi.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const data = new FormData();
      data.append('name', formData.name.trim());
      data.append('description', formData.description.trim());
      data.append('icon', formData.icon);

      let res;
      if (editingId) {
        res = await apiRequest(`/api/admin/polis/${editingId}`, {
          method: 'PATCH',
          body: data,
        });
      } else {
        res = await apiRequest('/api/admin/polis', {
          method: 'POST',
          body: data,
        });
      }

      if (res && res.success) {
        setToast(editingId ? 'Data poliklinik berhasil diperbarui.' : 'Poliklinik baru berhasil ditambahkan.');
        setShowModal(false);
        await loadPolisList();
      } else {
        setError(res?.error || 'Gagal menyimpan data poliklinik.');
      }
    } catch (err) {
      console.error('Submit poli error:', err);
      setError('Terjadi kendala jaringan saat menyimpan poliklinik.');
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast(''), 4000);
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    const actionName = currentStatus ? 'menonaktifkan' : 'mengaktifkan kembali';
    if (!window.confirm(`Apakah Anda yakin ingin ${actionName} poliklinik ini?`)) return;

    try {
      const res = await apiRequest(`/api/admin/polis/${id}/toggle-active`, {
        method: 'PATCH',
      });
      if (res && res.success) {
        setToast('Status poliklinik berhasil diubah.');
        await loadPolisList();
      } else {
        alert(res?.error || 'Gagal mengubah status poli.');
      }
    } catch (err) {
      console.error('Toggle poli error:', err);
      alert('Terjadi kesalahan saat memproses status poli.');
    } finally {
      setTimeout(() => setToast(''), 4000);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans md:flex-row">
      <Sidebar role="ADMIN" userName="Administrator" userEmail="admin@medflow.com" />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-extrabold text-slate-900">
              Manajemen Poliklinik Spesialis
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Kelola daftar divisi poliklinik, deskripsi layanan medis, dan ketersediaan layanan publik
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs sm:text-sm shadow-sm transition cursor-pointer w-fit"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Poli Baru</span>
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2.5 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{toast}</span>
          </div>
        )}

        {/* Cards Grid (3 Columns) */}
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 text-sky-500 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Memuat daftar poliklinik...</p>
          </div>
        ) : polis.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-slate-100 shadow-sm text-center">
            <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-heading font-bold text-slate-700">
              Belum Ada Poliklinik Terdaftar
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Klik tombol &ldquo;Tambah Poli Baru&rdquo; untuk mendaftarkan layanan spesialis.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {polis.map((poli) => {
              const Icon = getPoliIcon(poli.icon);
              const isActive = poli.is_active !== false;

              return (
                <div
                  key={poli.id}
                  className={`bg-white rounded-2xl p-6 border shadow-sm flex flex-col justify-between transition-all duration-200 ${
                    isActive ? 'border-slate-100 hover:border-sky-200' : 'border-slate-200 opacity-60'
                  }`}
                >
                  <div>
                    {/* Top Icon & Status Badge */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>

                    <h3 className="text-lg font-heading font-bold text-slate-900 mb-1.5">
                      {poli.name}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-6">
                      {poli.description || 'Pelayanan konsultasi medis rawat jalan komprehensif.'}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-400">
                      Icon: {poli.icon || 'Activity'}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(poli)}
                        className="p-2 rounded-xl text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition cursor-pointer"
                        title="Edit Poli"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(poli.id, isActive)}
                        className={`p-2 rounded-xl transition cursor-pointer ${
                          isActive
                            ? 'text-slate-500 hover:text-red-600 hover:bg-red-50'
                            : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={isActive ? 'Nonaktifkan Poli' : 'Aktifkan Poli'}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal Add / Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl animate-scale-up space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-heading font-bold text-base text-slate-900">
                {editingId ? 'Edit Poliklinik' : 'Tambah Poliklinik Baru'}
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

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Nama Poliklinik *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Poli Saraf / Poli Gigi & Mulut"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Deskripsi Pelayanan
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Jelaskan cakupan konsultasi dan tindakan medis di poli ini..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Ikon Visual Poliklinik
              </label>
              <select
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="Stethoscope">Stethoscope (Umum)</option>
                <option value="Smile">Smile (Gigi & Mulut)</option>
                <option value="Eye">Eye (Mata)</option>
                <option value="Heart">Heart (Jantung)</option>
                <option value="Baby">Baby (Anak / Pediatri)</option>
                <option value="Flower2">Flower2 (Kebidanan / Obgyn)</option>
                <option value="Brain">Brain (Saraf / Neurologi)</option>
                <option value="Bone">Bone (Ortopedi)</option>
                <option value="Activity">Activity (Umum / EKG)</option>
              </select>
            </div>

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
                  'Simpan Poli'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
