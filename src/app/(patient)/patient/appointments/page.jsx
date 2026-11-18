'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiRequest } from '@/lib/apiClient';
import StatusBadge from '@/components/StatusBadge';
import {
  Calendar,
  CalendarPlus,
  Clock,
  Star,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ClipboardList,
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

const TABS = [
  { id: 'ALL', label: 'Semua' },
  { id: 'PENDING', label: 'Menunggu' },
  { id: 'CONFIRMED', label: 'Dikonfirmasi' },
  { id: 'COMPLETED', label: 'Selesai' },
  { id: 'CANCELLED_REJECTED', label: 'Dibatalkan/Ditolak' },
];

function PatientAppointmentsContent() {
  const searchParams = useSearchParams();
  const isJustBooked = searchParams.get('booked') === 'true';

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');

  // Cancel Modal State
  const [cancelModalId, setCancelModalId] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // Feedback Modal State
  const [feedbackAppt, setFeedbackAppt] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Action status messages
  const [toastMessage, setToastMessage] = useState(
    isJustBooked ? 'Janji temu berhasil diajukan! Menunggu konfirmasi dari dokter.' : ''
  );
  const [errorMessage, setErrorMessage] = useState('');

  const refreshAppointments = async () => {
    try {
      const res = await apiRequest('/api/patient/appointments');
      if (res?.success && Array.isArray(res.data)) {
        setAppointments(res.data);
      } else {
        setAppointments([]);
        if (res?.error) setErrorMessage(res.error);
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setAppointments([]);
      setErrorMessage('Gagal memuat daftar janji temu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const res = await apiRequest('/api/patient/appointments');
        if (cancelled) return;
        if (res?.success && Array.isArray(res.data)) {
          setAppointments(res.data);
        } else {
          setAppointments([]);
          if (res?.error) setErrorMessage(res.error);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching appointments:', err);
          setAppointments([]);
          setErrorMessage('Gagal memuat daftar janji temu.');
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

  const filteredAppointments = appointments.filter((appt) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'PENDING') return appt.status === 'PENDING';
    if (activeTab === 'CONFIRMED') return appt.status === 'CONFIRMED';
    if (activeTab === 'COMPLETED') return appt.status === 'COMPLETED';
    if (activeTab === 'CANCELLED_REJECTED') {
      return appt.status === 'CANCELLED' || appt.status === 'REJECTED' || appt.status === 'NO_SHOW';
    }
    return true;
  });

  const handleConfirmCancel = async () => {
    if (!cancelModalId) return;
    setCancelling(true);
    setErrorMessage('');
    try {
      const res = await apiRequest(`/api/patient/appointments/${cancelModalId}/cancel`, {
        method: 'PATCH',
      });
      if (res && res.success) {
        setToastMessage('Janji temu berhasil dibatalkan.');
        await refreshAppointments();
      } else {
        setErrorMessage(res?.error || 'Gagal membatalkan janji temu.');
      }
    } catch (err) {
      console.error('Cancel error:', err);
      setErrorMessage('Terjadi kesalahan saat membatalkan janji.');
    } finally {
      setCancelling(false);
      setCancelModalId(null);
      setTimeout(() => setToastMessage(''), 4000);
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackAppt) return;
    setSubmittingFeedback(true);
    setErrorMessage('');
    try {
      const formData = new FormData();
      formData.append('appointment_id', feedbackAppt.id);
      formData.append('rating', String(rating));
      formData.append('comment', comment.trim());

      const res = await apiRequest(`/api/patient/appointments/${feedbackAppt.id}/feedback`, {
        method: 'POST',
        body: formData,
      });
      if (res && res.success) {
        setToastMessage('Terima kasih atas ulasan dan rating yang Anda berikan!');
        await refreshAppointments();
        setFeedbackAppt(null);
        setComment('');
        setRating(5);
      } else {
        setErrorMessage(res?.error || 'Gagal mengirimkan ulasan.');
      }
    } catch (err) {
      console.error('Feedback error:', err);
      setErrorMessage('Terjadi kesalahan saat menyimpan ulasan.');
    } finally {
      setSubmittingFeedback(false);
      setTimeout(() => setToastMessage(''), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-600 uppercase tracking-wider mb-1">
            <ClipboardList className="w-4 h-4" />
            <span>Jadwal Konsultasi</span>
          </div>
          <h1 className="text-2xl font-heading font-extrabold text-slate-900">
            Daftar Janji Temu Saya
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola jadwal konsultasi dokter, nomor antrean aktif, ulasan pelayanan, dan pembatalan.
          </p>
        </div>

        <Link href="/patient/booking" className="btn-primary text-xs w-fit">
          <CalendarPlus className="w-4 h-4" />
          <span>Buat Janji Baru</span>
        </Link>
      </div>

      {/* Toast & Error Alerts */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div role="alert" className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Status Tabs Row */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap items-center gap-2">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Appointments List */}
      {loading ? (
        <div className="bg-white rounded-2xl p-16 border border-slate-100 shadow-sm text-center">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Memuat riwayat janji temu...</p>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-100 shadow-sm text-center">
          <div className="w-14 h-14 rounded-full bg-sky-50 text-sky-500 flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-7 h-7" />
          </div>
          <h3 className="text-base font-heading font-bold text-slate-800 mb-1">
            Tidak Ada Jadwal Janji Temu
          </h3>
          <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
            Tidak ada data janji temu untuk kategori tab yang dipilih.
          </p>
          <Link href="/patient/booking" className="btn-primary text-xs">
            <CalendarPlus className="w-4 h-4" />
            <span>Booking Konsultasi</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredAppointments.map((appt) => {
            const canCancel = appt.status === 'PENDING' || appt.status === 'CONFIRMED';
            const hasFeedback = Boolean(appt.feedback_id || appt.has_feedback);
            const canFeedback = appt.status === 'COMPLETED' && !hasFeedback;

            return (
              <div
                key={appt.id}
                className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4 hover:border-sky-200 transition flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Top: Poli & Status Badge */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg">
                      {appt.poli_name || 'Poliklinik'}
                    </span>
                    <StatusBadge status={appt.status} size="sm" />
                  </div>

                  {/* Doctor & Appointment Details */}
                  <div className="space-y-2">
                    <h2 className="font-heading font-bold text-base text-slate-900">
                      {appt.doctor_name || 'dr. Spesialis'}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-sky-500" />
                        {formatDateIndo(appt.appointment_date)}
                      </span>
                      <span className="flex items-center gap-1.5 font-medium">
                        <Clock className="w-3.5 h-3.5 text-sky-500" />
                        {appt.slot_start?.substring(0, 5)} WIB
                      </span>
                    </div>

                    {appt.status === 'CONFIRMED' && (
                      <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
                        <span>Nomor Antrean Anda:</span>
                        <span className="text-base text-amber-600 font-heading">
                          #{appt.queue_no || '-'}
                        </span>
                      </div>
                    )}

                    {appt.complaint && (
                      <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                        &ldquo;{appt.complaint}&rdquo;
                      </p>
                    )}

                    {appt.status === 'REJECTED' && appt.rejection_reason && (
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
                        <span className="font-bold">Alasan Penolakan: </span>
                        {appt.rejection_reason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                  {canCancel && (
                    <button
                      type="button"
                      onClick={() => setCancelModalId(appt.id)}
                      className="py-1.5 px-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition cursor-pointer"
                    >
                      Batalkan Janji
                    </button>
                  )}

                  {canFeedback && (
                    <button
                      type="button"
                      onClick={() => {
                        setFeedbackAppt(appt);
                        setRating(5);
                        setComment('');
                      }}
                      className="py-1.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-900 text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>Beri Ulasan</span>
                    </button>
                  )}

                  {hasFeedback && (
                    <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      Sudah diulas ({appt.feedback_rating || 5}/5)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CANCEL CONFIRMATION MODAL */}
      {cancelModalId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="font-heading font-bold text-base text-slate-900">
                Konfirmasi Pembatalan
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin membatalkan jadwal konsultasi ini? Nomor antrean yang telah didapatkan akan dilepaskan.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                disabled={cancelling}
                onClick={() => setCancelModalId(null)}
                className="btn-outline text-xs py-2.5"
              >
                Tidak, Tetap Jadwalkan
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleConfirmCancel}
                className="btn-danger text-xs py-2.5"
              >
                {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ya, Batalkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FEEDBACK MODAL */}
      {feedbackAppt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitFeedback}
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-heading font-bold text-sm text-slate-900">
                Beri Ulasan Pelayanan Dokter
              </h3>
              <button
                type="button"
                onClick={() => setFeedbackAppt(null)}
                className="text-slate-400 hover:text-slate-600 text-base leading-none p-1"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              Bagaimana pengalaman konsultasi Anda bersama{' '}
              <span className="font-bold text-slate-800">{feedbackAppt.doctor_name}</span>?
            </p>

            {/* 5-Star Rating Selector */}
            <div className="flex items-center justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  className="p-1 hover:scale-110 transition-transform cursor-pointer"
                >
                  <Star
                    className={`w-7 h-7 ${
                      s <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Komentar / Masukan (Opsional)
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ceritakan kepuasan dan keramahan pelayanan dokter..."
                className="input-field resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                disabled={submittingFeedback}
                onClick={() => setFeedbackAppt(null)}
                className="btn-outline text-xs py-2.5"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submittingFeedback}
                className="btn-primary text-xs py-2.5"
              >
                {submittingFeedback ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Kirim Ulasan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function PatientAppointmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Memuat daftar janji temu...</p>
        </div>
      }
    >
      <PatientAppointmentsContent />
    </Suspense>
  );
}
