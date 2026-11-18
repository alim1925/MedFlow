'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiRequest } from '@/lib/apiClient';
import {
  Calendar,
  CalendarPlus,
  Activity,
  Stethoscope,
  Smile,
  Eye,
  Heart,
  HeartPulse,
  Baby,
  Flower2,
  Check,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Clock,
} from 'lucide-react';

const ICON_MAP = {
  Stethoscope,
  Smile,
  Eye,
  Heart,
  HeartPulse,
  Baby,
  Flower2,
  Activity,
};

const DAY_NAMES = {
  0: 'Minggu',
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu',
};

function getPoliIcon(iconName) {
  return ICON_MAP[iconName] || Activity;
}

function getLocalDateStr(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function BookingWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPoliParam = searchParams.get('poli');
  const initialDoctorParam = searchParams.get('doctor');

  // Wizard state
  const [step, setStep] = useState(1);
  const [selectedPoli, setSelectedPoli] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null); // { slot_start, schedule_id }
  const [complaint, setComplaint] = useState('');

  // Data lists
  const [polis, setPolis] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [slots, setSlots] = useState([]);

  // Loading & error
  const [loadingPolis, setLoadingPolis] = useState(true);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const todayStr = getLocalDateStr(0);
  const maxDateStr = getLocalDateStr(30);

  // Load Polis (and handle ?poli= / ?doctor= deep links)
  useEffect(() => {
    let cancelled = false;

    async function initBookingData() {
      try {
        const [polisRes, allDocsRes] = await Promise.all([
          apiRequest('/api/public/polis'),
          initialDoctorParam ? apiRequest('/api/public/doctors') : Promise.resolve(null),
        ]);

        if (cancelled) return;

        if (!polisRes?.success) {
          throw new Error(polisRes?.error || 'Gagal memuat daftar poliklinik.');
        }

        const poliList = Array.isArray(polisRes.data) ? polisRes.data : [];
        setPolis(poliList);

        if (initialDoctorParam && allDocsRes?.success && Array.isArray(allDocsRes.data)) {
          const matchedDoc = allDocsRes.data.find(
            (d) => String(d.id) === String(initialDoctorParam)
          );
          if (matchedDoc) {
            const matchedPoli = poliList.find(
              (p) => String(p.id) === String(matchedDoc.poli_id)
            );
            if (matchedPoli) {
              setSelectedPoli(matchedPoli);
              setDoctors(
                allDocsRes.data.filter(
                  (d) => String(d.poli_id) === String(matchedPoli.id)
                )
              );
            }
            setSelectedDoctor(matchedDoc);
            setStep(3);
            return;
          }
        }

        if (initialPoliParam) {
          const matchedPoli = poliList.find(
            (p) => String(p.id) === String(initialPoliParam)
          );
          if (matchedPoli) {
            setSelectedPoli(matchedPoli);
            const docsRes = await apiRequest(
              `/api/public/doctors?poliId=${encodeURIComponent(matchedPoli.id)}`
            );
            if (!cancelled && docsRes?.success && Array.isArray(docsRes.data)) {
              setDoctors(docsRes.data);
            }
            setStep(2);
          }
        }
      } catch (e) {
        if (!cancelled) {
          console.error('Error initializing booking data:', e);
          setError(e instanceof Error ? e.message : 'Gagal memuat daftar poliklinik.');
        }
      } finally {
        if (!cancelled) {
          setLoadingPolis(false);
        }
      }
    }

    initBookingData();
    return () => {
      cancelled = true;
    };
  }, [initialPoliParam, initialDoctorParam]);

  const handleSelectPoli = async (poli) => {
    setSelectedPoli(poli);
    setSelectedDoctor(null);
    setSelectedDate('');
    setSelectedSlot(null);
    setSlots([]);
    setDoctors([]);
    setError('');
    setLoadingDoctors(true);

    try {
      const res = await apiRequest(
        `/api/public/doctors?poliId=${encodeURIComponent(poli.id)}`
      );
      if (!res?.success) {
        throw new Error(res?.error || 'Gagal memuat daftar dokter.');
      }
      setDoctors(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Error fetching doctors:', e);
      setDoctors([]);
      setError(e instanceof Error ? e.message : 'Gagal memuat daftar dokter.');
    } finally {
      setLoadingDoctors(false);
    }
  };

  const handleSelectDoctor = (doc) => {
    setSelectedDoctor(doc);
    setSelectedSlot(null);
    setSlots([]);
    setError('');
    if (selectedDate) {
      loadSlotsForDate(doc.id, selectedDate);
    }
  };

  const loadSlotsForDate = async (doctorId, dateStr) => {
    if (!doctorId || !dateStr) return;
    setLoadingSlots(true);
    setError('');
    try {
      const res = await apiRequest(
        `/api/public/slots?doctorId=${encodeURIComponent(doctorId)}&date=${encodeURIComponent(dateStr)}`
      );
      if (!res?.success) {
        throw new Error(res?.error || 'Gagal memuat jadwal yang tersedia.');
      }
      setSlots(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Error fetching slots:', e);
      setSlots([]);
      setError(e instanceof Error ? e.message : 'Gagal memuat jadwal yang tersedia.');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateChange = (dateStr) => {
    setSelectedDate(dateStr);
    setSelectedSlot(null);
    setSlots([]);
    if (selectedDoctor && dateStr) {
      loadSlotsForDate(selectedDoctor.id, dateStr);
    }
  };

  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    if (!selectedPoli?.id || !selectedDoctor?.id || !selectedDate || !selectedSlot?.slot_start || !selectedSlot?.schedule_id) {
      setError('Mohon lengkapi poli, dokter, tanggal, dan jam konsultasi.');
      return;
    }

    if (!complaint || complaint.trim().length < 5) {
      setError('Mohon jelaskan keluhan medis Anda minimal 5 karakter.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('poli_id', selectedPoli.id);
      formData.append('doctor_id', selectedDoctor.id);
      formData.append('schedule_id', selectedSlot.schedule_id);
      formData.append('appointment_date', selectedDate);
      formData.append('slot_start', selectedSlot.slot_start);
      formData.append('complaint', complaint.trim());

      const res = await apiRequest('/api/patient/appointments', {
        method: 'POST',
        body: formData,
      });

      if (res && res.success) {
        router.push('/patient/appointments?booked=true');
      } else {
        setError(res?.error || 'Gagal membuat janji temu. Slot waktu tersebut mungkin baru saja terisi.');
      }
    } catch (err) {
      console.error('Booking submission error:', err);
      setError('Terjadi kendala jaringan saat memproses booking.');
    } finally {
      setSubmitting(false);
    }
  };

  const doctorSchedules = selectedDoctor?.schedules || [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-600 uppercase tracking-wider mb-1">
            <CalendarPlus className="w-4 h-4" />
            <span>Reservasi Rawat Jalan</span>
          </div>
          <h1 className="text-2xl font-heading font-extrabold text-slate-900">
            Booking Janji Temu Dokter
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pendaftaran rawat jalan online cepat, transparan, dan tanpa antrean loket.
          </p>
        </div>

        <Link href="/patient/doctors" className="btn-outline text-xs w-fit">
          <Stethoscope className="w-4 h-4 text-sky-600" />
          <span>Lihat Jadwal Dokter</span>
        </Link>
      </div>

      {/* Main 12-Col Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: 4-Step Wizard */}
        <div className="lg:col-span-8 space-y-6">
          {/* Stepper (4 Steps) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { num: 1, label: 'Pilih Poli' },
                { num: 2, label: 'Pilih Dokter' },
                { num: 3, label: 'Tanggal & Jam' },
                { num: 4, label: 'Keluhan' },
              ].map((item) => (
                <div key={item.num} className="flex flex-col items-center">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                      step > item.num
                        ? 'bg-emerald-500 text-white'
                        : step === item.num
                        ? 'bg-sky-500 text-white ring-4 ring-sky-100'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {step > item.num ? <Check className="w-4 h-4" /> : item.num}
                  </div>
                  <span
                    className={`text-[11px] mt-1.5 font-semibold ${
                      step >= item.num ? 'text-sky-700' : 'text-slate-400'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div role="alert" className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* STEP 1: PILIH POLI */}
          {step === 1 && (
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-heading font-bold text-slate-900">
                  1. Pilih Poliklinik Tujuan
                </h2>
                <span className="text-xs text-slate-400">Pilih salah satu</span>
              </div>

              {loadingPolis ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-7 h-7 text-sky-500 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Memuat daftar poliklinik...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {polis.map((p) => {
                    const Icon = getPoliIcon(p.icon);
                    const isSelected = selectedPoli?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPoli(p)}
                        className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-200 shadow-sm'
                            : 'bg-white border-slate-100 hover:border-sky-200 shadow-sm'
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                            isSelected ? 'bg-sky-500 text-white' : 'bg-sky-50 text-sky-600'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-heading font-bold text-slate-800 text-sm">
                            {p.name}
                          </h3>
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                            {p.description || 'Layanan rawat jalan terpadu'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={!selectedPoli}
                  onClick={() => setStep(2)}
                  className="btn-primary px-6"
                >
                  <span>Lanjut: Pilih Dokter</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: PILIH DOKTER */}
          {step === 2 && (
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-heading font-bold text-slate-900">
                    2. Pilih Dokter Spesialis
                  </h2>
                  <p className="text-xs text-sky-600 font-medium mt-0.5">
                    {selectedPoli?.name}
                  </p>
                </div>
              </div>

              {loadingDoctors ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-7 h-7 text-sky-500 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Mencari dokter tersedia...</p>
                </div>
              ) : doctors.length === 0 ? (
                <div className="bg-slate-50 rounded-2xl p-8 text-center border border-slate-100">
                  <p className="text-xs text-slate-500 mb-3">
                    Belum ada dokter yang bertugas di poli ini saat ini.
                  </p>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs font-semibold text-sky-600 hover:text-sky-700 cursor-pointer"
                  >
                    &larr; Pilih Poli Lain
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {doctors.map((doc) => {
                    const isSelected = selectedDoctor?.id === doc.id;
                    const initials = doc.full_name
                      ?.replace(/^(drg?\.|dr\.|Prof\.|Sp\.[A-Z()]+)/gi, '')
                      .trim()
                      .substring(0, 2)
                      .toUpperCase() || 'DR';
                    const docSchedules = doc.schedules || [];

                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => handleSelectDoctor(doc)}
                        className={`w-full p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-start gap-3.5 ${
                          isSelected
                            ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-200 shadow-sm'
                            : 'bg-white border-slate-100 hover:border-sky-200 shadow-sm'
                        }`}
                      >
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center font-heading font-bold text-sm flex-shrink-0 ${
                            isSelected ? 'bg-sky-500 text-white' : 'bg-sky-100 text-sky-700'
                          }`}
                        >
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-heading font-bold text-slate-900 text-sm truncate">
                              {doc.full_name}
                            </h3>
                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                                isSelected
                                  ? 'bg-sky-500 border-sky-500 text-white'
                                  : 'border-slate-300'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                            {doc.bio || 'Dokter Spesialis MedFlow'}
                          </p>
                          {doc.str_number && (
                            <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                              {doc.str_number}
                            </span>
                          )}

                          {/* Show Doctor's Practice Schedule Badges */}
                          {docSchedules.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2.5">
                              {docSchedules.map((s, i) => (
                                <span
                                  key={s.id || i}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-600"
                                >
                                  <span className="font-semibold text-sky-700">
                                    {DAY_NAMES[s.day_of_week] || `Hari ${s.day_of_week}`}
                                  </span>
                                  <span className="font-mono text-[10px]">
                                    {s.start_time?.substring(0, 5)}-{s.end_time?.substring(0, 5)}
                                  </span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-outline"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Poli</span>
                </button>
                <button
                  type="button"
                  disabled={!selectedDoctor}
                  onClick={() => setStep(3)}
                  className="btn-primary px-6"
                >
                  <span>Lanjut: Pilih Jadwal</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PILIH TANGGAL & WAKTU */}
          {step === 3 && (
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-heading font-bold text-slate-900">
                  3. Pilih Tanggal & Jam Konsultasi
                </h2>
                <p className="text-xs text-sky-600 font-medium mt-0.5">
                  {selectedDoctor?.full_name} • {selectedPoli?.name}
                </p>
              </div>

              {/* Active Practice Days Info */}
              {doctorSchedules.length > 0 && (
                <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-3.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-sky-800 mb-2 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Hari Praktik Dokter Ini:</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {doctorSchedules.map((s, i) => (
                      <span
                        key={s.id || i}
                        className="px-2.5 py-1 rounded-lg bg-white border border-sky-200 text-xs text-slate-700"
                      >
                        <strong className="text-sky-700">{DAY_NAMES[s.day_of_week]}</strong>{' '}
                        ({s.start_time?.substring(0, 5)} - {s.end_time?.substring(0, 5)} WIB)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="label">Pilih Tanggal Kunjungan</label>
                <input
                  type="date"
                  min={todayStr}
                  max={maxDateStr}
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="input-field max-w-xs"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Jadwal dapat dipesan hingga 30 hari ke depan.
                </p>
              </div>

              {selectedDate && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-sky-500" />
                      <span>Pilih Slot Jam Konsultasi</span>
                    </span>
                    <span className="text-xs text-slate-400">WIB</span>
                  </div>

                  {loadingSlots ? (
                    <div className="py-8 text-center">
                      <Loader2 className="w-6 h-6 text-sky-500 animate-spin mx-auto mb-2" />
                      <p className="text-xs text-slate-500">Mengecek ketersediaan antrean...</p>
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="bg-slate-50 rounded-xl p-4 text-center text-xs text-slate-500 border border-slate-100">
                      Tidak ada jadwal praktik dokter pada tanggal yang dipilih. Silakan pilih hari praktik sesuai jadwal di atas.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                      {slots.map((s, idx) => {
                        const timeStr = s.slot_start?.substring(0, 5) || s.slot_start;
                        const isSelected =
                          selectedSlot?.slot_start === s.slot_start &&
                          selectedSlot?.schedule_id === s.schedule_id;
                        const isAvailable = s.available !== false;

                        if (!isAvailable) {
                          return (
                            <div
                              key={idx}
                              className="py-2.5 px-3 rounded-xl bg-slate-100 text-slate-400 text-xs font-medium text-center line-through cursor-not-allowed select-none border border-slate-200"
                              title="Slot sudah terisi"
                            >
                              {timeStr}
                            </div>
                          );
                        }

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setSelectedSlot({
                                slot_start: s.slot_start,
                                schedule_id: s.schedule_id,
                              });
                              setError('');
                            }}
                            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-sky-500 text-white shadow-sm ring-2 ring-sky-300'
                                : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-100'
                            }`}
                          >
                            {timeStr}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn-outline"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Dokter</span>
                </button>
                <button
                  type="button"
                  disabled={!selectedDate || !selectedSlot}
                  onClick={() => setStep(4)}
                  className="btn-primary px-6"
                >
                  <span>Lanjut: Isi Keluhan</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: KELUHAN & KONFIRMASI */}
          {step === 4 && (
            <form
              onSubmit={handleSubmitBooking}
              className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-5"
            >
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-heading font-bold text-slate-900">
                  4. Keluhan Medis & Konfirmasi
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tuliskan gejala atau alasan kunjungan agar dokter dapat bersiap sebelum pemeriksaan.
                </p>
              </div>

              <div>
                <label className="label">Keluhan / Gejala Utama *</label>
                <textarea
                  rows={4}
                  required
                  minLength={5}
                  maxLength={500}
                  value={complaint}
                  onChange={(e) => setComplaint(e.target.value)}
                  placeholder="Jelaskan keluhan medis yang Anda alami, sudah berapa hari dirasakan, atau alasan konsultasi..."
                  className="input-field resize-none"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                  <span>Minimal 5 karakter</span>
                  <span>{complaint.length}/500</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setStep(3)}
                  className="btn-outline"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Ubah Jadwal</span>
                </button>
                <button
                  type="submit"
                  disabled={submitting || complaint.trim().length < 5}
                  className="btn-primary px-6"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Memproses Janji Temu...</span>
                    </>
                  ) : (
                    <>
                      <span>Konfirmasi & Buat Janji</span>
                      <Check className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right 4 Cols: Live Booking Summary Card */}
        <aside className="lg:col-span-4 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4 lg:sticky lg:top-6">
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 uppercase tracking-wider pb-3 border-b border-slate-100">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Ringkasan Janji Temu</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Poliklinik Tujuan
              </span>
              <span className="font-bold text-slate-800 mt-0.5 block">
                {selectedPoli?.name || 'Belum dipilih'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Dokter Spesialis
              </span>
              <span className="font-bold text-slate-800 mt-0.5 block">
                {selectedDoctor?.full_name || 'Belum dipilih'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                  Tanggal
                </span>
                <span className="font-bold text-slate-800 mt-0.5 block">
                  {selectedDate || '-'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                  Jam Slot
                </span>
                <span className="font-bold text-sky-600 mt-0.5 block">
                  {selectedSlot?.slot_start ? `${selectedSlot.slot_start.substring(0, 5)} WIB` : '-'}
                </span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed pt-2 border-t border-slate-100">
            Setelah dikirim, permohonan janji temu akan diverifikasi oleh dokter dan Anda akan menerima nomor antrean melalui halaman Pesan & Janji Temu.
          </p>
        </aside>
      </div>
    </div>
  );
}

export default function BookingWizardPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Memuat formulir booking...</p>
        </div>
      }
    >
      <BookingWizardContent />
    </Suspense>
  );
}
