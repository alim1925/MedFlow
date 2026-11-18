import Navbar from '@/components/Navbar';
import { getPublicPolis } from '@/services/patientService';
import { getCurrentUser } from '@/lib/auth';
import Link from 'next/link';
import {
  Stethoscope,
  Smile,
  Eye,
  Heart,
  Baby,
  Flower2,
  Activity,
  Brain,
  Bone,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock,
  CheckCircle2
} from 'lucide-react';

export const metadata = {
  title: 'Layanan Poli',
  description: 'Daftar poliklinik dan layanan spesialis medis terpadu di MedFlow HMIS.',
};

const ICON_MAP = {
  Stethoscope,
  Smile,
  Eye,
  Heart,
  Baby,
  Flower2,
  Activity,
  Brain,
  Bone,
  Sparkles,
};

function getPoliIcon(iconName) {
  const IconComponent = ICON_MAP[iconName] || Activity;
  return IconComponent;
}

const FALLBACK_POLIS = [
  {
    id: 'poli-umum',
    name: 'Poli Umum',
    icon: 'Stethoscope',
    description: 'Pelayanan pemeriksaan kesehatan dasar, konsultasi keluhan umum, dan rujukan spesialis oleh dokter umum berpengalaman.',
  },
  {
    id: 'poli-gigi',
    name: 'Poli Gigi & Mulut',
    icon: 'Smile',
    description: 'Pemeriksaan kesehatan rongga mulut, penambalan, pembersihan karang gigi (scaling), dan tindakan bedah mulut ringan.',
  },
  {
    id: 'poli-mata',
    name: 'Poli Mata',
    icon: 'Eye',
    description: 'Diagnostik penglihatan, refraksi kacamata, penanganan katarak, dan terapi gangguan kesehatan mata komprehensif.',
  },
  {
    id: 'poli-jantung',
    name: 'Poli Jantung & Pembuluh Darah',
    icon: 'Heart',
    description: 'Pemeriksaan EKG, ekokardiografi, pencegahan dan penatalaksanaan penyakit jantung koroner serta hipertensi.',
  },
  {
    id: 'poli-anak',
    name: 'Poli Anak (Pediatri)',
    icon: 'Baby',
    description: 'Pemantauan tumbuh kembang anak, imunisasi lengkap, diagnosis infeksi pediatrik, dan nutrisi gizi anak.',
  },
  {
    id: 'poli-kandungan',
    name: 'Poli Kebidanan & Kandungan (Obgyn)',
    icon: 'Flower2',
    description: 'Konsultasi kehamilan (ANC), ultrasonografi (USG 4D), program keluarga berencana, dan kesehatan reproduksi wanita.',
  },
];

export default async function PolisPage() {
  let polis = [];
  let currentUser = null;
  try {
    const [user, res] = await Promise.all([
      getCurrentUser(),
      getPublicPolis(),
    ]);
    currentUser = user;
    if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
      polis = res.data;
    } else {
      polis = FALLBACK_POLIS;
    }
  } catch (error) {
    console.error('Error fetching public polis:', error);
    polis = FALLBACK_POLIS;
  }

  return (
    <div className="min-h-screen bg-sky-50 flex flex-col font-sans">
      <Navbar currentUser={currentUser} />

      {/* Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-sky-600 via-sky-500 to-[#084C61] text-white pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-xs font-medium text-sky-100 mb-4">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Fasilitas Medis Modern & Terakreditasi</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-heading font-extrabold tracking-tight mb-4 text-white">
            Layanan Poliklinik Kami
          </h1>
          <p className="text-base sm:text-lg text-sky-100 max-w-2xl mx-auto leading-relaxed">
            Pusat layanan kesehatan spesialis dengan dokter ahli profesional dan peralatan medis mutakhir untuk perawatan keluarga Anda yang prima.
          </p>
        </div>
      </section>

      {/* Main Content Grid */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b border-slate-200 pb-5">
          <div>
            <h2 className="text-2xl font-heading font-bold text-slate-800">
              Pilihan Poliklinik Spesialis
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Menampilkan {polis.length} poli aktif yang siap melayani kebutuhan konsultasi Anda.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm w-fit">
            <Clock className="w-4 h-4 text-sky-500" />
            <span>Pendaftaran Online 24/7</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {polis.map((poli) => {
            const Icon = getPoliIcon(poli.icon);
            return (
              <div
                key={poli.id}
                className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md hover:border-sky-200 transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 mb-5 group-hover:bg-sky-500 group-hover:text-white group-hover:scale-105 transition-all duration-300">
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-heading font-bold text-slate-800 mb-2 group-hover:text-sky-600 transition-colors">
                    {poli.name}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed mb-6">
                    {poli.description || 'Layanan konsultasi dan pengobatan terpadu bersama tim dokter spesialis berpengalaman.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Tersedia
                  </span>
                  <Link
                    href={`/doctors?poli=${poli.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-600 hover:text-sky-700 group-hover:translate-x-0.5 transition-all"
                  >
                    <span>Lihat Dokter</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info Banner */}
        <section className="mt-14 bg-gradient-to-r from-sky-500 to-[#084C61] rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-xl sm:text-2xl font-heading font-bold">
              Butuh konsultasi darurat atau bantuan pendaftaran?
            </h3>
            <p className="text-sky-100 text-sm max-w-xl">
              Tim customer care dan perawat jaga MedFlow siap membantu Anda menentukan poliklinik yang paling sesuai dengan gejala yang dialami.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/doctors"
              className="px-5 py-2.5 rounded-xl bg-white text-sky-700 font-semibold text-sm hover:bg-sky-50 transition shadow-sm"
            >
              Cari Semua Dokter
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 rounded-xl bg-sky-600/60 border border-white/20 text-white font-semibold text-sm hover:bg-sky-600 transition"
            >
              Daftar Pasien Baru
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
