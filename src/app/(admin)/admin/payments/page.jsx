'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import StatusBadge from '@/components/StatusBadge';
import { apiRequest } from '@/lib/apiClient';
import { formatRupiah } from '@/lib/currency';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  Receipt,
  User,
  Stethoscope,
  Pill,
  X,
  BadgeCheck,
  Banknote,
} from 'lucide-react';

function formatDateIndo(dateStr) {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

const PAYMENT_METHOD_LABELS = {
  TRANSFER: 'Transfer Bank',
  QRIS: 'QRIS',
  CASH: 'Tunai di Loket',
  BPJS: 'BPJS / Penjamin',
};

const PAYMENT_TABS = [
  { id: 'ALL', label: 'Semua Tagihan' },
  { id: 'WAITING_CONFIRMATION', label: 'Menunggu Konfirmasi' },
  { id: 'UNPAID', label: 'Belum Dibayar' },
  { id: 'PAID', label: 'Lunas' },
  { id: 'REJECTED', label: 'Ditolak' },
];

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [itemErrors, setItemErrors] = useState({});
  const [toast, setToast] = useState('');

  // Reject Modal State
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  // Counter Confirm Modal State (for UNPAID / REJECTED direct counter confirmation)
  const [counterConfirmTarget, setCounterConfirmTarget] = useState(null);
  const [counterMethod, setCounterMethod] = useState('CASH');
  const [counterNotes, setCounterNotes] = useState('');

  const loadPayments = useCallback(async () => {
    try {
      const res = await apiRequest('/api/admin/payments');
      setPayments(res?.success && Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching prescription payments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchInitial = async () => {
      try {
        const res = await apiRequest('/api/admin/payments');
        if (!cancelled) {
          setPayments(res?.success && Array.isArray(res.data) ? res.data : []);
        }
      } catch (err) {
        console.error('Error fetching prescription payments:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchInitial();
    const interval = setInterval(loadPayments, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [loadPayments]);

  const handleConfirm = async (prescriptionId, extraBody = {}) => {
    setActionLoadingId(prescriptionId);
    setItemErrors((prev) => ({ ...prev, [prescriptionId]: '' }));
    try {
      const res = await apiRequest(`/api/admin/payments/${prescriptionId}/confirm`, {
        method: 'POST',
        body: extraBody,
      });
      if (res && res.success) {
        setToast(res.message || 'Pembayaran berhasil dikonfirmasi lunas.');
        setCounterConfirmTarget(null);
        setCounterNotes('');
        await loadPayments();
      } else {
        setItemErrors((prev) => ({
          ...prev,
          [prescriptionId]: res?.error || 'Gagal mengonfirmasi pembayaran.',
        }));
      }
    } catch (err) {
      console.error('Confirm payment error:', err);
      setItemErrors((prev) => ({
        ...prev,
        [prescriptionId]: 'Terjadi kendala jaringan saat mengonfirmasi pembayaran.',
      }));
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setToast(''), 4000);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectTarget) return;
    if (rejectReason.trim().length < 3) {
      setRejectError('Alasan penolakan wajib diisi minimal 3 karakter.');
      return;
    }

    setActionLoadingId(rejectTarget.prescription_id);
    setRejectError('');
    try {
      const res = await apiRequest(
        `/api/admin/payments/${rejectTarget.prescription_id}/reject`,
        {
          method: 'POST',
          body: { reason: rejectReason.trim() },
        }
      );
      if (res && res.success) {
        setToast(res.message || 'Pembayaran ditolak dan pasien telah diberi notifikasi.');
        setRejectTarget(null);
        setRejectReason('');
        await loadPayments();
      } else {
        setRejectError(res?.error || 'Gagal menolak pembayaran.');
      }
    } catch (err) {
      console.error('Reject payment error:', err);
      setRejectError('Terjadi kendala jaringan saat menolak pembayaran.');
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setToast(''), 4000);
    }
  };

  const waitingCount = payments.filter((p) => p.payment_status === 'WAITING_CONFIRMATION').length;
  const unpaidCount = payments.filter((p) => p.payment_status === 'UNPAID').length;
  const paidList = payments.filter((p) => p.payment_status === 'PAID');
  const paidTotalAmount = paidList.reduce((acc, p) => acc + (Number(p.total_amount) || 0), 0);
  const rejectedCount = payments.filter((p) => p.payment_status === 'REJECTED').length;

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredPayments = payments.filter((p) => {
    const matchesTab = activeTab === 'ALL' || p.payment_status === activeTab;
    const matchesSearch =
      !normalizedQuery ||
      [p.patient_name, p.medical_record_no, p.invoice_number, p.payment_reference, p.doctor_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(normalizedQuery));
    return matchesTab && matchesSearch;
  });

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans md:flex-row">
      <Sidebar role="ADMIN" userName="Administrator" userEmail="admin@medflow.com" />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
              <CreditCard className="w-4 h-4" />
              <span>Kasir & Verifikasi Pembayaran Farmasi</span>
            </div>
            <h1 className="text-2xl font-heading font-extrabold text-slate-900">
              Konfirmasi Pembayaran Obat Pasien
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Verifikasi bukti/referensi pembayaran resep obat dari pasien dan catat pendapatan farmasi secara otomatis
            </p>
          </div>

          <button
            type="button"
            onClick={loadPayments}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer w-fit"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Segarkan Data</span>
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2.5 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{toast}</span>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm">
            <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider block">
              Menunggu Konfirmasi
            </span>
            <p className="text-2xl font-heading font-extrabold text-indigo-900 mt-1">
              {waitingCount}
            </p>
            <span className="text-[11px] text-slate-500">Perlu verifikasi admin</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-sm">
            <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider block">
              Belum Dibayar
            </span>
            <p className="text-2xl font-heading font-extrabold text-amber-900 mt-1">
              {unpaidCount}
            </p>
            <span className="text-[11px] text-slate-500">Menunggu pembayaran pasien</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
            <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">
              Lunas Terkonfirmasi ({paidList.length})
            </span>
            <p className="text-xl sm:text-2xl font-heading font-extrabold text-emerald-700 mt-1">
              {formatRupiah(paidTotalAmount)}
            </p>
            <span className="text-[11px] text-slate-500">Tercatat ke pendapatan farmasi</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-red-100 shadow-sm">
            <span className="text-[11px] font-semibold text-red-600 uppercase tracking-wider block">
              Ditolak
            </span>
            <p className="text-2xl font-heading font-extrabold text-red-700 mt-1">
              {rejectedCount}
            </p>
            <span className="text-[11px] text-slate-500">Menunggu kirim ulang pasien</span>
          </div>
        </div>

        {/* Filter Tabs & Search */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {PAYMENT_TABS.map((tab) => {
              const count =
                tab.id === 'ALL'
                  ? payments.length
                  : payments.filter((p) => p.payment_status === tab.id).length;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-white text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari pasien, No. RM, No. Invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Payment List */}
        {loading ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-slate-100">
            <Loader2 className="w-8 h-8 text-sky-500 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Memuat daftar tagihan & pembayaran obat...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 border border-slate-100 shadow-sm text-center">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-heading font-bold text-slate-800">
              Tidak Ada Data Pembayaran
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Tagihan pembayaran obat akan otomatis terbentuk saat dokter menerbitkan resep pasien.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {filteredPayments.map((pay) => {
              const isLoading = actionLoadingId === pay.prescription_id;
              const errMsg = itemErrors[pay.prescription_id];
              const badgeKey =
                pay.payment_status === 'REJECTED' ? 'PAYMENT_REJECTED' : pay.payment_status;
              const items = pay.items || [];

              return (
                <div
                  key={pay.prescription_id}
                  className={`bg-white rounded-2xl p-5 border shadow-sm space-y-4 flex flex-col justify-between ${
                    pay.payment_status === 'WAITING_CONFIRMATION'
                      ? 'border-indigo-200 ring-1 ring-indigo-100'
                      : 'border-slate-100'
                  }`}
                >
                  <div className="space-y-3.5">
                    {/* Top Header */}
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {pay.invoice_number}
                          </span>
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700">
                            {pay.medical_record_no}
                          </span>
                        </div>
                        <h3 className="font-heading font-bold text-base text-slate-900 mt-1.5 flex items-center gap-1.5">
                          <User className="w-4 h-4 text-slate-400" />
                          <span>{pay.patient_name}</span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <Stethoscope className="w-3.5 h-3.5 text-sky-500" />
                          <span>
                            {pay.doctor_name} • {pay.poli_name}
                          </span>
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <StatusBadge status={badgeKey} size="sm" />
                        <StatusBadge status={pay.prescription_status} size="sm" />
                      </div>
                    </div>

                    {/* Itemized Drug Prices */}
                    <div className="rounded-xl border border-slate-100 overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-100">
                          <tr>
                            <th className="py-2 px-3">Obat</th>
                            <th className="py-2 px-2 text-center">Qty</th>
                            <th className="py-2 px-3 text-right">Harga</th>
                            <th className="py-2 px-3 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {items.map((it, idx) => (
                            <tr key={it.id || idx}>
                              <td className="py-2 px-3 font-medium text-slate-800">
                                {it.medicine_name}
                              </td>
                              <td className="py-2 px-2 text-center font-mono text-slate-600">
                                {it.quantity} {it.unit}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-600">
                                {formatRupiah(it.unit_price)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                                {formatRupiah(it.subtotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50 border-t border-slate-200">
                          <tr>
                            <td colSpan={3} className="py-2.5 px-3 font-bold text-slate-700 text-right">
                              Total Tagihan Obat:
                            </td>
                            <td className="py-2.5 px-3 text-right font-heading font-extrabold text-sm text-sky-700">
                              {formatRupiah(pay.total_amount)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Submission / Confirmation Details */}
                    {(pay.payment_status === 'WAITING_CONFIRMATION' ||
                      pay.payment_status === 'PAID' ||
                      pay.payment_status === 'REJECTED') && (
                      <div
                        className={`p-3 rounded-xl border text-xs space-y-1 ${
                          pay.payment_status === 'WAITING_CONFIRMATION'
                            ? 'bg-indigo-50/70 border-indigo-200 text-indigo-950'
                            : pay.payment_status === 'PAID'
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                            : 'bg-red-50/70 border-red-200 text-red-950'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 font-semibold">
                          <span>
                            Metode: {PAYMENT_METHOD_LABELS[pay.payment_method] || pay.payment_method || '-'}
                          </span>
                          {pay.paid_at && (
                            <span className="text-[11px] font-mono opacity-80">
                              Dikirim: {formatDateIndo(pay.paid_at)}
                            </span>
                          )}
                        </div>
                        {pay.payer_name && (
                          <p>
                            Atas Nama / Pengirim: <strong>{pay.payer_name}</strong>
                          </p>
                        )}
                        {pay.payment_reference && (
                          <p>
                            No. Referensi: <strong className="font-mono">{pay.payment_reference}</strong>
                          </p>
                        )}
                        {pay.payment_notes && (
                          <p className="italic opacity-90">Catatan: &ldquo;{pay.payment_notes}&rdquo;</p>
                        )}
                        {pay.payment_status === 'PAID' && pay.confirmed_at && (
                          <p className="text-[11px] text-emerald-800 pt-1">
                            Dikonfirmasi pada {formatDateIndo(pay.confirmed_at)}
                            {pay.confirmed_by_email ? ` oleh ${pay.confirmed_by_email}` : ''}
                          </p>
                        )}
                        {pay.payment_status === 'REJECTED' && pay.rejection_reason && (
                          <p className="text-red-700 font-semibold pt-1">
                            Alasan Penolakan: {pay.rejection_reason}
                          </p>
                        )}
                      </div>
                    )}

                    {errMsg && (
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <span>{errMsg}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
                    {pay.payment_status === 'WAITING_CONFIRMATION' && (
                      <>
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => {
                            setRejectTarget(pay);
                            setRejectReason('');
                            setRejectError('');
                          }}
                          className="py-2 px-3.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Tolak</span>
                        </button>
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleConfirm(pay.prescription_id)}
                          className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Konfirmasi Pembayaran</span>
                            </>
                          )}
                        </button>
                      </>
                    )}

                    {(pay.payment_status === 'UNPAID' || pay.payment_status === 'REJECTED') && (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => {
                          setCounterConfirmTarget(pay);
                          setCounterMethod('CASH');
                          setCounterNotes('');
                        }}
                        className="py-2 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        <Banknote className="w-4 h-4" />
                        <span>Konfirmasi Bayar di Loket</span>
                      </button>
                    )}

                    {pay.payment_status === 'PAID' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                        <BadgeCheck className="w-4 h-4 text-emerald-600" />
                        <span>Pembayaran Lunas</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Reject Payment Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleRejectSubmit}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-heading font-bold text-sm text-slate-900 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" />
                <span>Tolak Konfirmasi Pembayaran</span>
              </h3>
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
              <p className="font-bold text-slate-900">{rejectTarget.patient_name}</p>
              <p className="text-slate-600 font-mono">
                {rejectTarget.invoice_number} • {formatRupiah(rejectTarget.total_amount)}
              </p>
            </div>

            {rejectError && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
                {rejectError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Alasan Penolakan *
              </label>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Contoh: Dana transfer belum masuk atau nomor referensi tidak ditemukan..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={actionLoadingId === rejectTarget.prescription_id}
                className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {actionLoadingId === rejectTarget.prescription_id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Tolak Pembayaran'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Counter Payment Confirm Modal */}
      {counterConfirmTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleConfirm(counterConfirmTarget.prescription_id, {
                payment_method: counterMethod,
                notes: counterNotes,
              });
            }}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-heading font-bold text-sm text-slate-900 flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span>Konfirmasi Pembayaran di Loket</span>
              </h3>
              <button
                type="button"
                onClick={() => setCounterConfirmTarget(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-100 text-xs space-y-1">
              <p className="font-bold text-slate-900">{counterConfirmTarget.patient_name}</p>
              <p className="text-slate-600 font-mono">{counterConfirmTarget.invoice_number}</p>
              <p className="text-sm font-heading font-extrabold text-sky-800 pt-1">
                Total: {formatRupiah(counterConfirmTarget.total_amount)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Metode Pembayaran Diterima *
              </label>
              <select
                value={counterMethod}
                onChange={(e) => setCounterMethod(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="CASH">Tunai (Cash di Loket Kasir)</option>
                <option value="QRIS">QRIS Kasir</option>
                <option value="TRANSFER">Transfer Bank</option>
                <option value="BPJS">BPJS / Penjamin</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Catatan Verifikasi (Opsional)
              </label>
              <input
                type="text"
                value={counterNotes}
                onChange={(e) => setCounterNotes(e.target.value)}
                placeholder="Contoh: Dibayar tunai di loket farmasi lantai 1"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCounterConfirmTarget(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={actionLoadingId === counterConfirmTarget.prescription_id}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {actionLoadingId === counterConfirmTarget.prescription_id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Konfirmasi Lunas'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
