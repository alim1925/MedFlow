import { getPublicDoctors, getPublicPolis } from '@/services/patientService';
import PatientDoctorsClient from './PatientDoctorsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dokter & Jadwal Praktik',
  description: 'Daftar dokter spesialis dan jadwal praktik aktif di MedFlow HMIS.',
};

export default async function PatientDoctorsPage() {
  let doctors = [];
  let polis = [];

  try {
    const [docsRes, polisRes] = await Promise.all([
      getPublicDoctors(),
      getPublicPolis(),
    ]);

    if (docsRes?.success && Array.isArray(docsRes.data)) {
      doctors = docsRes.data;
    }
    if (polisRes?.success && Array.isArray(polisRes.data)) {
      polis = polisRes.data;
    }
  } catch (err) {
    console.error('Error loading patient doctors directory:', err);
  }

  return <PatientDoctorsClient initialDoctors={doctors} initialPolis={polis} />;
}
