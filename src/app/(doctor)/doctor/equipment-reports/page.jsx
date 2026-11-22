import Sidebar from '@/components/Sidebar';
import { getCurrentUser } from '@/lib/auth';
import { getDoctorProfile } from '@/services/doctorService';
import { getMyEquipmentReports } from '@/services/doctorEquipmentService';
import EquipmentReportsClient from './EquipmentReportsClient';

export const metadata = {
  title: 'Lapor Alat Rusak',
  description: 'Pelaporan kerusakan peralatan medis oleh dokter ke bagian pemeliharaan MedFlow.',
};

export default async function DoctorEquipmentReportsPage() {
  const [user, profileRes, reportsRes] = await Promise.all([
    getCurrentUser(),
    getDoctorProfile(),
    getMyEquipmentReports(),
  ]);

  const doctor = profileRes?.success ? profileRes.data : null;
  const reports = reportsRes?.success && Array.isArray(reportsRes.data) ? reportsRes.data : [];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans md:flex-row">
      <Sidebar
        role="DOCTOR"
        userName={doctor?.full_name || user?.name || 'dr. Spesialis'}
        userEmail={doctor?.email || user?.email || 'dokter@medflow.com'}
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
        {!reportsRes?.success && (
          <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {reportsRes?.error || 'Daftar laporan alat rusak gagal dimuat.'}
          </p>
        )}

        <EquipmentReportsClient
          initialReports={reports}
          defaultDepartment={doctor?.poli_name || ''}
        />
      </main>
    </div>
  );
}
