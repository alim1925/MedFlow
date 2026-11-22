'use client';

import { useState, useMemo } from 'react';
import { apiRequest } from '@/lib/apiClient';
import {
  Wrench,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Clock,
  Trash2,
  ShieldAlert,
} from 'lucide-react';

const SEVERITY_CONFIG = {
  LOW: { label: 'Ringan', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  MEDIUM: { label: 'Sedang', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  HIGH: { label: 'Tinggi', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
  CRITICAL: { label: 'Kritis / Darurat', badge: 'bg-red-50 text-red-700 border-red-200' },
};

const STATUS_CONFIG = {
  REPORTED: { label: 'Menunggu Penanganan', badge: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  IN_PROGRESS: { label: 'Sedang Diperbaiki', badge: 'bg-sky-50 text-sky-700 border-sky-200', icon: Wrench },
  RESOLVED: { label: 'Selesai Diperbaiki', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
};

function formatDateIndo(dateStr) {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
}

export default function EquipmentReportsClient({ initialReports = [], defaultDepartment = '' }) {
  const [reports, setReports] = useState(initialReports);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Create Modal
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [toast, setToast] = useState('');
  const [pageError, setPageError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const [formData, setFormData] = useState({
    equipment_code: '',
    equipment_name: '',
    department: defaultDepartment || '',
    severity: 'MEDIUM',
    reported_date: new Date().toISOString().slice(0, 10),
    description: '',
  });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4500);
  };

  const openCreateModal = () => {
    setFormData({
      equipment_code: '',
      equipment_name: '',
      department: defaultDepartment || '',
      severity: 'MEDIUM',
      reported_date: new Date().toISOString().slice(0, 10),
      description: '',
    });
    setModalError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError('');
    setPageError('');

    try {
      const res = await apiRequest('/api/doctor/equipment-reports', {
        method: 'POST',
        body: formData,
      });

      if (res?.success && res.data) {
        setReports((prev) => [res.data, ...prev]);
        setShowModal(false);
        showToast(
          `Laporan kerusakan "${res.data.equipment_name}" berhasil dikirim ke bagian administrasi & pemeliharaan.`
        );
      } else {
        setModalError(res?.error || 'Gagal mengirim laporan kerusakan alat.');
      }
    } catch {
      setModalError('Terjadi kendala jaringan saat mengirim laporan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (rep) => {
    setDeletingId(rep.id);
    setPageError('');
    try {
      const res = await apiRequest(`/api/doctor/equipment-reports/${rep.id}`, {
        method: 'DELETE',
      });
      if (res?.success) {
        setReports((prev) => prev.filter((item) => item.id !== rep.id));
        showToast(`Laporan "${rep.equipment_name}" berhasil dibatalkan.`);
      } else {
        setPageError(res?.error || 'Gagal membatalkan laporan.');
      }
    } catch {
      setPageError('Terjadi kendala jaringan saat membatalkan laporan.');
    } finally {
      setDeletingId(null);
    }
  };

  const counts = useMemo(() => {
    return {
      total: reports.length,
      reported: reports.filter((r) => r.effective_status === 'REPORTED').length,
      inProgress: reports.filter((r) => r.effective_status === 'IN_PROGRESS').length,
      resolved: reports.filter((r) => r.effective_status === 'RESOLVED').length,
    };
  }, [reports]);

  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return reports.filter((r) => {
      const matchesStatus = statusFilter === 'ALL' || r.effective_status === statusFilter;
      const matchesQuery =
        !q ||
        [r.equipment_code, r.equipment_name, r.department, r.description, r.vendor_name]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      return matchesStatus && matchesQuery;
    });
  }, [reports, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">
            <ShieldAlert className="w-4 h-4" />
            <span>Pelaporan Sarana & Alat Medis</span>
          </div>
          <h1 className="text-2xl font-heading font-extrabold text-slate-900">
            Lapor Alat Medis Rusak
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Laporkan kerusakan atau gangguan alat medis di ruang praktik agar segera ditindaklanjuti tim teknis & admin
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs sm:text-sm shadow-sm transition cursor-pointer w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>Laporkan Alat Rusak</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <span className="text-xs font-medium text-slate-500 block">Total Laporan Saya</span>
          <span className="text-2xl font-heading font-extrabold text-slate-900 mt-1 block">
            {counts.total}
          </span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <span className="text-xs font-medium text-slate-500 block">Menunggu Penanganan</span>
          <span className="text-2xl font-heading font-extrabold text-amber-600 mt-1 block">
            {counts.reported}
          </span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <span className="text-xs font-medium text-slate-500 block">Sedang Diperbaiki</span>
          <span className="text-2xl font-heading font-extrabold text-sky-600 mt-1 block">
            {counts.inProgress}
          </span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <span className="text-xs font-medium text-slate-500 block">Selesai Diperbaiki</span>
          <span className="text-2xl font-heading font-extrabold text-emerald-600 mt-1 block">
            {counts.resolved}
          </span>
        </div>
      </div>

      {toast && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {pageError && (
        <div role="alert" className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span>{pageError}</span>
        </div>
      )}

      {/* Search & Status Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari nama alat, kode alat, unit/poli, keluhan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 w-full sm:w-auto"
        >
          <option value="ALL">Semua Status</option>
          <option value="REPORTED">Menunggu Penanganan</option>
          <option value="IN_PROGRESS">Sedang Diperbaiki</option>
          <option value="RESOLVED">Selesai Diperbaiki</option>
        </select>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {filteredReports.length === 0 ? (
          <div className="py-16 text-center px-4">
            <Wrench className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-heading font-bold text-slate-700">
              Belum Ada Laporan Kerusakan Alat
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Klik &ldquo;Laporkan Alat Rusak&rdquo; bila terdapat alat medis yang bermasalah di poliklinik Anda.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredReports.map((rep) => {
              const sev = SEVERITY_CONFIG[rep.severity] || SEVERITY_CONFIG.MEDIUM;
              const st = STATUS_CONFIG[rep.effective_status] || STATUS_CONFIG.REPORTED;
              const StatusIcon = st.icon;
              const canDelete = rep.effective_status === 'REPORTED';

              return (
                <div key={rep.id} className="p-5 hover:bg-slate-50/50 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-heading font-bold text-sm sm:text-base text-slate-900">
                        {rep.equipment_name}
                      </h3>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {rep.equipment_code}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${sev.badge}`}>
                        <AlertTriangle className="w-3 h-3" />
                        Urgensi: {sev.label}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${st.badge}`}>
                        <StatusIcon className="w-3 h-3" />
                        {st.label}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500">
                      Unit/Poli: <strong className="text-slate-700">{rep.department || '-'}</strong> • Tanggal Lapor:{' '}
                      <span className="font-medium text-slate-700">{formatDateIndo(rep.reported_date)}</span>
                      {rep.vendor_name && (
                        <>
                          {' '}• Teknisi/Vendor: <strong className="text-slate-700">{rep.vendor_name}</strong>
                        </>
                      )}
                    </p>

                    <p className="text-xs text-slate-700 bg-slate-50 border border-slate-100 rounded-xl p-3 leading-relaxed">
                      {rep.description}
                    </p>
                  </div>

                  {canDelete && (
                    <div className="flex-shrink-0">
                      <button
                        type="button"
                        disabled={deletingId === rep.id}
                        onClick={() => handleDelete(rep)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                      >
                        {deletingId === rep.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        <span>Batalkan</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Damage Report Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-heading font-bold text-base text-slate-900 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-sky-600" />
                <span>Formulir Laporan Alat Rusak</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kode Alat Medis *</label>
                  <input
                    type="text"
                    required
                    value={formData.equipment_code}
                    onChange={(e) => setFormData({ ...formData, equipment_code: e.target.value })}
                    placeholder="ALT-USG-01"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit / Poliklinik</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="Poli Penyakit Dalam"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Alat Medis *</label>
                <input
                  type="text"
                  required
                  value={formData.equipment_name}
                  onChange={(e) => setFormData({ ...formData, equipment_name: e.target.value })}
                  placeholder="Contoh: Tensimeter Digital / Mesin USG / Dental Unit"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tingkat Urgensi *</label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="LOW">Ringan</option>
                    <option value="MEDIUM">Sedang</option>
                    <option value="HIGH">Tinggi</option>
                    <option value="CRITICAL">Kritis / Darurat</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Kejadian *</label>
                  <input
                    type="date"
                    required
                    value={formData.reported_date}
                    onChange={(e) => setFormData({ ...formData, reported_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deskripsi Kerusakan *</label>
                <textarea
                  rows={3}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Jelaskan gejala kerusakan alat (misal: layar mati total, sensor tidak terbaca, selang bocor)..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
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
                className="py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Kirim Laporan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
