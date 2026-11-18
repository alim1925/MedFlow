'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  User,
  CreditCard,
  Calendar,
  Phone,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Check
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields State
  const [formData, setFormData] = useState({
    // Step 1: Account
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    // Step 2: Personal
    nik: '',
    birth_date: '',
    gender: 'L',
    phone: '',
    address: '',
    blood_type: 'A',
    allergies: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const validateStep1 = () => {
    if (!formData.full_name.trim()) {
      setError('Nama lengkap wajib diisi.');
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Alamat email valid wajib diisi.');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Kata sandi minimal harus 8 karakter.');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return false;
    }
    setError('');
    return true;
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setError('');
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Step 2 client validations
    if (!formData.nik.trim() || formData.nik.length !== 16 || !/^\d+$/.test(formData.nik)) {
      setError('NIK wajib 16 digit angka sesuai KTP.');
      return;
    }
    if (!formData.birth_date) {
      setError('Tanggal lahir wajib diisi.');
      return;
    }
    if (!formData.phone.trim()) {
      setError('Nomor telepon/WhatsApp wajib diisi.');
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, val]) => {
        data.append(key, val);
      });

      const result = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: data,
      });

      if (result && result.success) {
        router.push('/login?registered=true');
      } else {
        setError(result?.error || 'Gagal mendaftar. NIK atau email mungkin sudah terdaftar.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('Terjadi kendala pada server saat memproses pendaftaran.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans">
      {/* Left 40%: Deep Ocean Brand Side */}
      <div className="hidden md:flex md:w-5/12 bg-gradient-to-br from-[#084C61] via-[#0b5a73] to-[#042833] text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

        {/* Decorative SVG Medical Cross */}
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
            Pendaftaran Pasien Baru
          </p>
        </div>

        {/* Center: Info */}
        <div className="relative z-10 my-8 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-sky-200 border border-white/10 backdrop-blur-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Kerahasiaan Medis Terjamin</span>
          </div>

          <h2 className="text-3xl lg:text-4xl font-heading font-bold leading-tight">
            Mulai Pengalaman Rawat Jalan yang Nyaman
          </h2>

          <p className="text-sm text-sky-100/90 leading-relaxed max-w-sm">
            Daftarkan diri Anda untuk mendapatkan Nomor Rekam Medis (No. RM) digital resmi dan nikmati kemudahan konsultasi terjadwal.
          </p>

          <div className="space-y-3.5 pt-2">
            <div className="flex items-center gap-3 text-sm text-sky-50">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>Dapatkan No. Rekam Medis unik secara otomatis</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-sky-50">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>Pilih dokter spesialis sesuai kenyamanan Anda</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-sky-50">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>Akses resep obat & catatan pemeriksaan lengkap</span>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10 text-xs text-sky-300/80 flex items-center justify-between border-t border-white/10 pt-4">
          <span>&copy; {new Date().getFullYear()} MedFlow HMIS</span>
          <span>Privasi & Keamanan Data Pasien</span>
        </div>
      </div>

      {/* Right 60%: Registration Form */}
      <div className="flex-1 bg-white flex items-center justify-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-lg">
          {/* Mobile Header */}
          <div className="md:hidden flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl bg-sky-500 flex items-center justify-center text-white">
              <Activity className="w-5 h-5" />
            </div>
            <span className="font-heading font-extrabold text-xl text-slate-800">
              MedFlow HMIS
            </span>
          </div>

          {/* Stepper Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between max-w-xs mx-auto mb-2 relative">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -translate-y-1/2 -z-0" />
              <div
                className="absolute top-1/2 left-0 h-0.5 bg-sky-500 -translate-y-1/2 transition-all duration-300 -z-0"
                style={{ width: step === 1 ? '0%' : '100%' }}
              />

              {/* Step 1 Node */}
              <div className="flex flex-col items-center relative z-10">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                    step >= 1
                      ? 'bg-sky-500 text-white ring-4 ring-sky-100'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {step > 1 ? <Check className="w-4 h-4" /> : '1'}
                </div>
                <span className="text-[11px] font-semibold text-slate-600 mt-1">Akun</span>
              </div>

              {/* Step 2 Node */}
              <div className="flex flex-col items-center relative z-10">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                    step === 2
                      ? 'bg-sky-500 text-white ring-4 ring-sky-100'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  2
                </div>
                <span className="text-[11px] font-semibold text-slate-600 mt-1">Data Diri</span>
              </div>
            </div>

            <div className="text-center mt-4">
              <h1 className="text-2xl font-heading font-bold text-slate-900">
                {step === 1 ? 'Langkah 1: Informasi Akun' : 'Langkah 2: Data Diri Pasien'}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {step === 1
                  ? 'Gunakan email aktif dan kata sandi yang kuat untuk keamanan akun'
                  : 'Data identitas diperlukan untuk pembuatan kartu rekam medis elektronik'}
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Perhatian</p>
                <p className="text-red-700 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={step === 1 ? handleNext : handleSubmit} className="space-y-4">
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Nama Lengkap Sesuai KTP *
                  </label>
                  <div className="relative">
                    <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      name="full_name"
                      required
                      value={formData.full_name}
                      onChange={handleChange}
                      placeholder="Contoh: Ahmad Fauzi"
                      className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Alamat Email Aktif *
                  </label>
                  <div className="relative">
                    <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="ahmad@email.com"
                      className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Kata Sandi (Min. 8 Karakter) *
                  </label>
                  <div className="relative">
                    <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Minimal 8 karakter"
                      className="w-full pl-11 pr-11 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Konfirmasi Kata Sandi *
                  </label>
                  <div className="relative">
                    <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Ketik ulang kata sandi"
                      className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                    />
                  </div>
                </div>

                {/* Next Step Button */}
                <button
                  type="submit"
                  className="w-full mt-4 py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Lanjut ke Data Diri</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                {/* NIK */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Nomor Induk Kependudukan (NIK) *
                  </label>
                  <div className="relative">
                    <CreditCard className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      name="nik"
                      required
                      maxLength={16}
                      value={formData.nik}
                      onChange={handleChange}
                      placeholder="16 digit NIK sesuai KTP"
                      className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono transition"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    NIK digunakan untuk verifikasi data medis tunggal Anda.
                  </p>
                </div>

                {/* Tanggal Lahir & Jenis Kelamin */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Tanggal Lahir *
                    </label>
                    <div className="relative">
                      <Calendar className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="date"
                        name="birth_date"
                        required
                        value={formData.birth_date}
                        onChange={handleChange}
                        className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Jenis Kelamin *
                    </label>
                    <div className="flex items-center gap-4 py-2.5 px-3 border border-slate-200 rounded-xl">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                        <input
                          type="radio"
                          name="gender"
                          value="L"
                          checked={formData.gender === 'L'}
                          onChange={handleChange}
                          className="text-sky-500 focus:ring-sky-400"
                        />
                        <span>Laki-laki</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                        <input
                          type="radio"
                          name="gender"
                          value="P"
                          checked={formData.gender === 'P'}
                          onChange={handleChange}
                          className="text-sky-500 focus:ring-sky-400"
                        />
                        <span>Perempuan</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Telepon */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Nomor WhatsApp / HP *
                  </label>
                  <div className="relative">
                    <Phone className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="tel"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="081234567890"
                      className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                    />
                  </div>
                </div>

                {/* Action Buttons: Back + Submit */}
                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={loading}
                    className="py-3 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Kembali</span>
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Mendaftarkan Pasien...</span>
                      </>
                    ) : (
                      <>
                        <span>Selesaikan Pendaftaran</span>
                        <Check className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Login Link */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-600">
              Sudah memiliki akun terdaftar?{' '}
              <Link
                href="/login"
                className="font-semibold text-sky-600 hover:text-sky-700 transition underline underline-offset-4"
              >
                Masuk di sini
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
