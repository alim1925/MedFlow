'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { apiRequest } from '@/lib/apiClient';
import {
  Calendar,
  Clock,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Timer
} from 'lucide-react';

const DAY_MAP = {
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu',
  0: 'Minggu',
};

export default function DoctorSchedulesPage() {
  const [schedules, setSchedules] = useState([]);
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pageError, setPageError] = useState('');
  const [toast, setToast] = useState('');

  const [formData, setFormData] = useState({
    day_of_week: 1,
    start_time: '08:00',
    end_time: '12:00',
    slot_minutes: 30,
  });

  const refreshData = async () => {
    try {
      const [schedRes, docRes] = await Promise.all([
        apiRequest('/api/doctor/schedules'),
        apiRequest('/api/doctor/profile'),
      ]);
      if (schedRes?.success && Array.isArray(schedRes.data)) {
        setSchedules(schedRes.data);
      } else if (schedRes?.error) {
        setPageError(schedRes.error);
      }
      if (docRes?.success && docRes.data) setDoctor(docRes.data);
    } catch (err) {
      console.error('Error loading schedules:', err);
      setPageError('Gagal memuat jadwal praktik.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const [schedRes, docRes] = await Promise.all([
          apiRequest('/api/doctor/schedules'),
          apiRequest('/api/doctor/profile'),
        ]);
        if (cancelled) return;
        if (schedRes?.success && Array.isArray(schedRes.data)) {
          setSchedules(schedRes.data);
        } else if (schedRes?.error) {
          setPageError(schedRes.error);
        }
        if (docRes?.success && docRes.data) setDoctor(docRes.data);
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading schedules:', err);
          setPageError('Gagal memuat jadwal praktik.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      day_of_week: 1,
      start_time: '08:00',
      end_time: '12:00',
      slot_minutes: 30,
    });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.id);
    setFormData({
      day_of_week: item.day_of_week,
      start_time: item.start_time?.substring(0, 5) || '08:00',
      end_time: item.end_time?.substring(0, 5) || '12:00',
      slot_minutes: item.slot_minutes || 30,
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.start_time >= formData.end_time) {
      setError('Jam selesai harus lebih lambat dari jam mulai.');
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('day_of_week', String(formData.day_of_week));
      form.append('start_time', formData.start_time);
      form.append('end_time', formData.end_time);
      form.append('slot_minutes', String(formData.slot_minutes));

      let res;
      if (editingId) {
        res = await apiRequest(`/api/doctor/schedules/${editingId}`, {
          method: 'PATCH',
          body: form,
        });
      } else {
        res = await apiRequest('/api/doctor/schedules', {
          method: 'POST',
          body: form,
        });
      }

      if (res && res.success) {
        setToast(editingId ? 'Jadwal praktik berhasil diperbarui.' : 'Jadwal praktik baru berhasil ditambahkan.');
        setShowModal(false);
        await refreshData();
      } else {
        setError(res?.error || 'Gagal menyimpan jadwal praktik.');
      }
    } catch (err) {
      console.error('Submit schedule error:', err);
      setError('Terjadi kendala pada server saat menyimpan jadwal.');
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast(''), 4000);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus jadwal praktik ini?')) return;

    setPageError('');
    try {
      const res = await apiRequest(`/api/doctor/schedules/${id}`, {
        method: 'DELETE',
      });
      if (res && res.success) {
        setToast('Jadwal praktik berhasil dihapus.');
        await refreshData();
      } else {
        setPageError(res?.error || 'Gagal menghapus jadwal.');
      }
    } catch (err) {
      console.error('Delete schedule error:', err);
      setPageError('Terjadi kesalahan saat menghapus jadwal.');
    } finally {
      setTimeout(() => setToast(''), 4000);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans md:flex-row">
      <Sidebar
        role="DOCTOR"
        userName={doctor?.full_name || 'dr. Spesialis'}
        userEmail={doctor?.email || 'dokter@medflow.com'}
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-heading font-extrabold text-slate-900">
              Jadwal Praktik Dokter
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Atur hari kerja, jam operasional konsultasi, dan durasi per sesi antrean pasien
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs sm:text-sm shadow-sm transition cursor-pointer w-fit"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Jadwal Baru</span>
          </button>
        </div>

        {/* Toast & Error */}
        {toast && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2.5 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{toast}</span>
          </div>
        )}
        {pageError && (
          <div role="alert" className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-center gap-2.5 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span>{pageError}</span>
          </div>
        )}

        {/* Schedules Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-heading font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-500" />
              <span>Daftar Sesi Praktik Rutin</span>
            </h2>
            <span className="text-xs font-semibold text-slate-400">
              {schedules.length} Sesi Aktif
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-7 h-7 text-sky-500 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">Memuat jadwal dokter...</p>
            </div>
          ) : schedules.length === 0 ? (
            <div className="py-16 text-center">
              <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-heading font-bold text-slate-700">
                Belum Ada Jadwal Praktik
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Tambahkan sesi praktik mingguan agar pasien dapat memilih slot booking.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Hari Praktik</th>
                    <th className="py-3 px-4">Jam Mulai</th>
                    <th className="py-3 px-4">Jam Selesai</th>
                    <th className="py-3 px-4">Durasi Per Slot</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {schedules.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {DAY_MAP[item.day_of_week] || `Hari ${item.day_of_week}`}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                        {item.start_time?.substring(0, 5)} WIB
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                        {item.end_time?.substring(0, 5)} WIB
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          <Timer className="w-3 h-3 text-sky-500" />
                          {item.slot_minutes || 30} menit
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Aktif
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition cursor-pointer"
                            title="Edit Jadwal"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                            title="Hapus Jadwal"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl animate-scale-up space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-heading font-bold text-base text-slate-900">
                {editingId ? 'Edit Jadwal Praktik' : 'Tambah Jadwal Praktik Baru'}
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

            {/* Hari Select */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Hari Praktik *
              </label>
              <select
                value={formData.day_of_week}
                onChange={(e) =>
                  setFormData({ ...formData, day_of_week: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value={1}>Senin</option>
                <option value={2}>Selasa</option>
                <option value={3}>Rabu</option>
                <option value={4}>Kamis</option>
                <option value={5}>Jumat</option>
                <option value={6}>Sabtu</option>
                <option value={0}>Minggu</option>
              </select>
            </div>

            {/* Jam Mulai & Selesai */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Jam Mulai *
                </label>
                <input
                  type="time"
                  required
                  value={formData.start_time}
                  onChange={(e) =>
                    setFormData({ ...formData, start_time: e.target.value })
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Jam Selesai *
                </label>
                <input
                  type="time"
                  required
                  value={formData.end_time}
                  onChange={(e) =>
                    setFormData({ ...formData, end_time: e.target.value })
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                />
              </div>
            </div>

            {/* Durasi Slot */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Estimasi Durasi Konsultasi Per Pasien *
              </label>
              <select
                value={formData.slot_minutes}
                onChange={(e) =>
                  setFormData({ ...formData, slot_minutes: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value={15}>15 Menit</option>
                <option value={20}>20 Menit</option>
                <option value={30}>30 Menit (Standar)</option>
                <option value={45}>45 Menit</option>
                <option value={60}>60 Menit</option>
              </select>
            </div>

            {/* Buttons */}
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
                  'Simpan Jadwal'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
