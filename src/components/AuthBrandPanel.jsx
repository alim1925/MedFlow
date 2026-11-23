import Link from 'next/link';
import { Activity, CheckCircle, ShieldCheck } from 'lucide-react';

export function AuthBrandSidebar({
  badgeText = 'Satu Sistem, Layanan Tanpa Batas',
  title = 'Pelayanan Medis Terintegrasi & Modern',
  description = 'Akses rekam medis, antrean dokter spesialis, dan riwayat resep obat Anda kapan saja dalam satu platform terpercaya.',
  features = [
    'Booking jadwal dokter tanpa antre fisik',
    'Rekam medis digital terlindungi enkripsi',
    'Monitoring status resep apotek real-time',
  ],
}) {
  return (
    <div className="hidden md:flex md:w-5/12 bg-gradient-to-br from-[#084C61] via-[#0b5a73] to-[#042833] text-white p-12 flex-col justify-between relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

      <div className="absolute -bottom-16 -right-16 text-white/5 pointer-events-none">
        <svg width="340" height="340" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 10.5h-5.5V5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v5.5H5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h5.5V19c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-5.5H19c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z" />
        </svg>
      </div>

      <div className="relative z-10">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-sky-400 flex items-center justify-center text-slate-900 shadow-lg group-hover:scale-105 transition-transform">
            <Activity className="w-6 h-6 text-slate-900" />
          </div>
          <span className="font-heading font-extrabold text-2xl tracking-tight text-white">
            MedFlow
          </span>
        </Link>
        <p className="text-xs text-sky-200 mt-1 uppercase tracking-widest font-semibold">
          Hospital Management Information System
        </p>
      </div>

      <div className="relative z-10 my-10 space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-sky-200 border border-white/10 backdrop-blur-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>{badgeText}</span>
        </div>

        <h2 className="text-3xl lg:text-4xl font-heading font-bold leading-tight text-white">
          {title}
        </h2>

        <p className="text-sm text-sky-100/90 leading-relaxed max-w-sm">
          {description}
        </p>

        <div className="space-y-3.5 pt-2">
          {features.map((feature) => (
            <div key={feature} className="flex items-center gap-3 text-sm text-sky-50">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 text-xs text-sky-300/80 flex items-center justify-between border-t border-white/10 pt-4">
        <span>&copy; {new Date().getFullYear()} MedFlow Healthcare</span>
        <span className="font-mono text-[11px]">v1.0 Production</span>
      </div>
    </div>
  );
}

export function AuthMobileHeader() {
  return (
    <div className="md:hidden flex items-center gap-2 mb-8">
      <Link href="/" className="inline-flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-sky-500 flex items-center justify-center text-white shadow-sm">
          <Activity className="w-5 h-5" />
        </div>
        <span className="font-heading font-extrabold text-xl text-slate-800">
          MedFlow HMIS
        </span>
      </Link>
    </div>
  );
}
