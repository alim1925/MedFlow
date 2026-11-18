import { getMyMedicalRecords } from '@/services/patientService';
import RecordsList from './RecordsList';
import { FileX, Lock, FileText } from 'lucide-react';

export const metadata = {
  title: 'Rekam Medis Saya',
  description: 'Riwayat diagnosis klinis, tanda-tanda vital, dan catatan dokter terverifikasi.',
};

export default async function PatientRecordsPage() {
  let records = [];

  try {
    const res = await getMyMedicalRecords();
    if (res?.success && Array.isArray(res.data)) records = res.data;
  } catch (err) {
    console.error('Error fetching medical records:', err);
    records = [];
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-600 uppercase tracking-wider mb-1">
            <FileText className="w-4 h-4" />
            <span>Riwayat Klinis Resmi</span>
          </div>
          <h1 className="text-2xl font-heading font-extrabold text-slate-900">
            Rekam Medis Elektronik (RME)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Data riwayat kesehatan dan hasil pemeriksaan resmi terenkripsi sesuai standar Kemenkes RI.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 w-fit">
          <Lock className="w-4 h-4 text-emerald-600" />
          <span>{records.length} Catatan Medis</span>
        </div>
      </div>

      {/* Security & Immutability Notice Banner */}
      <div className="bg-sky-500/10 border border-sky-200 rounded-2xl p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center flex-shrink-0">
          <Lock className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-xs font-heading font-bold text-sky-900">
            Integritas Data Medis Terproteksi
          </h2>
          <p className="text-xs text-sky-800 mt-0.5 leading-relaxed">
            Sesuai regulasi rekam medis permanen, catatan diagnosa yang telah disimpan oleh dokter tidak dapat diubah atau dihapus. Setiap revisi dicatat sebagai adendum kronologis resmi.
          </p>
        </div>
      </div>

      {/* Records Content */}
      {records.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <FileX className="w-8 h-8" />
          </div>
          <h3 className="text-base font-heading font-bold text-slate-800 mb-1">
            Belum Ada Rekam Medis
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Catatan hasil diagnosa, tindakan, dan resep obat Anda akan tercatat di sini setelah Anda menyelesaikan konsultasi dengan dokter.
          </p>
        </div>
      ) : (
        <RecordsList records={records} />
      )}
    </div>
  );
}
