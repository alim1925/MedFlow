import Navbar from '@/components/Navbar';
import { getPublicPolis, getPublicDoctors } from '@/services/patientService';
import { getCurrentUser } from '@/lib/auth';
import Link from 'next/link';
import {
  Activity,
  Heart,
  Calendar,
  CheckCircle,
  Star,
  ArrowRight,
  Users,
  Award,
  Clock,
  Shield,
  Stethoscope,
  PhoneCall,
  Sparkles,
  ChevronRight,
  MapPin,
  Pill,
  CheckCircle2,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'MedFlow HMIS - Layanan Kesehatan Terintegrasi',
  description: 'Sistem Informasi Manajemen Rumah Sakit terintegrasi: reservasi dokter online, nomor antrean real-time, rekam medis digital, dan layanan farmasi.',
};

// Fallback hardcoded poli services if empty
const FALLBACK_POLIS = [
  {
    id: 'poli-umum',
    name: 'Poli Umum',
    code: 'UMU',
    description: 'Pemeriksaan kesehatan menyeluruh, diagnosa dini, keluhan umum, dan rujukan dokter spesialis.',
    doctorCount: 4,
  },
  {
    id: 'poli-gigi',
    name: 'Poli Gigi & Mulut',
    code: 'GIG',
    description: 'Perawatan gigi komprehensif, pembersihan karang, penambalan estetika, dan bedah mulut ringan.',
    doctorCount: 3,
  },
  {
    id: 'poli-penyakit-dalam',
    name: 'Poli Penyakit Dalam',
    code: 'INT',
    description: 'Penanganan penyakit organ dalam non-bedah seperti diabetes, hipertensi, saluran cerna, dan ginjal.',
    doctorCount: 3,
  },
  {
    id: 'poli-anak',
    name: 'Poli Anak (Pediatri)',
    code: 'PED',
    description: 'Kesehatan anak mulai bayi baru lahir hingga remaja, pemantauan tumbuh kembang dan vaksinasi.',
    doctorCount: 3,
  },
  {
    id: 'poli-mata',
    name: 'Poli Mata',
    code: 'MAT',
    description: 'Pemeriksaan tajam penglihatan, koreksi kacamata, penanganan infeksi mata, katarak, dan retina.',
    doctorCount: 2,
  },
  {
    id: 'poli-jantung',
    name: 'Poli Jantung & Pembuluh',
    code: 'JAN',
    description: 'Skrining kardiovaskular, rekam jantung EKG, pencegahan serangan jantung, dan hipertensi berat.',
    doctorCount: 2,
  },
];

const DAY_NAMES = {
  0: 'Min',
  1: 'Sen',
  2: 'Sel',
  3: 'Rab',
  4: 'Kam',
  5: 'Jum',
  6: 'Sab',
};

// Fallback hardcoded doctors if empty
const FALLBACK_DOCTORS = [
  {
    id: 'doc-1',
    full_name: 'dr. Sarah Wijaya, Sp.PD',
    bio: 'Spesialis Penyakit Dalam',
    poli_name: 'Poli Penyakit Dalam',
    str_number: 'STR-PD-0019283',
    schedules: [
      { day_of_week: 1, start_time: '08:00', end_time: '12:00' },
      { day_of_week: 3, start_time: '08:00', end_time: '12:00' },
    ],
  },
  {
    id: 'doc-2',
    full_name: 'dr. Budi Santoso, Sp.A',
    bio: 'Spesialis Anak & Pediatri',
    poli_name: 'Poli Anak',
    str_number: 'STR-AN-0028471',
    schedules: [
      { day_of_week: 2, start_time: '09:00', end_time: '13:00' },
      { day_of_week: 4, start_time: '09:00', end_time: '13:00' },
    ],
  },
  {
    id: 'doc-3',
    full_name: 'dr. Amanda Putri, Sp.JP',
    bio: 'Spesialis Jantung & Pembuluh Darah',
    poli_name: 'Poli Jantung',
    str_number: 'STR-JP-0039182',
    schedules: [
      { day_of_week: 1, start_time: '13:00', end_time: '16:00' },
      { day_of_week: 5, start_time: '08:00', end_time: '12:00' },
    ],
  },
  {
    id: 'doc-4',
    full_name: 'dr. Hendra Kusuma, Sp.M',
    bio: 'Spesialis Mata & Refraksi',
    poli_name: 'Poli Mata',
    str_number: 'STR-MT-0048192',
    schedules: [
      { day_of_week: 2, start_time: '08:00', end_time: '12:00' },
      { day_of_week: 5, start_time: '13:00', end_time: '16:00' },
    ],
  },
];

export default async function HomePage() {
  let polis = [];
  let doctors = [];
  let currentUser = null;

  try {
    const [user, polisData, doctorsData] = await Promise.all([
      getCurrentUser(),
      getPublicPolis(),
      getPublicDoctors(),
    ]);
    currentUser = user;

    const availablePolis = polisData?.success && Array.isArray(polisData.data) ? polisData.data : [];
    const availableDoctors = doctorsData?.success && Array.isArray(doctorsData.data) ? doctorsData.data : [];
    polis = availablePolis.length > 0 ? availablePolis : FALLBACK_POLIS;
    doctors = availableDoctors.length > 0 ? availableDoctors.slice(0, 4) : FALLBACK_DOCTORS;
  } catch (e) {
    console.warn('Using fallback data on HomePage:', e);
    polis = FALLBACK_POLIS;
    doctors = FALLBACK_DOCTORS;
  }

  return (
    <div className="min-h-screen flex flex-col bg-sky-50/50">
      <Navbar currentUser={currentUser} />

      <main className="flex-1">
        {/* ========================================================= */}
        {/* 1. HERO SECTION                                           */}
        {/* ========================================================= */}
        <section className="relative overflow-hidden pt-6 pb-16 lg:py-24">
          {/* Decorative geometric background blurs */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full overflow-hidden pointer-events-none -z-10">
            <div className="absolute -top-24 left-1/4 w-96 h-96 bg-sky-200/50 rounded-full blur-3xl" />
            <div className="absolute top-1/3 -right-20 w-80 h-80 bg-emerald-200/35 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 left-10 w-72 h-72 bg-sky-100/70 rounded-full blur-2xl" />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Copy & Actions */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-100/80 border border-sky-200 text-sky-800 text-xs font-semibold shadow-sm">
                  <span className="flex h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
                  <span>Sistem Informasi Manajemen Rumah Sakit Terpadu</span>
                </div>

                {/* Main Heading */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                  Kesehatan Terpadu, Pelayanan Cepat &{' '}
                  <span className="bg-gradient-to-r from-sky-600 via-sky-500 to-teal-500 bg-clip-text text-transparent">
                    Tanpa Antre
                  </span>
                </h1>

                {/* Subtitle */}
                <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                  Rasakan kemudahan reservasi dokter spesialis secara mandiri, pantau estimasi antrean real-time,
                  akses rekam medis digital terenkripsi, serta tebus obat farmasi tanpa menunggu lama.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                  <Link
                    href="/register"
                    className="w-full sm:w-auto px-7 py-3.5 rounded-2xl font-semibold text-white bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 shadow-md shadow-sky-500/25 active:scale-[0.98] transition-all duration-200 inline-flex items-center justify-center gap-2.5 text-base"
                  >
                    <span>Daftar Berobat Sekarang</span>
                    <ArrowRight className="w-5 h-5" />
                  </Link>

                  <Link
                    href="/doctors"
                    className="w-full sm:w-auto px-6 py-3.5 rounded-2xl font-medium text-slate-700 bg-white border border-slate-200 hover:border-sky-400 hover:bg-sky-50/50 hover:text-sky-600 shadow-sm active:scale-[0.98] transition-all duration-200 inline-flex items-center justify-center gap-2 text-base"
                  >
                    <Calendar className="w-5 h-5 text-sky-500" />
                    <span>Lihat Jadwal Dokter</span>
                  </Link>
                </div>

                {/* Trust Badges */}
                <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Terhubung BPJS & Asuransi</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Rekam Medis Terstandar Kemenkes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Satu Akun untuk Semua Poli</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Clinical Preview Card */}
              <div className="lg:col-span-5 relative">
                <div className="relative mx-auto max-w-md bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white ring-1 ring-slate-900/5">
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 text-sm">Monitor Antrean Langsung</h3>
                        <p className="text-[11px] text-slate-500">Pembaruan otomatis setiap 5 detik</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Aktif
                    </span>
                  </div>

                  {/* Card Body: Queue Simulator */}
                  <div className="space-y-3.5 py-4">
                    {/* Active Ticket */}
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-[#084C61] text-white shadow-sm">
                      <div className="flex items-center justify-between text-xs text-sky-100 mb-1">
                        <span>Poli Umum • Ruang 102</span>
                        <span className="font-semibold uppercase tracking-wide">Sedang Berlangsung</span>
                      </div>
                      <div className="flex items-baseline justify-between mt-1">
                        <div>
                          <div className="text-3xl font-extrabold tracking-tight">A-014</div>
                          <div className="text-xs text-sky-100">dr. Sarah Wijaya, Sp.PD</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-sky-200">Waktu Tunggu Rata-rata</div>
                          <div className="text-base font-bold text-white">~ 8 Menit</div>
                        </div>
                      </div>
                    </div>

                    {/* Next Ticket */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
                          JAN
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-800">Poli Jantung & Pembuluh</div>
                          <div className="text-[11px] text-slate-500">Nomor Giliran: J-007</div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        Menunggu (2 Pasien)
                      </span>
                    </div>

                    {/* Pharmacy Prescription Status */}
                    <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
                          <Pill className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-emerald-950">Farmasi & Obat Siap</div>
                          <div className="text-[11px] text-emerald-700">Resep #RX-9428 • Loket 2</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-600 text-white">
                        Siap Diambil
                      </span>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Waktu sekarang: 09:42 WIB
                    </span>
                    <Link
                      href="/login"
                      className="text-sky-600 font-semibold hover:text-sky-700 flex items-center gap-1"
                    >
                      Cek Tiket Saya
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 2. STATS ROW                                              */}
        {/* ========================================================= */}
        <section className="py-8 bg-white border-y border-slate-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
              {/* Stat 1 */}
              <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900">500+</div>
                  <div className="text-xs sm:text-sm text-slate-500 font-medium">Pasien Terlayani / Minggu</div>
                </div>
              </div>

              {/* Stat 2 */}
              <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900">20+</div>
                  <div className="text-xs sm:text-sm text-slate-500 font-medium">Dokter Spesialis Ahli</div>
                </div>
              </div>

              {/* Stat 3 */}
              <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                  <Heart className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900">10+</div>
                  <div className="text-xs sm:text-sm text-slate-500 font-medium">Layanan Poli Terakreditasi</div>
                </div>
              </div>

              {/* Stat 4 */}
              <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900">98%</div>
                  <div className="text-xs sm:text-sm text-slate-500 font-medium">Kepuasan Pasien & Akurasi</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 3. POLI SERVICES SECTION                                  */}
        {/* ========================================================= */}
        <section className="py-16 sm:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 text-sky-700 text-xs font-semibold uppercase tracking-wider mb-3">
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Klinik & Spesialisasi</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-slate-900 tracking-tight">
                Layanan Poli Spesialis Lengkap
              </h2>
              <p className="mt-3 text-base text-slate-600">
                Pilih poli tujuan dan konsultasikan kesehatan Anda dengan dokter spesialis berpengalaman kami.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {polis.map((poli) => (
                <div
                  key={poli.id}
                  className="card group hover:shadow-lg hover:border-sky-200 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-heading font-bold text-base group-hover:bg-sky-500 group-hover:text-white transition-colors duration-300">
                        {poli.code || poli.name?.slice(0, 3).toUpperCase()}
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        {poli.doctorCount ? `${poli.doctorCount} Dokter` : 'Dokter Tersedia'}
                      </span>
                    </div>

                    <h3 className="text-lg font-heading font-semibold text-slate-800 group-hover:text-sky-600 transition-colors">
                      {poli.name}
                    </h3>
                    <p className="text-sm text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                      {poli.description || 'Pemeriksaan dan penanganan medis spesialis dengan standar rumah sakit berkualitas.'}
                    </p>
                  </div>

                  <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Jadwal: Senin - Sabtu</span>
                    <Link
                      href={`/patient/booking?poli=${poli.id}`}
                      className="text-xs font-semibold text-sky-600 hover:text-sky-700 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>Buat Janji</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-10">
              <Link
                href="/polis"
                className="btn-outline px-6 py-2.5 text-sm"
              >
                <span>Lihat Seluruh Poli & Jadwal Buka</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 4. HOW IT WORKS SECTION                                   */}
        {/* ========================================================= */}
        <section className="py-16 sm:py-24 bg-gradient-to-b from-white to-sky-50/70 border-y border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Proses Mudah & Modern</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-slate-900 tracking-tight">
                Alur Berobat Praktis Tanpa Antre
              </h2>
              <p className="mt-3 text-base text-slate-600">
                Empat langkah ringkas dari reservasi mandiri hingga obat selesai diproses di instalasi farmasi.
              </p>
            </div>

            {/* 4 Connected Steps */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
              {/* Connecting line for desktop */}
              <div className="hidden lg:block absolute top-1/4 left-16 right-16 h-0.5 bg-gradient-to-r from-sky-200 via-sky-300 to-emerald-200 -z-0" />

              {/* Step 1 */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative z-10 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-sky-500 text-white font-heading font-extrabold text-xl flex items-center justify-center shadow-md shadow-sky-500/25 mb-5 ring-4 ring-white">
                  01
                </div>
                <h3 className="font-heading font-semibold text-slate-800 text-base mb-2">
                  Daftar & Pilih Poli
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Buat akun pasien dalam 2 menit. Tentukan poli klinik sesuai kebutuhan dan keluhan kesehatan Anda.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative z-10 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-sky-600 text-white font-heading font-extrabold text-xl flex items-center justify-center shadow-md shadow-sky-600/25 mb-5 ring-4 ring-white">
                  02
                </div>
                <h3 className="font-heading font-semibold text-slate-800 text-base mb-2">
                  Pilih Dokter & Jam
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Pilih dokter spesialis favorit Anda serta waktu kunjungan yang fleksibel sesuai jadwal Anda.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative z-10 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#084C61] text-white font-heading font-extrabold text-xl flex items-center justify-center shadow-md shadow-slate-900/15 mb-5 ring-4 ring-white">
                  03
                </div>
                <h3 className="font-heading font-semibold text-slate-800 text-base mb-2">
                  Datang & Konsultasi
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Pantau antrean dari ponsel dan langsung masuk ruang dokter saat giliran tiba tanpa antre lama.
                </p>
              </div>

              {/* Step 4 */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative z-10 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white font-heading font-extrabold text-xl flex items-center justify-center shadow-md shadow-emerald-500/25 mb-5 ring-4 ring-white">
                  04
                </div>
                <h3 className="font-heading font-semibold text-slate-800 text-base mb-2">
                  Ambil Resep Obat
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Resep dikirim otomatis ke sistem farmasi. Ambil obat saat notifikasi siap tanpa penumpukan antrean.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 5. FEATURED DOCTORS                                       */}
        {/* ========================================================= */}
        <section className="py-16 sm:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 text-sky-700 text-xs font-semibold uppercase tracking-wider mb-3">
                  <Award className="w-3.5 h-3.5" />
                  <span>Tim Medis Berlisensi</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-heading font-bold text-slate-900 tracking-tight">
                  Dokter Spesialis Terbaik Kami
                </h2>
                <p className="mt-2 text-base text-slate-600">
                  Konsultasikan kondisi medis Anda kepada dokter spesialis berpengalaman dan berdedikasi tinggi.
                </p>
              </div>
              <div className="mt-4 md:mt-0">
                <Link
                  href="/doctors"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-600 hover:text-sky-700"
                >
                  <span>Lihat Seluruh Tim Dokter</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {doctors.map((doctor) => {
                const displayName = doctor.full_name || doctor.name || 'Dokter MedFlow';
                const initials = displayName
                  .replace(/^(drg?\.|dr\.|prof\.)\s*/i, '')
                  .split(' ')
                  .map((n) => n[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'DR';
                const schedules = Array.isArray(doctor.schedules) ? doctor.schedules : [];

                return (
                  <div
                    key={doctor.id}
                    className="card group hover:shadow-lg hover:border-sky-200 transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      {/* Doctor Avatar with Initials */}
                      <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-sky-500 to-[#084C61] text-white flex items-center justify-center font-heading font-bold text-xl shadow-md ring-4 ring-sky-50 group-hover:scale-105 transition-transform duration-300 mb-4">
                        {initials}
                      </div>

                      <div className="text-center">
                        <h3 className="font-heading font-semibold text-slate-800 text-base leading-snug">
                          {displayName}
                        </h3>
                        <p className="text-xs text-sky-600 font-medium mt-1">
                          {doctor.poli_name || 'Dokter Spesialis'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">
                          {doctor.bio || doctor.specialization || 'Dokter spesialis berpengalaman di MedFlow HMIS.'}
                        </p>
                      </div>

                      {/* Practice Schedule Summary */}
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 text-center">
                          Jadwal Praktik
                        </p>
                        {schedules.length > 0 ? (
                          <div className="flex flex-wrap justify-center gap-1">
                            {schedules.slice(0, 4).map((s, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 border border-sky-100 text-[10px] font-medium text-slate-700"
                              >
                                <span className="font-bold text-sky-700">
                                  {DAY_NAMES[s.day_of_week] || `H${s.day_of_week}`}
                                </span>
                                {s.start_time && (
                                  <span className="text-slate-500 font-mono">
                                    {s.start_time.substring(0, 5)}
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-center text-slate-400">
                            Senin - Jumat (08:00 - 16:00)
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 pt-3 flex flex-col gap-2">
                      <Link
                        href={`/doctors?poli=${doctor.poli_id || 'all'}`}
                        className="w-full btn-outline py-2 text-xs font-semibold justify-center hover:bg-sky-500 hover:text-white hover:border-sky-500 transition-all"
                      >
                        Lihat Jadwal & Profil
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 6. TESTIMONIALS SECTION                                   */}
        {/* ========================================================= */}
        <section className="py-16 sm:py-24 bg-white border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold uppercase tracking-wider mb-3">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>Pengalaman Pasien</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-slate-900 tracking-tight">
                Dipercaya Ribuan Pasien & Keluarga
              </h2>
              <p className="mt-3 text-base text-slate-600">
                Simak bagaimana MedFlow HMIS memberikan kenyamanan berobat yang lebih teratur, cepat, dan transparan.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Testimonial 1 */}
              <div className="card bg-sky-50/40 border-sky-100 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1 text-amber-400 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-700 italic leading-relaxed">
                    &ldquo;Dulu harus antre dari jam 6 pagi hanya untuk ambil nomor fisik di poli umum. Sekarang lewat MedFlow
                    bisa booking dari malam hari, datang 15 menit sebelum giliran langsung diperiksa dokter.&rdquo;
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-sky-100/80 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sky-600 text-white font-bold text-sm flex items-center justify-center">
                    RW
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">Rina Wulandari</h4>
                    <p className="text-xs text-slate-500">Pasien Poli Penyakit Dalam</p>
                  </div>
                </div>
              </div>

              {/* Testimonial 2 */}
              <div className="card bg-sky-50/40 border-sky-100 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1 text-amber-400 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-700 italic leading-relaxed">
                    &ldquo;Fitur resep obat yang langsung terhubung ke bagian farmasi sangat membantu. Kita bisa tahu persis
                    kapan obat selesai diracik tanpa perlu berkerumun di depan loket obat.&rdquo;
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-sky-100/80 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#084C61] text-white font-bold text-sm flex items-center justify-center">
                    DP
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">Dedi Pratama</h4>
                    <p className="text-xs text-slate-500">Pasien Poli Anak</p>
                  </div>
                </div>
              </div>

              {/* Testimonial 3 */}
              <div className="card bg-sky-50/40 border-sky-100 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1 text-amber-400 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-700 italic leading-relaxed">
                    &ldquo;Riwayat rekam medis dan catatan diagnosis tersimpan rapi di dashboard akun. Saat kontrol berkala
                    dokter bisa langsung melihat histori pemeriksaan sebelumnya secara akurat.&rdquo;
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-sky-100/80 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-600 text-white font-bold text-sm flex items-center justify-center">
                    MA
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">drg. Maya Anggraini</h4>
                    <p className="text-xs text-slate-500">Pasien & Rekan Medis</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 7. CTA BANNER                                             */}
        {/* ========================================================= */}
        <section className="py-16 bg-gradient-to-r from-sky-500 via-sky-600 to-[#084C61] text-white relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-10 -top-10 w-96 h-96 bg-sky-300/20 rounded-full blur-2xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <h2 className="text-3xl sm:text-4xl font-heading font-extrabold tracking-tight text-white">
              Siap Menikmati Layanan Rumah Sakit yang Lebih Efisien?
            </h2>
            <p className="mt-4 text-base sm:text-lg text-sky-100 max-w-2xl mx-auto leading-relaxed">
              Daftarkan diri Anda sekarang dalam beberapa menit. Bebas antre fisik, jadwal fleksibel, dan rekam medis terpadu.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold text-[#084C61] bg-white hover:bg-sky-50 shadow-lg active:scale-[0.98] transition-all duration-200 text-base"
              >
                Daftar Akun Pasien Baru
              </Link>

              <Link
                href="/contact"
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl font-semibold text-white border border-white/30 hover:bg-white/10 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 text-base"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Layanan Darurat & IGD 24 Jam</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================= */}
      {/* 8. FOOTER SECTION                                         */}
      {/* ========================================================= */}
      <footer className="bg-gradient-to-b from-[#084C61] to-[#052b37] text-white pt-16 pb-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-white/10">
            {/* Brand column */}
            <div className="lg:col-span-2 space-y-4">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white border border-white/20">
                  <Activity className="w-5 h-5 text-sky-300" />
                </div>
                <div className="flex flex-col">
                  <span className="font-heading font-bold text-2xl text-white tracking-tight">
                    Med<span className="text-sky-300">Flow</span>
                  </span>
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-sky-200/70">
                    Hospital Management Information System
                  </span>
                </div>
              </Link>

              <p className="text-sm text-sky-100/80 leading-relaxed max-w-sm">
                Solusi tata kelola rumah sakit modern terpadu: menjamin kelancaran alur pasien, keakuratan rekam medis elektronik, dan efisiensi farmasi.
              </p>

              <div className="pt-2 text-xs text-sky-200/70 space-y-1">
                <p className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-sky-300" />
                  <span>Jl. Sehat Harmoni No. 88, Jakarta Pusat 10110</span>
                </p>
                <p className="flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-sky-300" />
                  <span>Call Center 24 Jam: (021) 500-MEDFLOW</span>
                </p>
              </div>
            </div>

            {/* Links 1: Layanan Poli */}
            <div>
              <h4 className="font-heading font-semibold text-white text-sm tracking-wide mb-4">
                Layanan Poli
              </h4>
              <ul className="space-y-2.5 text-sm text-sky-100/70">
                <li><Link href="/patient/booking?poli=poli-umum" className="hover:text-white transition-colors">Poli Umum</Link></li>
                <li><Link href="/patient/booking?poli=poli-gigi" className="hover:text-white transition-colors">Poli Gigi & Mulut</Link></li>
                <li><Link href="/patient/booking?poli=poli-penyakit-dalam" className="hover:text-white transition-colors">Poli Penyakit Dalam</Link></li>
                <li><Link href="/patient/booking?poli=poli-anak" className="hover:text-white transition-colors">Poli Anak & Imunisasi</Link></li>
                <li><Link href="/patient/booking?poli=poli-mata" className="hover:text-white transition-colors">Poli Mata</Link></li>
                <li><Link href="/patient/booking?poli=poli-jantung" className="hover:text-white transition-colors">Poli Jantung & Kardio</Link></li>
              </ul>
            </div>

            {/* Links 2: Akses Cepat */}
            <div>
              <h4 className="font-heading font-semibold text-white text-sm tracking-wide mb-4">
                Akses Cepat
              </h4>
              <ul className="space-y-2.5 text-sm text-sky-100/70">
                <li><Link href="/login" className="hover:text-white transition-colors">Portal Masuk Pasien</Link></li>
                <li><Link href="/register" className="hover:text-white transition-colors">Pendaftaran Mandiri</Link></li>
                <li><Link href="/doctors" className="hover:text-white transition-colors">Jadwal Praktik Dokter</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Masuk Staf & Dokter</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Portal Farmasi</Link></li>
              </ul>
            </div>

            {/* Links 3: Jam Operasional */}
            <div>
              <h4 className="font-heading font-semibold text-white text-sm tracking-wide mb-4">
                Jam Layanan
              </h4>
              <div className="space-y-2 text-xs text-sky-100/80">
                <div>
                  <span className="font-semibold text-white block">Instalasi Gawat Darurat (IGD):</span>
                  <span>Setiap Hari 24 Jam Non-Stop</span>
                </div>
                <div className="pt-2">
                  <span className="font-semibold text-white block">Poli Rawat Jalan:</span>
                  <span>Senin - Sabtu: 08.00 - 20.00 WIB</span>
                </div>
                <div className="pt-2">
                  <span className="font-semibold text-white block">Instalasi Farmasi:</span>
                  <span>Setiap Hari: 07.00 - 22.00 WIB</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-sky-200/60 gap-4">
            <p>© 2026 MedFlow HMIS. Seluruh hak cipta dilindungi undang-undang.</p>
            <div className="flex gap-6">
              <Link href="/terms" className="hover:text-white transition-colors">Syarat & Ketentuan</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Kebijakan Privasi</Link>
              <Link href="/contact" className="hover:text-white transition-colors">Bantuan</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
