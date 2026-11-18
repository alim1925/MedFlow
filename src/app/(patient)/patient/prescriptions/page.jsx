import { getMyPrescriptions } from '@/services/patientService';
import StatusBadge from '@/components/StatusBadge';
import {
  Pill,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  ShoppingBag,
  Info,
} from 'lucide-react';

export const metadata = {
  title: 'Resep Obat Pasien',
  description: 'Daftar resep obat digital dan status penyiapan farmasi di MedFlow HMIS.',
};

function formatDateIndo(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateTimeIndo(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default async function PatientPrescriptionsPage() {
  let prescriptions = [];

  try {
    const res = await getMyPrescriptions();
    if (res?.success && Array.isArray(res.data)) prescriptions = res.data;
  } catch (err) {
    console.error('Error fetching prescriptions:', err);
    prescriptions = [];
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-600 uppercase tracking-wider mb-1">
            <Pill className="w-4 h-4" />
            <span>Instalasi Farmasi</span>
          </div>
          <h1 className="text-2xl font-heading font-extrabold text-slate-900">
            Resep & Obat-Obatan
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pantau peracikan obat oleh instalasi farmasi MedFlow dan aturan pakainya secara real-time.
          </p>
        </div>

        <span className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-100 text-purple-700 text-xs font-semibold w-fit">
          {prescriptions.length} Resep Tercatat
        </span>
      </div>

      {/* Prescription List */}
      {prescriptions.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center mx-auto mb-3">
            <Pill className="w-8 h-8" />
          </div>
          <h3 className="text-base font-heading font-bold text-slate-800 mb-1">
            Belum Ada Resep Obat
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Resep obat digital akan muncul secara otomatis di halaman ini setelah dokter selesai meresepkannya pada sesi konsultasi Anda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {prescriptions.map((rx) => {
            const items = rx.items || [];
            const isReady = rx.status === 'READY';
            const isPickedUp = rx.status === 'PICKED_UP';
            const isCancelled = rx.status === 'CANCELLED';

            return (
              <div
                key={rx.id}
                className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Top: Prescription ID, Date & Status */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md">
                          #{rx.id?.substring(0, 8).toUpperCase() || 'RSP'}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatDateIndo(rx.created_at)}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 mt-1.5 flex items-center gap-1.5">
                        <Stethoscope className="w-3.5 h-3.5 text-sky-600" />
                        <span>{rx.doctor_name || 'dr. Spesialis Pemeriksa'}</span>
                        {rx.poli_name && (
                          <span className="text-slate-400 font-normal">• {rx.poli_name}</span>
                        )}
                      </p>
                    </div>

                    <StatusBadge status={rx.status} size="sm" />
                  </div>

                  {/* Special Status Notices */}
                  {isReady && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      <div>
                        <p className="font-bold">Obat Anda Siap Diambil!</p>
                        <p className="text-emerald-700 mt-0.5">
                          Silakan menuju ke loket penyerahan obat di Apotek MedFlow (Lantai 1) dengan menyebutkan nama atau menunjukkan No. RM Anda.
                        </p>
                      </div>
                    </div>
                  )}

                  {isPickedUp && (
                    <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-purple-600 flex-shrink-0" />
                      <span>
                        Telah diambil pada{' '}
                        <strong className="font-semibold">
                          {formatDateTimeIndo(rx.picked_up_at || rx.updated_at)}
                        </strong>
                      </span>
                    </div>
                  )}

                  {isCancelled && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <span>Resep ini telah dibatalkan oleh pihak instalasi farmasi.</span>
                    </div>
                  )}

                  {/* Medicine Items Table */}
                  <div>
                    <h2 className="text-[11px] font-heading font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Pill className="w-3.5 h-3.5 text-purple-500" />
                      <span>Rincian Obat & Aturan Pakai</span>
                    </h2>

                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-100">
                          <tr>
                            <th className="py-2.5 px-3">Nama Obat</th>
                            <th className="py-2.5 px-2 text-center">Jumlah</th>
                            <th className="py-2.5 px-3">Aturan Pakai</th>
                            <th className="py-2.5 px-2 text-center">Durasi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {items.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-4 text-center text-slate-400">
                                Rincian item obat sedang dikonfirmasi.
                              </td>
                            </tr>
                          ) : (
                            items.map((it, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="py-2.5 px-3 font-semibold text-slate-800">
                                  {it.medicine_name || it.name || 'Obat Generik'}
                                  {it.dosage_form && (
                                    <span className="block text-[10px] text-slate-400 font-normal">
                                      {it.dosage_form}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-2 text-center font-bold text-slate-900 whitespace-nowrap">
                                  {it.quantity} {it.unit || 'tab'}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600">
                                  {it.dosage_rule || '1x sehari sesudah makan'}
                                </td>
                                <td className="py-2.5 px-2 text-center text-slate-500 whitespace-nowrap">
                                  {it.duration_days ? `${it.duration_days} hari` : '-'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Notes / Special Instructions */}
                {rx.notes && (
                  <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-600 flex items-start gap-2 border border-slate-100">
                    <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                    <p>
                      <strong className="font-semibold text-slate-700">Catatan Apoteker: </strong>
                      {rx.notes}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
