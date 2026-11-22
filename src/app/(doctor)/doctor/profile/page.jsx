import Sidebar from '@/components/Sidebar';
import { getCurrentUser } from '@/lib/auth';
import { getDoctorProfile } from '@/services/doctorService';
import DoctorProfileClient from './DoctorProfileClient';

export const metadata = {
  title: 'Profil Dokter',
  description: 'Informasi pribadi dan kredensial praktik dokter MedFlow.',
};

export default async function DoctorProfilePage() {
  const [user, profileRes] = await Promise.all([
    getCurrentUser(),
    getDoctorProfile(),
  ]);
  const doctor = profileRes?.success ? profileRes.data : null;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans md:flex-row">
      <Sidebar
        role="DOCTOR"
        userName={doctor?.full_name || user?.name || 'dr. Spesialis'}
        userEmail={doctor?.email || user?.email || 'dokter@medflow.com'}
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 space-y-6">
        {!profileRes?.success && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {profileRes?.error || 'Profil dokter gagal dimuat.'}
          </p>
        )}

        {doctor && <DoctorProfileClient initialDoctor={doctor} />}
      </main>
    </div>
  );
}
