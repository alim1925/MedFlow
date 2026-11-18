'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import StatusBadge from '@/components/StatusBadge';
import { apiRequest } from '@/lib/apiClient';
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  ArrowRight,
  Stethoscope,
  X,
  FileText
} from 'lucide-react';

function calculateAge(birthDateStr) {
  if (!birthDateStr) return '-';
  const birthDate = new Date(birthDateStr);
  if (Number.isNaN(birthDate.getTime())) return '-';
  const diff = Date.now() - birthDate.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970) + ' th';
}

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

export default function DoctorAppointmentsPage() {
  const [activeTab, setActiveTab] = useState('PENDING'); // PENDING | CONFIRMED
  const [pendingList, setPendingList] = useState([]);
  const [confirmedToday, setConfirmedToday] = useState([]);
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);

  // Reject Modal
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Toast & error
  const [toast, setToast] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const refreshData = async () => {
    try {
      const [pendingRes, todayRes, docRes] = await Promise.all([
        apiRequest('/api/doctor/appointments/pending'),
        apiRequest('/api/doctor/appointments/today'),
        apiRequest('/api/doctor/profile'),
      ]);

      if (pendingRes?.success && Array.isArray(pendingRes.data)) {
        setPendingList(pendingRes.data);
      } else if (pendingRes?.error) {
        setErrorMessage(pendingRes.error);
      }
      if (todayRes?.success && Array.isArray(todayRes.data)) {
        setConfirmedToday(todayRes.data.filter((a) => a.status === 'CONFIRMED'));
      } else if (todayRes?.error) {
        setErrorMessage(todayRes.error);
      }
      if (docRes?.success && docRes.data) setDoctor(docRes.data);
    } catch (err) {
      console.error('Error loading doctor appointments:', err);
      setErrorMessage('Gagal memuat data janji temu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const [pendingRes, todayRes, docRes] = await Promise.all([
          apiRequest('/api/doctor/appointments/pending'),
          apiRequest('/api/doctor/appointments/today'),
          apiRequest('/api/doctor/profile'),
        ]);
        if (cancelled) return;
        if (pendingRes?.success && Array.isArray(pendingRes.data)) {
          setPendingList(pendingRes.data);
        } else if (pendingRes?.error) {
          setErrorMessage(pendingRes.error);
        }
        if (todayRes?.success && Array.isArray(todayRes.data)) {
          setConfirmedToday(todayRes.data.filter((a) => a.status === 'CONFIRMED'));
        } else if (todayRes?.error) {
          setErrorMessage(todayRes.error);
        }
        if (docRes?.success && docRes.data) setDoctor(docRes.data);
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading doctor appointments:', err);
          setErrorMessage('Gagal memuat data janji temu.');
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

  const handleConfirm = async (id) => {
    setActionLoadingId(id);
    setErrorMessage('');
    try {
      const res = await apiRequest(`/api/doctor/appointments/${id}/confirm`, {
        method: 'PATCH',
      });
      if (res && res.success) {
        setToast('Janji temu berhasil diterima dan nomor antrean telah diterbitkan.');
        await refreshData();
      } else {
        setErrorMessage(res?.error || 'Gagal mengonfirmasi janji.');
      }
    } catch (err) {
      console.error('Confirm error:', err);
      setErrorMessage('Terjadi kesalahan saat mengonfirmasi janji temu.');
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setToast(''), 4000);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) return;

    setRejecting(true);
    setErrorMessage('');
    try {
      const res = await apiRequest(`/api/doctor/appointments/${rejectId}/reject`, {
        method: 'PATCH',
        body: { reason: rejectReason.trim() },
      });
      if (res && res.success) {
        setToast('Permohonan janji temu berhasil ditolak.');
        setRejectId(null);
        setRejectReason('');
        await refreshData();
      } else {
        setErrorMessage(res?.error || 'Gagal menolak janji.');
      }
    } catch (err) {
      console.error('Reject error:', err);
      setErrorMessage('Terjadi kesalahan saat memproses penolakan.');
    } finally {
      setRejecting(false);
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
        <div className="mb-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-extrabold text-slate-900">
              Validasi & Kelola Janji Temu
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Verifikasi permohonan booking pasien baru dan tinjau antrean periksa hari ini
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('PENDING')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'PENDING'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Menunggu Validasi ({pendingList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('CONFIRMED')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'CONFIRMED'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Jadwal Hari Ini ({confirmedToday.length})
            </button>
          </div>
        </div>

        {/* Toast & Error */}
        {toast && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2.5 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{toast}</span>
          </div>
        )}
        {errorMessage && (
          <div role="alert" className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-center gap-2.5 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab 1: PENDING APPOINTMENTS */}
        {activeTab === 'PENDING' && (
          <div className="space-y-4">
            {loading ? (
              <div className="py-16 text-center">
                <Loader2 className="w-7 h-7 text-sky-500 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500">Memuat permohonan janji temu...</p>
              </div>
            ) : pendingList.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 border border-slate-100 shadow-sm text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-heading font-bold text-slate-800">
                  Semua Permohonan Telah Divalidasi
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Tidak ada permohonan janji temu pasien baru yang berstatus PENDING.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingList.map((item) => {
                  const isLoading = actionLoadingId === item.id;
                  const age = calculateAge(item.birth_date);

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4 hover:border-amber-200 transition"
                    >
                      {/* Patient Info */}
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="min-w-0">
                          <h3 className="font-heading font-bold text-base text-slate-900 truncate">
                            {item.patient_name || item.full_name}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <span className="font-mono text-sky-700 font-semibold">
                              {item.medical_record_no || 'MR-PATIENT'}
                            </span>
                            <span>•</span>
                            <span>{age}</span>
                            {item.gender && (
                              <>
                                <span>•</span>
                                <span>{item.gender === 'L' || item.gender === 'M' ? 'Laki-laki' : 'Perempuan'}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex-shrink-0">
                          Menunggu Validasi
                        </span>
                      </div>

                      {/* Schedule & Complaint */}
                      <div className="space-y-2 text-xs text-slate-700">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 font-semibold text-slate-800">
                            <Calendar className="w-3.5 h-3.5 text-sky-500" />
                            {formatDateIndo(item.appointment_date)}
                          </span>
                          <span className="flex items-center gap-1 font-semibold text-slate-800">
                            <Clock className="w-3.5 h-3.5 text-sky-500" />
                            {item.slot_start?.substring(0, 5)} WIB
                          </span>
                        </div>

                        {item.complaint && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                              Keluhan Pasien:
                            </span>
                            <p className="italic text-slate-700 leading-relaxed">
                              &ldquo;{item.complaint}&rdquo;
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => setRejectId(item.id)}
                          className="py-2 px-3.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Tolak</span>
                        </button>

                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleConfirm(item.id)}
                          className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Terima & Beri Nomor Antrean</span>
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
        )}

        {/* Tab 2: CONFIRMED TODAY */}
        {activeTab === 'CONFIRMED' && (
          <div className="space-y-4">
            {confirmedToday.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 border border-slate-100 shadow-sm text-center">
                <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-heading font-bold text-slate-800">
                  Belum Ada Pasien Terjadwal Hari Ini
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Pasien yang telah disetujui akan muncul dalam antrean konsultasi hari ini.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {confirmedToday.map((appt) => (
                  <div
                    key={appt.id}
                    className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between gap-4 hover:border-sky-200 transition"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Big Queue Badge */}
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 text-white flex flex-col items-center justify-center font-heading font-extrabold flex-shrink-0 shadow-sm">
                        <span className="text-[10px] uppercase font-bold tracking-wider leading-none text-sky-200">
                          Antrean
                        </span>
                        <span className="text-xl leading-none mt-1">
                          #{appt.queue_no || '-'}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading font-bold text-base text-slate-900 truncate">
                            {appt.patient_name || appt.full_name}
                          </h3>
                          <StatusBadge status={appt.status} size="sm" />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span className="font-mono text-slate-600 font-semibold">
                            RM: {appt.medical_record_no}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-medium text-slate-700">
                            <Clock className="w-3.5 h-3.5 text-sky-500" />
                            {appt.slot_start?.substring(0, 5)} WIB
                          </span>
                        </div>
                        {appt.complaint && (
                          <p className="text-xs text-slate-500 italic mt-1.5 truncate">
                            &ldquo;{appt.complaint}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      <Link
                        href={`/doctor/exam/${appt.id}`}
                        className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs shadow-sm transition"
                      >
                        <Stethoscope className="w-4 h-4" />
                        <span>Periksa Pasien</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Reject Reason Modal */}
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
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Mohon tuliskan alasan medis atau kendala jadwal yang jelas agar pasien dapat menjadwalkan ulang.
            </p>

            <div>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Contoh: Jadwal praktik berbenturan dengan agenda operasi darurat..."
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
                {rejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tolak Permohonan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
