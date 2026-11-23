'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Activity,
  ArrowLeft,
  Download,
  Lock,
  Pill,
  Printer,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import {
  calculateAgeText,
  downloadMedicalRecordPdf,
  formatDateIndo,
  formatDateTimeIndo,
  getPrescriptionStatusLabel,
  normalizeRecordForDocument,
} from '@/lib/medicalRecordPdf';

export default function ConsultationProofDocument({ record, userRole = 'PATIENT' }) {
  const router = useRouter();
  const doc = normalizeRecordForDocument(record);

  if (!doc) return null;

  const docCode = `RME-${String(doc.id || '').slice(0, 8).toUpperCase()}`;
  const fallbackHref =
    userRole === 'DOCTOR' ? '/doctor/examinations' : '/patient/records';

  const genderLabel =
    doc.patient_gender === 'L' || doc.patient_gender === 'M'
      ? 'Laki-laki'
      : doc.patient_gender === 'P' || doc.patient_gender === 'F'
        ? 'Perempuan'
        : '-';

  const rxItems = doc.prescription?.items || [];

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 sm:px-6 print:bg-white print:p-0 font-sans">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          body {
            background: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      {/* Non-printable Action Bar */}
      <div className="max-w-[210mm] mx-auto mb-5 flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>
          <Link
            href={fallbackHref}
            className="hidden sm:inline text-xs text-slate-500 hover:text-sky-600 transition"
          >
            {userRole === 'DOCTOR' ? 'Daftar Pemeriksaan' : 'Semua Rekam Medis'}
          </Link>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => downloadMedicalRecordPdf(doc)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Unduh PDF</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#084C61] hover:bg-[#063a4b] text-white text-xs sm:text-sm font-semibold shadow-sm transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Simpan PDF</span>
          </button>
        </div>
      </div>

      {/* A4 Printable Document Sheet */}
      <article className="max-w-[210mm] mx-auto bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden print:rounded-none print:border-0 print:shadow-none">
        {/* Top Letterhead */}
        <header className="bg-gradient-to-r from-[#084C61] to-[#0E7490] text-white px-7 py-6 border-b-4 border-sky-400">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-heading text-xl font-extrabold tracking-tight text-white">
                  MEDFLOW HMIS
                </h1>
                <p className="text-xs text-sky-100">
                  Sistem Informasi Manajemen Rumah Sakit Terpadu
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-200 mt-1">
                  Lembar Hasil Rekam Medis & Rincian Resep Obat
                </p>
              </div>
            </div>

            <div className="sm:text-right space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-white">
                Bukti Konsultasi Resmi
              </p>
              <p className="font-mono text-xs text-sky-100">No. Dokumen: {docCode}</p>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-300/40 text-[10px] font-bold text-emerald-100">
                <Lock className="w-3 h-3" />
                TERKUNCI PERMANEN
              </span>
            </div>
          </div>
        </header>

        <div className="p-6 sm:p-7 space-y-6 text-xs text-slate-700">
          {/* 2-Column Identity & Consultation Details */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
              <h2 className="text-[11px] font-heading font-bold uppercase tracking-wider text-[#084C61] border-b border-slate-200 pb-1.5">
                Identitas Pasien
              </h2>
              <dl className="space-y-1.5">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Nama Pasien</dt>
                  <dd className="font-bold text-slate-900 text-right">{doc.patient_name}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">No. Rekam Medis</dt>
                  <dd className="font-mono font-bold text-slate-900 text-right">
                    {doc.medical_record_no}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Tgl. Lahir / Usia</dt>
                  <dd className="font-semibold text-slate-800 text-right">
                    {doc.patient_birth_date
                      ? `${formatDateIndo(doc.patient_birth_date)} (${calculateAgeText(doc.patient_birth_date)})`
                      : '-'}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Jenis Kelamin / Gol. Darah</dt>
                  <dd className="font-semibold text-slate-800 text-right">
                    {genderLabel} / {doc.patient_blood_type || '-'}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">No. Telepon</dt>
                  <dd className="font-semibold text-slate-800 text-right">
                    {doc.patient_phone || '-'}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Riwayat Alergi</dt>
                  <dd className="font-semibold text-red-700 text-right">
                    {doc.patient_allergies || 'Tidak ada laporan alergi'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
              <h2 className="text-[11px] font-heading font-bold uppercase tracking-wider text-[#084C61] border-b border-slate-200 pb-1.5">
                Informasi Konsultasi
              </h2>
              <dl className="space-y-1.5">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Poliklinik</dt>
                  <dd className="font-bold text-slate-900 text-right">{doc.poli_name}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Dokter Pemeriksa</dt>
                  <dd className="font-bold text-slate-900 text-right">{doc.doctor_name}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Nomor STR</dt>
                  <dd className="font-mono font-semibold text-slate-800 text-right">
                    {doc.doctor_str_number || '-'}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Tanggal Konsultasi</dt>
                  <dd className="font-semibold text-slate-800 text-right">
                    {formatDateIndo(doc.appointment_date)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Jadwal / Antrean</dt>
                  <dd className="font-semibold text-slate-800 text-right">
                    {doc.slot_start ? `${String(doc.slot_start).slice(0, 5)} WIB` : '-'}
                    {doc.queue_no ? ` (Antrean #${doc.queue_no})` : ''}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Dicatat / Dikunci</dt>
                  <dd className="font-semibold text-slate-800 text-right">
                    {formatDateTimeIndo(doc.locked_at)}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          {/* Vital Signs */}
          <section className="space-y-2.5">
            <h2 className="text-[11px] font-heading font-bold uppercase tracking-wider text-[#084C61] border-l-4 border-sky-500 pl-2.5">
              Tanda-Tanda Vital (Vital Signs)
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 text-center">
              {[
                ['Tekanan Darah', `${doc.vital_signs.blood_pressure} mmHg`],
                ['Denyut Nadi', `${doc.vital_signs.pulse} bpm`],
                ['Suhu Tubuh', `${doc.vital_signs.temperature} °C`],
                ['Berat Badan', `${doc.vital_signs.weight} kg`],
                ['Tinggi Badan', `${doc.vital_signs.height} cm`],
                ['SpO2', `${doc.vital_signs.oxygen_saturation} %`],
              ].map(([label, val]) => (
                <div
                  key={label}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-2.5"
                >
                  <span className="block text-[10px] font-medium text-slate-500">{label}</span>
                  <span className="mt-0.5 block font-bold text-slate-900">{val}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Clinical Examination Results */}
          <section className="space-y-3">
            <h2 className="text-[11px] font-heading font-bold uppercase tracking-wider text-[#084C61] border-l-4 border-sky-500 pl-2.5">
              Hasil Pemeriksaan Klinis
            </h2>

            <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 block">
                  Diagnosis Medis Utama
                </span>
                <p className="text-sm sm:text-base font-heading font-bold text-slate-900 mt-0.5">
                  {doc.diagnosis}
                </p>
              </div>
              {doc.icd10_code && doc.icd10_code !== '-' && (
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-white border border-sky-200 text-sky-800 w-fit">
                  ICD-10: {doc.icd10_code}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-xl border border-slate-200 p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Keluhan Awal Pasien
                </span>
                <p className="text-slate-800 leading-relaxed">{doc.complaint}</p>
              </div>

              <div className="rounded-xl border border-slate-200 p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Tindakan & Terapi Medis
                </span>
                <p className="text-slate-800 leading-relaxed">{doc.treatment}</p>
              </div>

              {doc.notes && (
                <div className="rounded-xl border border-slate-200 p-3.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Catatan Tambahan Dokter
                  </span>
                  <p className="text-slate-700 leading-relaxed">{doc.notes}</p>
                </div>
              )}
            </div>
          </section>

          {/* Prescription Details */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[11px] font-heading font-bold uppercase tracking-wider text-[#084C61] border-l-4 border-sky-500 pl-2.5 flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 text-purple-600" />
                <span>Rincian Resep Obat (E-Prescription)</span>
              </h2>
              {doc.prescription && (
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="font-mono font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-md">
                    #{String(doc.prescription.id || '').slice(0, 8).toUpperCase()}
                  </span>
                  <span className="font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md">
                    Status: {getPrescriptionStatusLabel(doc.prescription.status)}
                  </span>
                </div>
              )}
            </div>

            {!doc.prescription || rxItems.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-500">
                Tidak ada peresepan obat pada sesi konsultasi ini.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#084C61] text-white text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 w-10">No</th>
                        <th className="py-2.5 px-3">Nama Obat & Sediaan</th>
                        <th className="py-2.5 px-3 text-center">Jumlah</th>
                        <th className="py-2.5 px-3">Aturan Pakai</th>
                        <th className="py-2.5 px-3 text-center">Durasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {rxItems.map((it, idx) => (
                        <tr key={it.id || idx} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                          <td className="py-2.5 px-3 font-medium text-slate-600">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-900 block">
                              {it.medicine_name || it.name || 'Obat'}
                            </span>
                            {(it.medicine_code || it.form) && (
                              <span className="text-[10px] text-slate-500">
                                {[it.medicine_code, it.form].filter(Boolean).join(' • ')}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-900 whitespace-nowrap">
                            {it.quantity} {it.unit || 'unit'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">{it.dosage_rule || '-'}</td>
                          <td className="py-2.5 px-3 text-center text-slate-600 whitespace-nowrap">
                            {it.duration_days ? `${it.duration_days} hari` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {doc.prescription.notes && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700">
                    <strong className="font-semibold">Catatan Farmasi / Resep: </strong>
                    {doc.prescription.notes}
                  </div>
                )}
              </>
            )}
          </section>

          {/* Addenda */}
          {doc.addenda.length > 0 && (
            <section className="space-y-2.5">
              <h2 className="text-[11px] font-heading font-bold uppercase tracking-wider text-amber-800 border-l-4 border-amber-500 pl-2.5 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>Riwayat Adendum Medis ({doc.addenda.length})</span>
              </h2>
              <div className="space-y-2">
                {doc.addenda.map((ad, idx) => (
                  <div
                    key={ad.id || idx}
                    className="rounded-xl border border-amber-200 bg-amber-50/70 p-3"
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold text-amber-900 mb-1">
                      <span>Oleh: {ad.doctor_name || doc.doctor_name}</span>
                      <span className="font-mono text-slate-500">
                        {formatDateTimeIndo(ad.created_at)}
                      </span>
                    </div>
                    <p className="text-slate-800 leading-relaxed">{ad.note || ad.notes}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Verification Footer */}
          <footer className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Pengesahan Dokumen Konsultasi Digital</span>
              </div>
              <p className="text-[11px] text-slate-700">
                Rekam medis dikunci permanen pada {formatDateTimeIndo(doc.locked_at)}.
              </p>
              <p className="text-[10px] text-slate-500">
                Dokumen ini dihasilkan secara elektronik melalui MedFlow HMIS dan sah sebagai bukti konsultasi.
              </p>
            </div>

            <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-emerald-200">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Dokter Penanggung Jawab
              </p>
              <p className="font-heading font-bold text-sm text-slate-900 mt-1">
                {doc.doctor_name}
              </p>
              <p className="font-mono text-[11px] text-slate-600">
                No. STR: {doc.doctor_str_number || '-'}
              </p>
            </div>
          </footer>
        </div>
      </article>
    </div>
  );
}
