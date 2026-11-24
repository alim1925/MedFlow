import { getMyPrescriptions } from '@/services/patientService';
import PatientPrescriptionsClient from './PatientPrescriptionsClient';

export const metadata = {
  title: 'Resep Obat Pasien',
  description: 'Daftar resep obat digital, rincian harga obat, dan status pembayaran farmasi di MedFlow HMIS.',
};

export default async function PatientPrescriptionsPage() {
  let prescriptions = [];

  try {
    const res = await getMyPrescriptions();
    if (res?.success && Array.isArray(res.data)) prescriptions = res.data;
  } catch (err) {
    console.error('Error fetching prescriptions:', err);
    prescriptions = [];
  }

  return <PatientPrescriptionsClient initialPrescriptions={prescriptions} />;
}
