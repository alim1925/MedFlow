'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { apiRequest } from '@/lib/apiClient';
import {
  Calendar,
  Clock,
  Search,
  Filter,
  ArrowRight,
  UserCheck,
  Stethoscope,
  CheckCircle2,
  Loader2,
  X,
  Eye,
  ShieldCheck,
  LayoutGrid,
  TableProperties,
  Lock,
} from 'lucide-react';

const DAY_NAMES = {
  0: 'Minggu',
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu',
};

const ORDERED_DAYS = [1, 2, 3, 4, 5, 6, 0];

function getLocalDateStr(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getInitials(name) {
  if (!name) return 'DR';
  const clean = name.replace(/^(drg?\.|dr\.|Prof\.|Sp\.[A-Z()]+)/gi, '').trim();
  const parts = clean.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (parts[0] ? parts[0].substring(0, 2) : 'DR').toUpperCase();
}

export default function DoctorDirectory({
  initialDoctors = [],
  initialPolis = [],
  currentUser = null,
}) {
  const searchParams = useSearchParams();
  const poliParam = searchParams.get('poli') || 'all';

  const [selectedPoli, setSelectedPoli] = useState(poliParam);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

  // Read-only Doctor Profile & Schedule modal
  const [previewDoctor, setPreviewDoctor] = useState(null);
  const [previewDate, setPreviewDate] = useState(getLocalDateStr(0));
  const [previewSlots, setPreviewSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState('');

  const todayStr = getLocalDateStr(0);
  const maxDateStr = getLocalDateStr(30);

  const poliList = useMemo(() => {
    const list = [{ id: 'all', name: 'Semua Poli' }];
    initialPolis.forEach((p) => {
      if (p.id !== 'all') {
        list.push({ id: String(p.id), name: p.name });
      }
    });
    return list;
  }, [initialPolis]);

  const filteredDoctors = useMemo(() => {
    return initialDoctors.filter((doc) => {
      const matchPoli =
        selectedPoli === 'all' ||
        String(doc.poli_id) === String(selectedPoli) ||
        (doc.poli_name && doc.poli_name.toLowerCase().includes(selectedPoli.toLowerCase()));

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        q === '' ||
        (doc.full_name && doc.full_name.toLowerCase().includes(q)) ||
        (doc.bio && doc.bio.toLowerCase().includes(q)) ||
        (doc.poli_name && doc.poli_name.toLowerCase().includes(q)) ||
        (doc.str_number && doc.str_number.toLowerCase().includes(q));

      return matchPoli && matchSearch;
    });
  }, [initialDoctors, selectedPoli, searchQuery]);

  const fetchSlotsForDate = async (doctor, dateValue) => {
    if (!doctor || !dateValue) return;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      String(doctor.id)
    );
    if (!isUuid) {
      const dayOfWeek = new Date(`${dateValue}T00:00:00`).getDay();
      const matched = (doctor.schedules || []).filter((s) => Number(s.day_of_week) === dayOfWeek);
      if (matched.length === 0) {
        setPreviewSlots([]);
        return;
      }
      const generated = [];
      for (const s of matched) {
        const [sh, sm] = s.start_time.split(':').map(Number);
        const [eh, em] = s.end_time.split(':').map(Number);
        const step = s.slot_minutes || 20;
        for (let t = sh * 60 + sm; t + step <= eh * 60 + em; t += step) {
          const hh = String(Math.floor(t / 60)).padStart(2, '0');
          const mm = String(t % 60).padStart(2, '0');
          generated.push({ slot_start: `${hh}:${mm}`, available: true });
        }
      }
      setPreviewSlots(generated);
      return;
    }

    setLoadingSlots(true);
    setSlotError('');
    try {
      const res = await apiRequest(
        `/api/public/slots?doctorId=${encodeURIComponent(doctor.id)}&date=${encodeURIComponent(dateValue)}`
      );
      if (!res?.success) {
        setSlotError(res?.error || 'Gagal memuat slot jadwal praktik.');
        setPreviewSlots([]);
      } else {
        setPreviewSlots(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      console.error('Error checking slots:', err);
      setSlotError('Gagal memeriksa jadwal dokter.');
      setPreviewSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const openScheduleModal = (doc) => {
    const defaultDate = getLocalDateStr(0);
    setPreviewDoctor(doc);
    setPreviewDate(defaultDate);
    setPreviewSlots([]);
    setSlotError('');
    fetchSlotsForDate(doc, defaultDate);
  };

  const handleDateChange = (newDate) => {
    setPreviewDate(newDate);
    if (previewDoctor && newDate) {
      fetchSlotsForDate(previewDoctor, newDate);
    }
  };

  const getBookingHref = (doc) => {
    const bookingPath = `/patient/booking?poli=${doc.poli_id}&doctor=${doc.id}`;
    if (currentUser?.role === 'PATIENT') {
      return bookingPath;
    }
    return `/login?redirect=${encodeURIComponent(bookingPath)}`;
  };

  return (
    <div className="min-h-screen bg-sky-50 flex flex-col font-sans">
      <Navbar currentUser={currentUser} />

      {/* Hero / Header */}
      <section className="bg-gradient-to-br from-sky-600 via-sky-500 to-[#084C61] text-white pt-24 pb-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-xs font-medium text-sky-100 mb-4">
            <UserCheck className="w-4 h-4 text-emerald-300" />
            <span>Direktori Publik (Read-Only) • Profil Dokter & Jadwal Praktik</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-heading font-extrabold tracking-tight mb-4 text-white">
            Daftar Dokter, Profil & Jadwal Praktik
          </h1>
          <p className="text-base sm:text-lg text-sky-100 max-w-2xl mx-auto leading-relaxed">
            Lihat profil lengkap dokter spesialis, keahlian medis, serta jadwal praktik mingguan secara transparan tanpa perlu masuk akun.
          </p>

          {/* Search Bar */}
          <div className="max-w-xl mx-auto mt-8 relative">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari nama dokter, poli, nomor STR, atau keahlian..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-16 py-3.5 rounded-2xl bg-white text-slate-800 placeholder-slate-400 shadow-lg border-0 focus:ring-2 focus:ring-sky-300 text-sm outline-none transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Filter and Content Section */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-6">
        {/* Read-Only Public Info Banner */}
        <div className="bg-white rounded-2xl p-4 border border-sky-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">
                Mode Tampilan Publik (Read-Only)
              </p>
              <p className="text-[11px] text-slate-500">
                {currentUser?.role === 'PATIENT'
                  ? 'Anda masuk sebagai pasien dan dapat melanjutkan ke halaman booking kapan saja.'
                  : 'Anda dapat melihat seluruh daftar dokter, profil, dan jadwal praktik secara bebas tanpa login.'}
              </p>
            </div>
          </div>

          {/* View Mode Toggle: Cards vs Weekly Schedule Table */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 w-fit">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-sky-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kartu Profil</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-sky-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableProperties className="w-3.5 h-3.5" />
              <span>Tabel Jadwal</span>
            </button>
          </div>
        </div>

        {/* Poli Filter Pills Row */}
        <div>
          <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Filter className="w-3.5 h-3.5 text-sky-500" />
            <span>Filter Berdasarkan Poliklinik</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {poliList.map((p) => {
              const isActive = selectedPoli === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPoli(p.id)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-sky-500 text-white shadow-sm ring-2 ring-sky-300 ring-offset-1'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Doctor Count Meta */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-500">
            Menampilkan <span className="font-bold text-slate-800">{filteredDoctors.length}</span> dokter aktif
          </p>
          {currentUser?.role === 'PATIENT' && (
            <Link
              href="/patient/doctors"
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 inline-flex items-center gap-1"
            >
              <span>Buka di Portal Pasien</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {/* Empty State */}
        {filteredDoctors.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm max-w-md mx-auto my-12">
            <div className="w-16 h-16 rounded-full bg-sky-50 text-sky-500 flex items-center justify-center mx-auto mb-4">
              <Stethoscope className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-heading font-bold text-slate-800 mb-1">
              Tidak Ada Dokter Ditemukan
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Silakan sesuaikan kata kunci pencarian Anda atau pilih filter poliklinik lain.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedPoli('all');
                setSearchQuery('');
              }}
              className="px-5 py-2.5 rounded-xl bg-sky-500 text-white text-xs font-semibold hover:bg-sky-600 transition cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        ) : viewMode === 'table' ? (
          /* VIEW MODE 2: READ-ONLY WEEKLY SCHEDULE TABLE */
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-heading font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-600" />
                <span>Jadwal Praktik Mingguan Dokter (Read-Only)</span>
              </h2>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                WIB
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-4">Dokter & Profil</th>
                    <th className="py-3.5 px-4">Poliklinik</th>
                    <th className="py-3.5 px-4">Jadwal Praktik Mingguan</th>
                    <th className="py-3.5 px-4 text-right">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDoctors.map((doc) => {
                    const schedules = doc.schedules || [];
                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/70 align-top">
                        <td className="py-4 px-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-[#084C61] text-white flex items-center justify-center font-heading font-bold text-xs flex-shrink-0">
                              {getInitials(doc.full_name)}
                            </div>
                            <div className="min-w-0 max-w-xs">
                              <p className="font-heading font-bold text-sm text-slate-900">
                                {doc.full_name}
                              </p>
                              {doc.str_number && (
                                <p className="text-[11px] text-slate-400 font-mono">
                                  {doc.str_number}
                                </p>
                              )}
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                {doc.bio || 'Dokter spesialis MedFlow HMIS.'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-100">
                            {doc.poli_name || 'Poliklinik'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {schedules.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {[...schedules]
                                .sort(
                                  (a, b) =>
                                    ORDERED_DAYS.indexOf(Number(a.day_of_week)) -
                                    ORDERED_DAYS.indexOf(Number(b.day_of_week))
                                )
                                .map((s, idx) => (
                                  <span
                                    key={s.id || idx}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px]"
                                  >
                                    <span className="font-bold text-sky-700">
                                      {DAY_NAMES[s.day_of_week] || `Hari ${s.day_of_week}`}
                                    </span>
                                    <span className="font-mono text-slate-600">
                                      {s.start_time?.substring(0, 5)}-{s.end_time?.substring(0, 5)}
                                    </span>
                                  </span>
                                ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Belum ada jadwal aktif</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openScheduleModal(doc)}
                              className="btn-outline py-1.5 px-3 text-xs"
                            >
                              <Eye className="w-3.5 h-3.5 text-sky-600" />
                              <span>Profil & Slot</span>
                            </button>
                            <Link
                              href={getBookingHref(doc)}
                              className="btn-primary py-1.5 px-3 text-xs"
                            >
                              <span>Booking</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* VIEW MODE 1: DETAILED PROFILE & SCHEDULE CARDS */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doc) => {
              const initials = getInitials(doc.full_name);
              const schedules = doc.schedules || [];

              return (
                <div
                  key={doc.id}
                  className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md hover:border-sky-200 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Avatar + Poli Badge */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400 to-[#084C61] text-white flex items-center justify-center font-heading font-extrabold text-lg shadow-sm flex-shrink-0">
                        {initials}
                      </div>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-700">
                        {doc.poli_name || 'Dokter Spesialis'}
                      </span>
                    </div>

                    {/* Name + STR */}
                    <h3 className="text-lg font-heading font-bold text-slate-900 leading-snug mb-1">
                      {doc.full_name}
                    </h3>
                    {doc.str_number && (
                      <p className="text-xs text-slate-400 mb-3 font-mono flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{doc.str_number}</span>
                      </p>
                    )}

                    {/* Full Profile Bio */}
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                      {doc.bio ||
                        'Dokter berdedikasi tinggi dengan pengalaman klinis komprehensif dalam pelayanan pasien prima.'}
                    </p>

                    {/* Read-Only Schedule List */}
                    <div className="mb-5 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-sky-500" />
                          <span>Jadwal Praktik:</span>
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">Read-Only</span>
                      </div>
                      {schedules.length > 0 ? (
                        <div className="space-y-1.5">
                          {schedules.map((s, idx) => {
                            const dayName = DAY_NAMES[s.day_of_week] || `Hari ${s.day_of_week}`;
                            return (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700"
                              >
                                <span className="font-semibold text-sky-600">{dayName}</span>
                                <span className="font-mono text-[11px] text-slate-600">
                                  {s.start_time?.substring(0, 5)} - {s.end_time?.substring(0, 5)} WIB
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">
                          Jadwal praktik belum tersedia saat ini.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openScheduleModal(doc)}
                      className="btn-outline flex-1 py-2.5 px-3 text-xs font-semibold justify-center"
                    >
                      <Eye className="w-4 h-4 text-sky-600" />
                      <span>Profil & Jadwal</span>
                    </button>
                    <Link
                      href={getBookingHref(doc)}
                      className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-semibold text-xs sm:text-sm shadow-sm hover:shadow transition-all group"
                    >
                      <span>{currentUser?.role === 'PATIENT' ? 'Buat Janji' : 'Booking'}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Read-Only Doctor Profile & Practice Schedule Modal */}
      {previewDoctor && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header: Doctor Profile */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-[#084C61] text-white flex items-center justify-center font-heading font-extrabold text-lg shadow-sm flex-shrink-0">
                  {getInitials(previewDoctor.full_name)}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-100 px-2.5 py-0.5 rounded-full">
                      {previewDoctor.poli_name || 'Poliklinik'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      <Eye className="w-3 h-3" />
                      Read-Only
                    </span>
                  </div>
                  <h3 className="font-heading font-bold text-lg text-slate-900 mt-1 leading-snug">
                    {previewDoctor.full_name}
                  </h3>
                  {previewDoctor.str_number && (
                    <p className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{previewDoctor.str_number}</span>
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoctor(null)}
                aria-label="Tutup profil dokter"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Full Doctor Bio / Profile */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Profil & Keahlian Dokter
              </span>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {previewDoctor.bio ||
                  'Dokter spesialis berdedikasi tinggi dengan pengalaman klinis komprehensif dalam pelayanan pasien MedFlow HMIS.'}
              </p>
            </div>

            {/* Weekly Practice Schedule (Read-Only) */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-500" />
                <span>Jadwal Praktik Mingguan</span>
              </span>
              {Array.isArray(previewDoctor.schedules) && previewDoctor.schedules.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-slate-100">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="py-2 px-3">Hari</th>
                        <th className="py-2 px-3">Jam Praktik</th>
                        <th className="py-2 px-3 text-right">Durasi Slot</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewDoctor.schedules.map((s, idx) => (
                        <tr key={s.id || idx}>
                          <td className="py-2 px-3 font-semibold text-sky-700">
                            {DAY_NAMES[s.day_of_week] || `Hari ${s.day_of_week}`}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-700">
                            {s.start_time?.substring(0, 5)} - {s.end_time?.substring(0, 5)} WIB
                          </td>
                          <td className="py-2 px-3 text-right text-slate-500">
                            {s.slot_minutes || 20} menit
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                  Jadwal praktik mingguan belum tersedia.
                </p>
              )}
            </div>

            {/* Date Slot Availability Preview (Read-Only) */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Pratinjau Ketersediaan Slot Per Tanggal (Read-Only)
                </label>
                <input
                  type="date"
                  min={todayStr}
                  max={maxDateStr}
                  value={previewDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-sky-500" />
                    Jam Konsultasi
                  </span>
                  <span className="text-[11px] text-slate-400">WIB</span>
                </div>

                {loadingSlots ? (
                  <div className="py-6 text-center">
                    <Loader2 className="w-6 h-6 text-sky-500 animate-spin mx-auto mb-2" />
                    <p className="text-xs text-slate-500">Memeriksa jadwal praktik...</p>
                  </div>
                ) : slotError ? (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
                    {slotError}
                  </p>
                ) : previewSlots.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center text-xs text-slate-500">
                    Dokter tidak praktik pada tanggal ini. Silakan pilih tanggal lain sesuai jadwal mingguan di atas.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {previewSlots.map((slot, idx) => (
                      <div
                        key={idx}
                        className={`py-2 px-2.5 rounded-xl text-xs font-semibold text-center border ${
                          slot.available
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                        }`}
                      >
                        {slot.slot_start?.substring(0, 5)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Hijau = Tersedia (Hanya Baca)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewDoctor(null)}
                  className="btn-outline text-xs py-2"
                >
                  Tutup
                </button>
                <Link
                  href={getBookingHref(previewDoctor)}
                  className="btn-primary text-xs py-2"
                >
                  <span>{currentUser?.role === 'PATIENT' ? 'Booking Sekarang' : 'Masuk untuk Booking'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
