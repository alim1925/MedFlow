'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/apiClient';
import StatusBadge from '@/components/StatusBadge';
import {
  CheckCircle2,
  Clock,
  Users,
  ArrowRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';

function formatDateIndo(dateVal) {
  if (!dateVal) return '-';
  try {
    const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
    if (Number.isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return String(dateVal);
  }
}

export default function DoctorDashboardClient({ initialPending = [], initialToday = [] }) {
  const router = useRouter();

  const [removedIds, setRemovedIds] = useState([]);
  const [confirmedMap, setConfirmedMap] = useState({});
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [actionError, setActionError] = useState('');

  // Reject Modal
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const pendingList = initialPending.filter((item) => !removedIds.includes(item.id));
  const todayList = initialToday
    .filter((item) => !removedIds.includes(item.id) || confirmedMap[item.id])
    .map((item) => (confirmedMap[item.id] ? { ...item, ...confirmedMap[item.id] } : item));

  // Handle Confirm
  const handleConfirm = async (id) => {
    setActionLoadingId(id);
    setActionError('');
    try {
      const res = await apiRequest(`/api/doctor/appointments/${id}/confirm`, {
        method: 'PATCH',
      });
      if (res && res.success) {
        setRemovedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
        setConfirmedMap((prev) => ({
          ...prev,
          [id]: {
            status: 'CONFIRMED',
            queue_no: res.data?.queue_no || prev[id]?.queue_no,
          },
        }));
        router.refresh();
      } else {
        setActionError(res?.error || 'Gagal mengonfirmasi janji temu.');
      }
    } catch (err) {
      console.error('Confirm error:', err);
      setActionError('Terjadi kesalahan saat mengonfirmasi janji.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Reject Submit
  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) return;

    setRejecting(true);
    setActionError('');
    try {
      const res = await apiRequest(`/api/doctor/appointments/${rejectId}/reject`, {
        method: 'PATCH',
        body: { reason: rejectReason.trim() },
      });
      if (res && res.success) {
        const rejectedId = rejectId;
        setRemovedIds((prev) => (prev.includes(rejectedId) ? prev : [...prev, rejectedId]));
        setRejectId(null);
        setRejectReason('');
        router.refresh();
      } else {
        setActionError(res?.error || 'Gagal menolak janji temu.');
      }
    } catch (err) {
      console.error('Reject error:', err);
      setActionError('Terjadi kesalahan saat menolak janji.');
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {actionError && (
        <div role="alert" className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Column 1: Today's Patient Queue */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-heading font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-600" />
              <span>Antrean Pemeriksaan Hari Ini</span>
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-700">
              {todayList.filter((a) => a.status === 'CONFIRMED').length} Pasien
            </span>
          </div>

          {todayList.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm text-center">
              <p className="text-xs text-slate-400">
                Belum ada antrean pasien untuk jadwal praktik hari ini.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayList.map((appt) => {
                const isConfirmed = appt.status === 'CONFIRMED';
                return (
                  <div
                    key={appt.id}
                    className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between gap-4 hover:border-sky-200 transition"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Queue Number Badge */}
                      <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-100 text-sky-700 flex flex-col items-center justify-center font-heading font-extrabold flex-shrink-0">
                        <span className="text-[9px] uppercase tracking-tighter text-sky-400 font-semibold leading-none">
                          No.
                        </span>
                        <span className="text-base leading-none mt-0.5">
                          {appt.queue_no || '-'}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading font-bold text-sm text-slate-900 truncate">
                            {appt.patient_name || 'Nama Pasien'}
                          </h3>
                          <StatusBadge status={appt.status} size="sm" />
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>Pukul {String(appt.slot_start || '').slice(0, 5)} WIB</span>
                          {appt.medical_record_no && (
                            <span className="font-mono text-[11px] text-slate-400">
                              • RM: {appt.medical_record_no}
                            </span>
                          )}
                        </p>
                        {appt.complaint && (
                          <p className="text-[11px] text-slate-500 italic truncate mt-1">
                            &ldquo;{appt.complaint}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Exam CTA */}
                    <div className="flex-shrink-0">
                      <Link
                        href={`/doctor/exam/${appt.id}`}
                        className={`inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl font-semibold text-xs shadow-sm transition ${
                          isConfirmed
                            ? 'bg-sky-500 hover:bg-sky-600 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <span>Periksa</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Column 2: Pending Requests Validation */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-heading font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <span>Permohonan Menunggu Validasi</span>
            </h2>
            <Link
              href="/doctor/appointments"
              className="text-xs font-semibold text-sky-600 hover:text-sky-700"
            >
              Lihat Semua
            </Link>
          </div>

          {pendingList.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm text-center">
              <p className="text-xs text-slate-400">
                Tidak ada permohonan janji temu baru yang menunggu persetujuan.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingList.map((item) => {
                const isLoading = actionLoadingId === item.id;
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-heading font-bold text-sm text-slate-900">
                          {item.patient_name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatDateIndo(item.appointment_date)} • {String(item.slot_start || '').slice(0, 5)} WIB
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        Menunggu
                      </span>
                    </div>

                    {item.complaint && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                        Keluhan: &ldquo;{item.complaint}&rdquo;
                      </p>
                    )}

                    {/* Actions: Accept or Reject */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => setRejectId(item.id)}
                        className="py-1.5 px-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition cursor-pointer"
                      >
                        Tolak
                      </button>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleConfirm(item.id)}
                        className="py-1.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                      >
                        {isLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Terima & Beri Antrean</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Reject Modal */}
        {rejectId && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <form
              onSubmit={handleRejectSubmit}
              className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl animate-scale-up space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-heading font-bold text-sm text-slate-900">
                  Alasan Penolakan Janji Temu
                </h3>
                <button
                  type="button"
                  onClick={() => setRejectId(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm"
                >
                  &times;
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Sampaikan alasan medis atau jadwal kepada pasien (alasan akan dikirimkan sebagai notifikasi).
              </p>

              <div>
                <textarea
                  rows={3}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Contoh: Dokter berhalangan hadir karena tindakan darurat..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  disabled={rejecting}
                  onClick={() => setRejectId(null)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={rejecting || !rejectReason.trim()}
                  className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {rejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tolak Janji'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
