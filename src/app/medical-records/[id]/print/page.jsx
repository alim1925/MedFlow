import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getMedicalRecordDocument } from '@/services/medicalRecordDocumentService';
import ConsultationProofDocument from '@/components/ConsultationProofDocument';
import { AlertCircle } from 'lucide-react';

export const metadata = {
  title: 'Bukti Konsultasi & Rekam Medis PDF',
  description: 'Lembar hasil rekam medis dan rincian resep obat resmi MedFlow HMIS.',
};

export default async function MedicalRecordPrintPage({ params }) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/medical-records/${id}/print`)}`);
  }

  const res = await getMedicalRecordDocument(id);

  if (!res?.success || !res.data) {
    const backHref =
      user.role === 'DOCTOR'
        ? '/doctor/examinations'
        : user.role === 'ADMIN'
          ? '/admin/appointments'
          : '/patient/records';

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-heading font-bold text-slate-900">
              Dokumen Tidak Dapat Dibuka
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              {res?.error || 'Dokumen rekam medis tidak ditemukan atau Anda tidak memiliki akses.'}
            </p>
          </div>
          <Link
            href={backHref}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-semibold transition"
          >
            Kembali ke Portal
          </Link>
        </div>
      </div>
    );
  }

  return <ConsultationProofDocument record={res.data} userRole={user.role} />;
}
