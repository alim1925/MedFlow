'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '@/lib/apiClient';
import { AuthBrandSidebar, AuthMobileHeader } from '@/components/AuthBrandPanel';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
  Copy,
  KeyRound,
  Loader2,
  Mail,
} from 'lucide-react';

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(() => searchParams.get('email') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setCopied(false);

    try {
      const response = await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: { email },
      });

      if (response && response.success) {
        setResult(response);
      } else {
        setError(response?.error || 'Gagal memproses permintaan reset kata sandi.');
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      setError('Terjadi kesalahan koneksi. Silakan periksa kembali server Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!result?.devResetPath || typeof window === 'undefined') return;
    try {
      const fullUrl = `${window.location.origin}${result.devResetPath}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans">
      <AuthBrandSidebar
        badgeText="Pemulihan Akses Akun Aman"
        title="Atur Ulang Kata Sandi Anda dengan Mudah"
        description="Masukkan alamat email akun MedFlow Anda (Pasien, Dokter, atau Admin) untuk membuat tautan pengaturan ulang kata sandi."
        features={[
          'Tautan reset terenkripsi dan berlaku 30 menit',
          'Hanya dapat digunakan satu kali demi keamanan',
          'Aktivitas pemulihan tercatat pada audit log',
        ]}
      />

      <div className="flex-1 bg-white flex items-center justify-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-md">
          <AuthMobileHeader />

          <div className="mb-8">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 mb-4">
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900 tracking-tight">
              Lupa Kata Sandi
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Masukkan email yang terdaftar pada akun Anda untuk membuat tautan reset kata sandi.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Permintaan Gagal</p>
                <p className="text-red-700 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {result ? (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Permintaan Diproses</p>
                  <p className="text-emerald-700 mt-1 leading-relaxed">{result.message}</p>
                </div>
              </div>

              {result.devResetPath ? (
                <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-sky-800">
                      Mode Pengembangan — Tautan Reset Siap
                    </p>
                    <p className="text-xs text-sky-700 mt-1">
                      Layanan email SMTP belum dikonfigurasi pada server lokal, sehingga tautan reset ditampilkan langsung untuk pengujian.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <Link
                      href={result.devResetPath}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-2"
                    >
                      <span>Atur Ulang Sandi Sekarang</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>

                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="py-2.5 px-3.5 rounded-xl border border-sky-300 bg-white hover:bg-sky-100/60 text-sky-700 font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? 'Tersalin' : 'Salin Link'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                  Pastikan email yang Anda masukkan benar dan status akun masih aktif. Jika belum menerima tautan, periksa kembali penulisan email Anda.
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setError('');
                }}
                className="w-full py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition cursor-pointer"
              >
                Gunakan Email Lain
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                  Alamat Email Terdaftar
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Memproses Permintaan...</span>
                  </>
                ) : (
                  <>
                    <span>Buat Tautan Reset Sandi</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-600 hover:text-sky-700 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Halaman Masuk</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
        </div>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}
