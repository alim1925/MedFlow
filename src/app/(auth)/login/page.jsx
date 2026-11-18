'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '@/lib/apiClient';
import {
  Activity,
  CheckCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

const ROLE_PREFIXES = {
  ADMIN: '/admin',
  DOCTOR: '/doctor',
  PATIENT: '/patient',
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRegistered = searchParams.get('registered') === 'true';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const performLogin = async (formData) => {
    setError('');
    setLoading(true);

    try {
      const result = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: formData,
      });

      if (result && result.success) {
        const roleRoutes = {
          ADMIN: '/admin/dashboard',
          DOCTOR: '/doctor/dashboard',
          PATIENT: '/patient/dashboard',
        };
        const roleRoute = roleRoutes[result.role];
        const rolePrefix = ROLE_PREFIXES[result.role];
        if (!roleRoute) {
          setError('Peran akun tidak dikenali. Silakan hubungi administrator.');
          return;
        }

        const requestedRoute = searchParams.get('redirect');
        const destination =
          requestedRoute && rolePrefix && requestedRoute.startsWith(rolePrefix)
            ? requestedRoute
            : roleRoute;

        router.replace(destination);
      } else {
        setError(result?.error || 'Email atau kata sandi tidak valid. Silakan coba lagi.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Terjadi kesalahan koneksi. Silakan periksa kembali server Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.set('email', email);
    formData.set('password', password);
    await performLogin(formData);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans">
      {/* Left 40%: Deep Ocean Brand Side */}
      <div className="hidden md:flex md:w-5/12 bg-gradient-to-br from-[#084C61] via-[#0b5a73] to-[#042833] text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Subtle Decorative Grid Pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

        {/* Decorative Medical Cross Icon */}
        <div className="absolute -bottom-16 -right-16 text-white/5 pointer-events-none">
          <svg width="340" height="340" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 10.5h-5.5V5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v5.5H5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h5.5V19c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-5.5H19c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z" />
          </svg>
        </div>

        {/* Top: Logo */}
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

        {/* Center: Hero Value Proposition */}
        <div className="relative z-10 my-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-sky-200 border border-white/10 backdrop-blur-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Satu Sistem, Layanan Tanpa Batas</span>
          </div>

          <h2 className="text-3xl lg:text-4xl font-heading font-bold leading-tight text-white">
            Pelayanan Medis Terintegrasi & Modern
          </h2>

          <p className="text-sm text-sky-100/90 leading-relaxed max-w-sm">
            Akses rekam medis, antrean dokter spesialis, dan riwayat resep obat Anda kapan saja dalam satu platform terpercaya.
          </p>

          {/* Feature List with Check Circles */}
          <div className="space-y-3.5 pt-2">
            <div className="flex items-center gap-3 text-sm text-sky-50">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>Booking jadwal dokter tanpa antre fisik</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-sky-50">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>Rekam medis digital terlindungi enkripsi</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-sky-50">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>Monitoring status resep apotek real-time</span>
            </div>
          </div>
        </div>

        {/* Bottom: Footer Info */}
        <div className="relative z-10 text-xs text-sky-300/80 flex items-center justify-between border-t border-white/10 pt-4">
          <span>&copy; {new Date().getFullYear()} MedFlow Healthcare</span>
          <span className="font-mono text-[11px]">v1.0 Production</span>
        </div>
      </div>

      {/* Right 60%: Form Card */}
      <div className="flex-1 bg-white flex items-center justify-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-md">
          {/* Mobile Logo Header */}
          <div className="md:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-sky-500 flex items-center justify-center text-white shadow-sm">
              <Activity className="w-5 h-5" />
            </div>
            <span className="font-heading font-extrabold text-xl text-slate-800">
              MedFlow HMIS
            </span>
          </div>

          {/* Form Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900 tracking-tight">
              Masuk ke MedFlow
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Silakan masukkan kredensial akun Anda untuk melanjutkan.
            </p>
          </div>

          {/* Success Banner if redirected from registration */}
          {isRegistered && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start gap-3 animate-fade-in">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Pendaftaran Akun Berhasil!</p>
                <p className="text-emerald-700 mt-0.5">
                  Akun Anda siap digunakan. Silakan masuk menggunakan email dan kata sandi yang telah Anda daftarkan.
                </p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Gagal Masuk</p>
                <p className="text-red-700 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  name="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Kata Sandi
                </label>
                <span className="text-xs text-sky-600 hover:text-sky-700 cursor-pointer">
                  Lupa sandi?
                </span>
              </div>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 select-none">
                <input
                  type="checkbox"
                  name="rememberMe"
                  className="w-4 h-4 rounded text-sky-500 focus:ring-sky-400 border-slate-300"
                />
                <span>Ingat saya di perangkat ini</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Memverifikasi Akun...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Akun</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Continue as Guest Link */}
          <div className="mt-6">
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-slate-400 font-medium">atau</span>
              </div>
            </div>

            <Link
              href="/"
              className="w-full py-3 px-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-sky-50 hover:border-sky-300 text-slate-700 hover:text-sky-700 font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              <span>Lanjutkan sebagai Tamu</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-[11px] text-slate-400 text-center mt-2">
              Jelajahi layanan poliklinik, profil dokter, dan jadwal praktik tanpa login.
            </p>
          </div>

          {/* Registration Redirect Link */}
          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-600">
              Belum punya akun pasien?{' '}
              <Link
                href="/register"
                className="font-semibold text-sky-600 hover:text-sky-700 transition underline underline-offset-4"
              >
                Daftar sekarang di sini
              </Link>
            </p>
          </div>

          {/* Help Info */}
          <div className="mt-6 text-center">
            <Link href="/" className="text-xs text-slate-400 hover:text-slate-600 transition">
              &larr; Kembali ke Beranda MedFlow
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
