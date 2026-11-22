'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import StatusBadge from '@/components/StatusBadge';
import { apiRequest } from '@/lib/apiClient';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Users,
  X,
} from 'lucide-react';

function formatDate(value) {
  if (!value) return '-';
  const date =
    value instanceof Date
      ? value
      : new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime())
    ? '-'
    : new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(date);
}

function formatTime(value) {
  return typeof value === 'string' ? value.slice(0, 5) : '-';
}

export default function AdminAppointmentsClient({ initialAppointments = [], loadError = '' }) {
  const router = useRouter();
  const [overrides, setOverrides] = useState({});
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [toast, setToast] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Reject Modal
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const appointments = initialAppointments.map((item) =>
    overrides[item.id] ? { ...item, ...overrides[item.id] } : item
  );

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const handleApprove = async (appt) => {
    setActionLoadingId(appt.id);
    setErrorMessage('');
    try {
      const res = await apiRequest(`/api/admin/appointments/${appt.id}`, {
        method: 'PATCH',
        body: { status: 'APPROVED' },
      });
      if (res?.success && res.data) {
        setOverrides((prev) => ({
          ...prev,
          [appt.id]: {
            status: res.data.status,
            queue_no: res.data.queue_no,
            rejection_reason: null,
          },
        }));
        showToast(
          `Janji temu ${appt.patient_name} berhasil diubah menjadi Approved (Antrean #${res.data.queue_no}).`
        );
        router.refresh();
      } else {
        setErrorMessage(res?.error || 'Gagal menyetujui janji temu.');
      }
    } catch {
      setErrorMessage('Terjadi kendala jaringan saat menyetujui janji temu.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const openRejectModal = (appt) => {
    setRejectTarget(appt);
    setRejectReason(appt.rejection_reason || '');
    setErrorMessage('');
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectTarget || !rejectReason.trim()) return;

    setRejecting(true);
    setErrorMessage('');
    try {
      const res = await apiRequest(`/api/admin/appointments/${rejectTarget.id}`, {
        method: 'PATCH',
        body: { status: 'REJECTED', reason: rejectReason.trim() },
      });
      if (res?.success && res.data) {
        setOverrides((prev) => ({
          ...prev,
          [rejectTarget.id]: {
            status: 'REJECTED',
            queue_no: null,
            rejection_reason: res.data.rejection_reason,
          },
        }));
        showToast(`Janji temu ${rejectTarget.patient_name} diubah menjadi Rejected.`);
        setRejectTarget(null);
        setRejectReason('');
        router.refresh();
      } else {
        setErrorMessage(res?.error || 'Gagal menolak janji temu.');
      }
    } catch {
      setErrorMessage('Terjadi kendala jaringan saat menolak janji temu.');
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="space-y-4">
      {toast && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs sm:text-sm text-emerald-800 flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {errorMessage && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs sm:text-sm text-red-700 flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-heading font-bold text-slate-800">Daftar Janji Temu</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {appointments.length} data
          </span>
        </div>

        {appointments.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <Users className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">
              {loadError ? 'Data belum tersedia' : 'Tidak ada janji temu'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Coba ubah filter atau periksa kembali nanti.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Pasien</th>
                  <th className="px-5 py-3 font-semibold">Dokter / Poli</th>
                  <th className="px-5 py-3 font-semibold">Jadwal</th>
                  <th className="px-5 py-3 font-semibold">Antrean</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Keluhan</th>
                  <th className="px-5 py-3 font-semibold text-right">Aksi Validasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map((appointment) => {
                  const isLoading = actionLoadingId === appointment.id;
                  const canApprove =
                    appointment.status === 'PENDING' || appointment.status === 'REJECTED';
                  const canReject =
                    appointment.status === 'PENDING' || appointment.status === 'CONFIRMED';

                  return (
                    <tr key={appointment.id} className="align-top hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800">{appointment.patient_name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          RM {appointment.medical_record_no}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-700">{appointment.doctor_name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{appointment.poli_name}</p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {formatDate(appointment.appointment_date)}
                        <span className="ml-2 text-xs text-slate-400">
                          {formatTime(appointment.slot_start)}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-600">
                        {appointment.queue_no ? `#${appointment.queue_no}` : '-'}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={appointment.status} size="sm" />
                        {appointment.rejection_reason && (
                          <p className="mt-1.5 max-w-48 text-xs text-red-600">
                            Alasan: {appointment.rejection_reason}
                          </p>
                        )}
                      </td>
                      <td className="max-w-52 px-5 py-4 text-xs leading-relaxed text-slate-600">
                        {appointment.complaint || '-'}
                      </td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        {canApprove || canReject ? (
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {canApprove && (
                              <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => handleApprove(appointment)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                              >
                                {isLoading ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                )}
                                <span>Approved</span>
                              </button>
                            )}
                            {canReject && (
                              <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => openRejectModal(appointment)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                <span>Rejected</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Terkunci</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Reject Reason Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleRejectSubmit}
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-heading font-bold text-sm text-slate-900">
                Ubah Status ke Rejected
              </h3>
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-0.5">
              <p className="font-bold text-slate-900">{rejectTarget.patient_name}</p>
              <p className="text-slate-500">
                {rejectTarget.doctor_name} • {formatDate(rejectTarget.appointment_date)} {formatTime(rejectTarget.slot_start)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Alasan Penolakan *
              </label>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Contoh: Jadwal dokter dialihkan / kuota poli penuh..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                disabled={rejecting}
                onClick={() => setRejectTarget(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={rejecting || !rejectReason.trim()}
                className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {rejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Rejected'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
