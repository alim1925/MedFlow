import { getAuditLogs } from '@/services/adminService';
import { getCurrentUser } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import AuditLogsClient from './AuditLogsClient';
import { Shield, Lock, Info, FileText } from 'lucide-react';

export const metadata = {
  title: 'Audit Log Sistem',
  description: 'Catatan audit jejak aktivitas sistem dan keamanan data MedFlow HMIS.',
};

export default async function AdminAuditLogsPage() {
  let user = null;
  let logs = [];

  try {
    user = await getCurrentUser();
    const res = await getAuditLogs(200);
    if (res?.success && Array.isArray(res.data)) logs = res.data;
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    logs = [];
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans md:flex-row">
      <Sidebar
        role="ADMIN"
        userName="Administrator"
        userEmail={user?.email || 'admin@medflow.com'}
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              <Shield className="w-4 h-4 text-sky-600" />
              <span>Sistem Kepatuhan & Keamanan Informasi</span>
            </div>
            <h1 className="text-2xl font-heading font-extrabold text-slate-900">
              Audit Log Aktivitas Sistem
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Jejak audit permanen tidak dapat diubah (append-only) untuk memantau integritas data medis dan akses akun
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 w-fit">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span>Append-Only Immutable Log</span>
          </div>
        </div>

        {/* Info Notice Banner */}
        <div className="bg-sky-500/10 border border-sky-200 rounded-2xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-sky-900 leading-relaxed">
            <span className="font-bold">Ketentuan Jejak Audit: </span>
            Semua aktivitas masuk akun (login), pendaftaran pasien, modifikasi data rekam medis, dan peracikan obat di apotek direkam secara otomatis lengkap dengan waktu stempel waktu ISO, alamat IP, dan metadata mutasi data.
          </div>
        </div>

        {/* Interactive Client Table */}
        <AuditLogsClient initialLogs={logs} />
      </main>
    </div>
  );
}
