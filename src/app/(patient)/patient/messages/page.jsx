import { getMyNotifications } from '@/services/patientService';
import MessagesClient from './MessagesClient';

export const metadata = {
  title: 'Pesan & Notifikasi',
  description: 'Daftar pesan dan notifikasi layanan medis pasien MedFlow HMIS.',
};

export default async function PatientMessagesPage() {
  let notifications = [];
  let loadError = '';

  try {
    const res = await getMyNotifications();
    if (res?.success && Array.isArray(res.data)) {
      notifications = res.data;
    } else if (res?.error) {
      loadError = res.error;
    }
  } catch (err) {
    console.error('Error loading notifications page:', err);
    loadError = 'Gagal memuat daftar pesan.';
  }

  return <MessagesClient initialNotifications={notifications} initialError={loadError} />;
}
