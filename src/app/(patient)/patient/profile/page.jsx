import { getPatientProfile } from '@/services/patientService';
import { getCurrentUser } from '@/lib/auth';
import PatientProfileClient from './PatientProfileClient';

export const metadata = {
  title: 'Profil Pasien',
  description: 'Informasi profil dan kontak pribadi pasien MedFlow.',
};

export default async function PatientProfilePage() {
  const [user, profileRes] = await Promise.all([
    getCurrentUser(),
    getPatientProfile(),
  ]);
  const patient = profileRes?.success ? profileRes.data : null;

  return (
    <div className="space-y-6">
      {!profileRes?.success && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {profileRes?.error || 'Profil pasien gagal dimuat.'}
        </p>
      )}

      {patient && (
        <PatientProfileClient
          initialPatient={patient}
          userEmail={user?.email || ''}
        />
      )}
    </div>
  );
}
