'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '@/lib/apiClient';
import { AuthBrandSidebar, AuthMobileHeader } from '@/components/AuthBrandPanel';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldCheck,
} from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [tokenError, setTokenError] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;

    async function verifyToken() {
      if (!token.trim()) {
        if (active) {
          setTokenValid(false);
          setTokenError('Tautan reset kata sandi tidak memiliki token yang valid.');
          setVerifying(false);
        }
        return;
      }

      setVerifying(true);
      setTokenError('');

      try {
        const res = await apiRequest(
          `/api/auth/reset-password?token=${encodeURIComponent(token.trim())}`
        );

        if (!active) return;

        if (res?.success && res.data) {
          setTokenValid(true);
          setMaskedEmail(res.data.maskedEmail || '');
        } else {
          setTokenValid(false);
          setTokenError(
            res?.error || 'Tautan reset kata sandi tidak valid atau sudah kedaluwarsa.'
          );
        }
      } catch {
        if (!active) return;
        setTokenValid(false);
        setTokenError('Gagal menghubungi server untuk memverifikasi tautan.');
      } finally {
        if (active) setVerifying(false);
      }
    }

    verifyToken();
    return () => {
      active = false;
    };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (password.length < 8) {
      setSubmitError('Kata sandi baru minimal harus 8 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: {
          token: token.trim(),
          password,
          confirmPassword,
        },
      });

      if (res?.success) {
        setSuccess(true);
        router.replace('/login?reset=true');
      } else {
        setSubmitError(res?.error || 'Gagal memperbarui kata sandi. Silakan coba lagi.');
      }
    } catch (err) {
      console.error('Reset password error:', err);
      setSubmitError('Terjadi kesalahan koneksi saat menyimpan kata sandi baru.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans">
      <AuthBrandSidebar
        badgeText="Keamanan Kredensial MedFlow"
        title="Buat Kata Sandi Baru yang Kuat"
        description="Lindungi akun dan data layanan medis Anda dengan kombinasi kata sandi baru minimal 8 karakter."
        features={[
          'Enkripsi bcrypt berkekuatan tinggi di server',
          'Token otomatis hangus setelah digunakan',
          'Langsung dapat digunakan untuk masuk kembali',
        ]}
      />

      <div className="flex-1 bg-white flex items-center justify-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-md">
          <AuthMobileHeader />

          <div className="mb-8">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900 tracking-tight">
              Atur Ulang Kata Sandi
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              {maskedEmail
                ? `Masukkan kata sandi baru untuk akun ${maskedEmail}.`
                : 'Masukkan kata sandi baru untuk mengamankan kembali akun Anda.'}
            </p>
          </div>

          {verifying ? (
            <div className="p-8 rounded-2xl border border-slate-100 bg-slate-50/70 flex flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="w-7 h-7 text-sky-500 animate-spin" />
              <p className="text-sm font-medium text-slate-600">
                Memverifikasi tautan reset kata sandi...
              </p>
            </div>
          ) : !tokenValid ? (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Tautan Tidak Valid</p>
                  <p className="text-red-700 mt-1 leading-relaxed">{tokenError}</p>
                </div>
              </div>

              <Link
                href="/forgot-password"
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-semibold text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                <span>Minta Tautan Reset Baru</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : success ? (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Kata Sandi Berhasil Diperbarui!</p>
                  <p className="text-emerald-700 mt-1">
                    Mengalihkan Anda ke halaman masuk...
                  </p>
                </div>
              </div>

              <Link
                href="/login?reset=true"
                className="w-full py-3.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm transition flex items-center justify-center gap-2"
              >
                <span>Masuk Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <>
              {submitError && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Gagal Memperbarui</p>
                    <p className="text-red-700 mt-0.5">{submitError}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                    Kata Sandi Baru (Min. 8 Karakter)
                  </label>
                  <div className="relative">
                    <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimal 8 karakter"
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

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                    Konfirmasi Kata Sandi Baru
                  </label>
                  <div className="relative">
                    <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ketik ulang kata sandi baru"
                      className="w-full pl-11 pr-11 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                      aria-label={
                        showConfirmPassword
                          ? 'Sembunyikan konfirmasi kata sandi'
                          : 'Tampilkan konfirmasi kata sandi'
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Menyimpan Kata Sandi...</span>
                    </>
                  ) : (
                    <>
                      <span>Simpan Kata Sandi Baru</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
