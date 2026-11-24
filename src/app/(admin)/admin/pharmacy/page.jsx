'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import StatusBadge from '@/components/StatusBadge';
import { apiRequest } from '@/lib/apiClient';
import { formatRupiah } from '@/lib/currency';
import Link from 'next/link';
import {
  Pill,
  Clock,
  Play,
  CheckCircle2,
  PackageCheck,
  ShoppingBag,
  AlertCircle,
  Loader2,
  RefreshCw,
  User,
  Stethoscope,
  CreditCard,
  ArrowRight
} from 'lucide-react';

function formatDateIndo(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('id-ID', {
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

const PHARMACY_TABS = [
  { id: 'WAITING', label: 'Menunggu', icon: Clock },
  { id: 'PROCESSING', label: 'Diproses', icon: Play },
  { id: 'READY', label: 'Siap Diambil', icon: PackageCheck },
  { id: 'PICKED_UP', label: 'Sudah Diambil', icon: ShoppingBag },
];

export default function AdminPharmacyPage() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('WAITING');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [itemErrors, setItemErrors] = useState({});
  const [toast, setToast] = useState('');

  const loadQueue = useCallback(async () => {
    try {
      const res = await apiRequest('/api/pharmacy/prescriptions');
      setQueue(res?.success && Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching pharmacy queue:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchInitial = async () => {
      try {
        const res = await apiRequest('/api/pharmacy/prescriptions');
        if (!cancelled) {
          setQueue(res?.success && Array.isArray(res.data) ? res.data : []);
        }
      } catch (err) {
        console.error('Error fetching pharmacy queue:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchInitial();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadQueue, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [loadQueue]);

  // Actions
  const handleStartProcessing = async (id) => {
    setActionLoadingId(id);
    setItemErrors((prev) => ({ ...prev, [id]: '' }));
    try {
      const res = await apiRequest(`/api/pharmacy/prescriptions/${id}/process`, {
        method: 'PATCH',
      });
      if (res && res.success) {
        setToast('Resep dipindahkan ke status peracikan/diproses.');
        await loadQueue();
      } else {
        setItemErrors((prev) => ({ ...prev, [id]: res?.error || 'Gagal memproses resep.' }));
      }
    } catch (err) {
      console.error('Error starting processing:', err);
      setItemErrors((prev) => ({ ...prev, [id]: 'Terjadi kendala jaringan.' }));
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setToast(''), 4000);
    }
  };

  const handleMarkReady = async (id) => {
    setActionLoadingId(id);
    setItemErrors((prev) => ({ ...prev, [id]: '' }));
    try {
      const res = await apiRequest(`/api/pharmacy/prescriptions/${id}/ready`, {
        method: 'PATCH',
      });
      if (res && res.success) {
        setToast('Resep siap diambil! Stok obat otomatis terpotong.');
        await loadQueue();
      } else {
        // Stock error or validation error
        setItemErrors((prev) => ({
          ...prev,
          [id]: res?.error || 'Gagal menandai resep siap diambil. Periksa ketersediaan stok obat.',
        }));
      }
    } catch (err) {
      console.error('Error marking ready:', err);
      setItemErrors((prev) => ({ ...prev, [id]: 'Terjadi kendala saat validasi stok obat.' }));
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setToast(''), 4000);
    }
  };

  const handleMarkPickedUp = async (id) => {
    setActionLoadingId(id);
    setItemErrors((prev) => ({ ...prev, [id]: '' }));
    try {
      const res = await apiRequest(`/api/pharmacy/prescriptions/${id}/pickup`, {
        method: 'PATCH',
      });
      if (res && res.success) {
        setToast('Penyerahan obat ke pasien berhasil dikonfirmasi.');
        await loadQueue();
      } else {
        setItemErrors((prev) => ({ ...prev, [id]: res?.error || 'Gagal mengonfirmasi pengambilan.' }));
      }
    } catch (err) {
      console.error('Error marking picked up:', err);
      setItemErrors((prev) => ({ ...prev, [id]: 'Terjadi kendala jaringan.' }));
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setToast(''), 4000);
    }
  };

  const handleConfirmPayment = async (rx) => {
    setActionLoadingId(rx.id);
    setItemErrors((prev) => ({ ...prev, [rx.id]: '' }));
    try {
      const res = await apiRequest(`/api/admin/payments/${rx.id}/confirm`, {
        method: 'POST',
        body: {
          payment_method: rx.payment_method || 'CASH',
        },
      });
      if (res && res.success) {
        setToast(res.message || 'Pembayaran obat berhasil dikonfirmasi lunas.');
        await loadQueue();
      } else {
        setItemErrors((prev) => ({
          ...prev,
          [rx.id]: res?.error || 'Gagal mengonfirmasi pembayaran obat.',
        }));
      }
    } catch (err) {
      console.error('Error confirming payment:', err);
      setItemErrors((prev) => ({ ...prev, [rx.id]: 'Terjadi kendala jaringan.' }));
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setToast(''), 4000);
    }
  };

  // Filter items by active tab
  const filteredQueue = queue.filter((item) => item.status === activeTab);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans md:flex-row">
      <Sidebar role="ADMIN" userName="Administrator" userEmail="admin@medflow.com" />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-extrabold text-slate-900">
              Antrean Pelayanan Farmasi & Resep
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Alur dispensing obat: peracikan, pemotongan stok otomatis, dan konfirmasi penyerahan
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/payments"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition w-fit"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Portal Konfirmasi Pembayaran</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              type="button"
              onClick={loadQueue}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer w-fit"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Segarkan Antrean</span>
            </button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2.5 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{toast}</span>
          </div>
        )}

        {/* Status Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PHARMACY_TABS.map((tab) => {
            const count = queue.filter((q) => q.status === tab.id).length;
            const isActive = activeTab === tab.id;
            const TabIcon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center justify-between ${
                  isActive
                    ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-100 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <TabIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-heading font-bold text-xs sm:text-sm leading-tight">
                      {tab.label}
                    </p>
                    <span className={`text-[11px] ${isActive ? 'text-sky-100' : 'text-slate-400'}`}>
                      {count} Resep
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Prescription Cards Grid */}
        {loading ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-slate-100">
            <Loader2 className="w-8 h-8 text-sky-500 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Memuat antrean resep farmasi...</p>
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 border border-slate-100 shadow-sm text-center">
            <Pill className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-heading font-bold text-slate-800">
              Tidak Ada Resep Dalam Status Ini
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Resep baru akan otomatis muncul saat dokter menyelesaikan pemeriksaan medis.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredQueue.map((rx) => {
              const isLoading = actionLoadingId === rx.id;
              const errorMessage = itemErrors[rx.id];
              const items = rx.items || [];

              return (
                <div
                  key={rx.id}
                  className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4 hover:border-sky-200 transition flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Top: Patient + Status */}
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading font-bold text-base text-slate-900">
                            {rx.patient_name || 'Nama Pasien'}
                          </h3>
                          <span className="font-mono text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded">
                            {rx.medical_record_no}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>{formatDateIndo(rx.created_at)}</span>
                          {rx.doctor_name && (
                            <>
                              <span>•</span>
                              <span className="text-slate-600 font-medium">dr. {rx.doctor_name}</span>
                            </>
                          )}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge status={rx.status} size="sm" />
                        <StatusBadge
                          status={
                            rx.payment_status === 'REJECTED'
                              ? 'PAYMENT_REJECTED'
                              : rx.payment_status || 'UNPAID'
                          }
                          size="sm"
                        />
                      </div>
                    </div>

                    {/* Medicine List Table */}
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                        Item Obat & Rincian Biaya:
                      </span>
                      <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        {items.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">Rincian item obat sedang dikonfirmasi.</p>
                        ) : (
                          <>
                            {items.map((item, idx) => (
                              <div
                                key={idx}
                                className="text-xs flex items-center justify-between gap-2 text-slate-700"
                              >
                                <div className="min-w-0">
                                  <span className="font-semibold text-slate-900 block truncate">
                                    {item.medicine_name || item.name}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    {item.quantity} {item.unit || 'unit'} × {formatRupiah(item.unit_price)} • {item.dosage_rule}
                                  </span>
                                </div>
                                <span className="text-slate-900 font-mono font-semibold whitespace-nowrap">
                                  {formatRupiah(item.subtotal)}
                                </span>
                              </div>
                            ))}
                            <div className="pt-2 mt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-600">
                                Total Tagihan ({rx.invoice_number}):
                              </span>
                              <span className="font-heading font-extrabold text-sm text-sky-700">
                                {formatRupiah(rx.total_amount)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Payment Info Banner */}
                    {rx.payment_status === 'WAITING_CONFIRMATION' && (
                      <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs space-y-0.5">
                        <p className="font-bold">
                          Pasien Mengirim Pembayaran ({rx.payment_method})
                        </p>
                        <p className="text-indigo-700">
                          Pengirim: {rx.payer_name || rx.patient_name}
                          {rx.payment_reference ? ` • Ref: ${rx.payment_reference}` : ''}
                        </p>
                      </div>
                    )}

                    {/* Notes if any */}
                    {rx.notes && (
                      <p className="text-xs text-slate-500 italic bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                        Catatan: &ldquo;{rx.notes}&rdquo;
                      </p>
                    )}

                    {/* Error display if markReady failed (e.g. insufficient stock) */}
                    {errorMessage && (
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2 animate-fade-in">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Gagal Memproses Obat:</p>
                          <p className="text-red-700 mt-0.5">{errorMessage}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons based on status */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
                    {rx.payment_status !== 'PAID' && (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleConfirmPayment(rx)}
                        className="py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>
                              {rx.payment_status === 'WAITING_CONFIRMATION'
                                ? 'Konfirmasi Pembayaran'
                                : 'Konfirmasi Bayar Loket'}
                            </span>
                          </>
                        )}
                      </button>
                    )}

                    {rx.status === 'WAITING' && (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleStartProcessing(rx.id)}
                        className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            <span>Proses Resep</span>
                          </>
                        )}
                      </button>
                    )}

                    {rx.status === 'PROCESSING' && (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleMarkReady(rx.id)}
                        className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <PackageCheck className="w-4 h-4" />
                            <span>Tandai Siap & Potong Stok</span>
                          </>
                        )}
                      </button>
                    )}

                    {rx.status === 'READY' && (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleMarkPickedUp(rx.id)}
                        className="py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Konfirmasi Penyerahan ke Pasien</span>
                          </>
                        )}
                      </button>
                    )}

                    {rx.status === 'PICKED_UP' && (
                      <span className="text-xs font-semibold text-purple-700 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-purple-600" />
                        <span>Selesai Diserahkan</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
