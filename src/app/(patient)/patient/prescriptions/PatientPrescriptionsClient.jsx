'use client';

import { useState } from 'react';
import StatusBadge from '@/components/StatusBadge';
import MedicalRecordActions from '@/components/MedicalRecordActions';
import { apiRequest } from '@/lib/apiClient';
import { formatRupiah } from '@/lib/currency';
import {
  Pill,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  ShoppingBag,
  Info,
  CreditCard,
  Receipt,
  Clock,
  Loader2,
  X,
  Building2,
  QrCode,
  Banknote,
  ShieldCheck,
  BadgeCheck,
} from 'lucide-react';

function formatDateIndo(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateTimeIndo(dateStr) {
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

const PAYMENT_METHODS = [
  {
    id: 'TRANSFER',
    label: 'Transfer Bank',
    desc: 'Mandiri / BCA RS MedFlow',
    icon: Building2,
    needsRef: true,
    instruction:
      'Transfer ke Bank Mandiri 140-001-9283-441 atau BCA 542-091-8821 a.n. RS MedFlow HMIS, lalu masukkan nomor referensi transfer.',
  },
  {
    id: 'QRIS',
    label: 'QRIS MedFlow',
    desc: 'GoPay, OVO, DANA, Mobile Banking',
    icon: QrCode,
    needsRef: true,
    instruction:
      'Lakukan pembayaran ke QRIS RS MedFlow HMIS (NMID: ID1026001928371) dan masukkan ID/Referensi transaksi QRIS.',
  },
  {
    id: 'CASH',
    label: 'Tunai di Loket',
    desc: 'Bayar langsung di kasir farmasi',
    icon: Banknote,
    needsRef: false,
    instruction:
      'Ajukan pembayaran tunai dan tunjukkan nomor invoice Anda kepada petugas kasir/farmasi di Lantai 1 untuk dikonfirmasi.',
  },
  {
    id: 'BPJS',
    label: 'BPJS / Penjamin',
    desc: 'Verifikasi klaim peserta BPJS',
    icon: ShieldCheck,
    needsRef: false,
    instruction:
      'Masukkan nomor kartu BPJS / nomor SEP Anda (opsional) agar admin dapat memverifikasi penjaminan resep.',
  },
];

export default function PatientPrescriptionsClient({ initialPrescriptions = [] }) {
  const [prescriptions, setPrescriptions] = useState(initialPrescriptions);
  const [selectedRx, setSelectedRx] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('TRANSFER');
  const [payerName, setPayerName] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [toast, setToast] = useState('');

  const refreshPrescriptions = async () => {
    try {
      const res = await apiRequest('/api/patient/prescriptions');
      if (res?.success && Array.isArray(res.data)) {
        setPrescriptions(res.data);
      }
    } catch (err) {
      console.error('Failed to refresh prescriptions:', err);
    }
  };

  const openPaymentModal = (rx) => {
    setSelectedRx(rx);
    setPaymentMethod(rx.payment_method || 'TRANSFER');
    setPayerName(rx.payer_name || '');
    setPaymentReference(rx.payment_reference || '');
    setPaymentNotes(rx.payment_notes || '');
    setModalError('');
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    if (!selectedRx) return;

    const methodConfig = PAYMENT_METHODS.find((m) => m.id === paymentMethod);
    if (methodConfig?.needsRef && paymentReference.trim().length < 3) {
      setModalError('Nomor referensi / ID transaksi wajib diisi minimal 3 karakter.');
      return;
    }

    setSubmitting(true);
    setModalError('');

    try {
      const res = await apiRequest(`/api/patient/prescriptions/${selectedRx.id}/pay`, {
        method: 'POST',
        body: {
          payment_method: paymentMethod,
          payer_name: payerName.trim() || null,
          payment_reference: paymentReference.trim() || null,
          payment_notes: paymentNotes.trim() || null,
        },
      });

      if (res && res.success) {
        setToast(
          res.message ||
            'Konfirmasi pembayaran berhasil dikirim. Menunggu verifikasi admin.'
        );
        setSelectedRx(null);
        await refreshPrescriptions();
      } else {
        setModalError(res?.error || 'Gagal mengirim konfirmasi pembayaran.');
      }
    } catch (err) {
      console.error('Submit payment error:', err);
      setModalError('Terjadi kendala jaringan saat mengirim pembayaran.');
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast(''), 5000);
    }
  };

  const selectedMethodObj =
    PAYMENT_METHODS.find((m) => m.id === paymentMethod) || PAYMENT_METHODS[0];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-600 uppercase tracking-wider mb-1">
            <Pill className="w-4 h-4" />
            <span>Instalasi Farmasi</span>
          </div>
          <h1 className="text-2xl font-heading font-extrabold text-slate-900">
            Resep, Rincian Harga & Pembayaran Obat
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pantau peracikan obat, rincian harga satuan per item, dan lakukan pembayaran yang diverifikasi langsung oleh admin MedFlow.
          </p>
        </div>

        <span className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-100 text-purple-700 text-xs font-semibold w-fit">
          {prescriptions.length} Resep Tercatat
        </span>
      </div>

      {/* Toast */}
      {toast && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2.5 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Prescription List */}
      {prescriptions.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center mx-auto mb-3">
            <Pill className="w-8 h-8" />
          </div>
          <h3 className="text-base font-heading font-bold text-slate-800 mb-1">
            Belum Ada Resep Obat
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Resep obat digital beserta rincian biaya akan muncul secara otomatis di halaman ini setelah dokter selesai meresepkannya pada sesi konsultasi Anda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {prescriptions.map((rx) => {
            const items = rx.items || [];
            const isReady = rx.status === 'READY';
            const isPickedUp = rx.status === 'PICKED_UP';
            const isCancelled = rx.status === 'CANCELLED';

            const paymentStatus = rx.payment_status || 'UNPAID';
            const paymentBadgeKey =
              paymentStatus === 'REJECTED' ? 'PAYMENT_REJECTED' : paymentStatus;
            const totalAmount = Number(rx.total_amount) || 0;
            const canPay =
              !isCancelled &&
              (paymentStatus === 'UNPAID' || paymentStatus === 'REJECTED');

            return (
              <div
                key={rx.id}
                className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Top: Prescription ID, Date & Status */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md">
                          #{rx.id?.substring(0, 8).toUpperCase() || 'RSP'}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatDateIndo(rx.created_at)}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 mt-1.5 flex items-center gap-1.5">
                        <Stethoscope className="w-3.5 h-3.5 text-sky-600" />
                        <span>{rx.doctor_name || 'dr. Spesialis Pemeriksa'}</span>
                        {rx.poli_name && (
                          <span className="text-slate-400 font-normal">• {rx.poli_name}</span>
                        )}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <StatusBadge status={rx.status} size="sm" />
                      {!isCancelled && <StatusBadge status={paymentBadgeKey} size="sm" />}
                    </div>
                  </div>

                  {/* Special Status Notices */}
                  {isReady && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      <div>
                        <p className="font-bold">Obat Anda Siap Diambil!</p>
                        <p className="text-emerald-700 mt-0.5">
                          {paymentStatus === 'PAID'
                            ? 'Pembayaran telah lunas. Silakan menuju loket Apotek MedFlow (Lantai 1) untuk pengambilan obat.'
                            : 'Silakan selesaikan & tunggu konfirmasi pembayaran terlebih dahulu sebelum mengambil obat di loket Apotek MedFlow.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {isPickedUp && (
                    <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-purple-600 flex-shrink-0" />
                      <span>
                        Telah diambil pada{' '}
                        <strong className="font-semibold">
                          {formatDateTimeIndo(rx.picked_up_at || rx.updated_at)}
                        </strong>
                      </span>
                    </div>
                  )}

                  {isCancelled && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <span>Resep ini telah dibatalkan oleh pihak instalasi farmasi.</span>
                    </div>
                  )}

                  {/* Medicine Items & Pricing Table */}
                  <div>
                    <h2 className="text-[11px] font-heading font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Pill className="w-3.5 h-3.5 text-purple-500" />
                      <span>Rincian Obat, Harga & Aturan Pakai</span>
                    </h2>

                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-100">
                          <tr>
                            <th className="py-2.5 px-3">Nama Obat & Aturan</th>
                            <th className="py-2.5 px-2 text-center">Jumlah</th>
                            <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                            <th className="py-2.5 px-3 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {items.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-4 text-center text-slate-400">
                                Rincian item obat sedang dikonfirmasi.
                              </td>
                            </tr>
                          ) : (
                            items.map((it, idx) => (
                              <tr key={it.id || idx} className="hover:bg-slate-50/50">
                                <td className="py-2.5 px-3">
                                  <span className="font-semibold text-slate-800 block">
                                    {it.medicine_name || it.name || 'Obat Generik'}
                                  </span>
                                  <span className="block text-[11px] text-slate-500 mt-0.5">
                                    {it.dosage_rule || '1x sehari sesudah makan'}
                                    {it.duration_days ? ` • ${it.duration_days} hari` : ''}
                                  </span>
                                  {it.dosage_form && (
                                    <span className="block text-[10px] text-slate-400">
                                      Sediaan: {it.dosage_form}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-2 text-center font-bold text-slate-900 whitespace-nowrap">
                                  {it.quantity} {it.unit || 'tab'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                                  {formatRupiah(it.unit_price)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                                  {formatRupiah(it.subtotal)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Billing Summary & Payment Box */}
                  {!isCancelled && (
                    <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-sky-700 tracking-wider flex items-center gap-1">
                            <Receipt className="w-3.5 h-3.5" />
                            <span>Rincian Tagihan Obat</span>
                          </span>
                          <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                            No. Invoice: {rx.invoice_number}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 block">Total Biaya Obat</span>
                          <span className="text-lg font-heading font-extrabold text-sky-800">
                            {formatRupiah(totalAmount)}
                          </span>
                        </div>
                      </div>

                      {paymentStatus === 'WAITING_CONFIRMATION' && (
                        <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-start gap-2">
                          <Clock className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">Menunggu Konfirmasi Admin</p>
                            <p className="text-indigo-700 mt-0.5">
                              Metode: <strong>{rx.payment_method}</strong>
                              {rx.payment_reference ? ` • Ref: ${rx.payment_reference}` : ''}
                              {rx.paid_at ? ` • Dikirim ${formatDateTimeIndo(rx.paid_at)}` : ''}
                            </p>
                          </div>
                        </div>
                      )}

                      {paymentStatus === 'PAID' && (
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2">
                          <BadgeCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">Pembayaran Dikonfirmasi Lunas</p>
                            <p className="text-emerald-700 mt-0.5">
                              Metode: <strong>{rx.payment_method || 'CASH'}</strong>
                              {rx.confirmed_at
                                ? ` • Dikonfirmasi ${formatDateTimeIndo(rx.confirmed_at)}`
                                : ''}
                            </p>
                          </div>
                        </div>
                      )}

                      {paymentStatus === 'REJECTED' && (
                        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">Pembayaran Ditolak oleh Admin</p>
                            <p className="text-red-700 mt-0.5">
                              Alasan: {rx.payment_rejection_reason || 'Data pembayaran tidak valid.'}
                            </p>
                          </div>
                        </div>
                      )}

                      {canPay && (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => openPaymentModal(rx)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
                          >
                            <CreditCard className="w-4 h-4" />
                            <span>
                              {paymentStatus === 'REJECTED'
                                ? 'Kirim Ulang Pembayaran'
                                : 'Bayar Sekarang'}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Notes / Special Instructions */}
                {rx.notes && (
                  <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-600 flex items-start gap-2 border border-slate-100">
                    <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                    <p>
                      <strong className="font-semibold text-slate-700">Catatan Apoteker: </strong>
                      {rx.notes}
                    </p>
                  </div>
                )}

                {rx.medical_record_id && (
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-slate-500">
                      Dokumen Bukti Konsultasi & Resep:
                    </span>
                    <MedicalRecordActions recordId={rx.medical_record_id} size="xs" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Modal */}
      {selectedRx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handlePaySubmit}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-heading font-bold text-base text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-sky-600" />
                  <span>Pembayaran Resep Obat</span>
                </h3>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                  {selectedRx.invoice_number} • Resep #{selectedRx.id?.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRx(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Price Summary inside Modal */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="space-y-1">
                {(selectedRx.items || []).map((it, i) => (
                  <div key={i} className="flex justify-between text-slate-700">
                    <span>
                      {it.medicine_name} ({it.quantity} {it.unit})
                    </span>
                    <span className="font-mono font-semibold">
                      {formatRupiah(it.subtotal)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-800">Total yang Harus Dibayar</span>
                <span className="text-base font-heading font-extrabold text-sky-700">
                  {formatRupiah(selectedRx.total_amount)}
                </span>
              </div>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Payment Method Grid */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                Pilih Metode Pembayaran *
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  const active = paymentMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        active
                          ? 'bg-sky-50 border-sky-500 ring-1 ring-sky-500'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon
                          className={`w-4 h-4 ${
                            active ? 'text-sky-600' : 'text-slate-500'
                          }`}
                        />
                        <span className="text-xs font-bold text-slate-900">
                          {method.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">{method.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payment Instruction */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
              {selectedMethodObj.instruction}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Nama Pengirim / Pembayar
              </label>
              <input
                type="text"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                placeholder="Nama lengkap sesuai rekening / pembayar"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Nomor Referensi / Bukti Transaksi{' '}
                {selectedMethodObj.needsRef ? '*' : '(Opsional)'}
              </label>
              <input
                type="text"
                required={selectedMethodObj.needsRef}
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder={
                  paymentMethod === 'TRANSFER'
                    ? 'Contoh: TRF-20261124-99812'
                    : paymentMethod === 'QRIS'
                    ? 'Contoh: QRIS-882910384'
                    : paymentMethod === 'BPJS'
                    ? 'Nomor Kartu BPJS / SEP (opsional)'
                    : 'Catatan kasir (opsional)'
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Catatan Tambahan (Opsional)
              </label>
              <textarea
                rows={2}
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Contoh: Transfer dari Bank BCA pukul 14:30..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setSelectedRx(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Kirim Konfirmasi Pembayaran'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
