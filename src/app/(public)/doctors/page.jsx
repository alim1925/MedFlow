import { Suspense } from 'react';
import { getPublicDoctors, getPublicPolis } from '@/services/patientService';
import { getCurrentUser } from '@/lib/auth';
import DoctorDirectory from './DoctorDirectory';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Direktori Dokter & Jadwal Praktik',
  description: 'Temukan profil dokter spesialis dan jadwal praktik lengkap (read-only) di MedFlow HMIS.',
};

const FALLBACK_POLIS = [
  { id: 'all', name: 'Semua Poli' },
  { id: 'p1', name: 'Poli Umum' },
  { id: 'p2', name: 'Poli Gigi & Mulut' },
  { id: 'p3', name: 'Poli Mata' },
  { id: 'p4', name: 'Poli Jantung' },
  { id: 'p5', name: 'Poli Anak' },
  { id: 'p6', name: 'Poli Kandungan' },
];

const FALLBACK_DOCTORS = [
  {
    id: 'doc-1',
    full_name: 'dr. Sarah Amanda, Sp.PD',
    poli_name: 'Poli Umum',
    poli_id: 'p1',
    str_number: 'STR-2023-1100234',
    bio: 'Dokter spesialis penyakit dalam dengan fokus pada diagnosis holistik, pencegahan penyakit kronis, dan manajemen metabolik.',
    schedules: [
      { day_of_week: 1, start_time: '08:00', end_time: '12:00' },
      { day_of_week: 3, start_time: '08:00', end_time: '12:00' },
      { day_of_week: 5, start_time: '13:00', end_time: '17:00' },
    ],
  },
  {
    id: 'doc-2',
    full_name: 'drg. Budi Santoso, Sp.KG',
    poli_name: 'Poli Gigi & Mulut',
    poli_id: 'p2',
    str_number: 'STR-2022-9988221',
    bio: 'Ahli konservasi gigi dan estetika dental dengan keahlian perawatan saluran akar modern dan restorasi estetik minimal invasif.',
    schedules: [
      { day_of_week: 2, start_time: '09:00', end_time: '14:00' },
      { day_of_week: 4, start_time: '09:00', end_time: '14:00' },
      { day_of_week: 6, start_time: '08:00', end_time: '12:00' },
    ],
  },
  {
    id: 'doc-3',
    full_name: 'dr. Citra Lestari, Sp.M',
    poli_name: 'Poli Mata',
    poli_id: 'p3',
    str_number: 'STR-2021-4455667',
    bio: 'Spesialis oftalmologi berpengalaman dalam penanganan katarak, glaukoma, serta gangguan refraksi mata anak dan dewasa.',
    schedules: [
      { day_of_week: 1, start_time: '13:00', end_time: '17:00' },
      { day_of_week: 3, start_time: '13:00', end_time: '17:00' },
    ],
  },
  {
    id: 'doc-4',
    full_name: 'dr. Hendra Wijaya, Sp.JP(K)',
    poli_name: 'Poli Jantung',
    poli_id: 'p4',
    str_number: 'STR-2020-8877112',
    bio: 'Kardiolog konsultan intervensi vaskular dengan dedikasi tinggi pada pencegahan sindrom koroner akut dan gagal jantung kongestif.',
    schedules: [
      { day_of_week: 2, start_time: '14:00', end_time: '18:00' },
      { day_of_week: 5, start_time: '08:00', end_time: '12:00' },
    ],
  },
  {
    id: 'doc-5',
    full_name: 'dr. Maya Indah, Sp.A',
    poli_name: 'Poli Anak',
    poli_id: 'p5',
    str_number: 'STR-2022-3322119',
    bio: 'Spesialis kesehatan anak berfokus pada pencegahan stunting, pemantauan milestone tumbuh kembang bayi, dan vaksinasi anak ramah.',
    schedules: [
      { day_of_week: 1, start_time: '09:00', end_time: '13:00' },
      { day_of_week: 4, start_time: '13:00', end_time: '17:00' },
      { day_of_week: 6, start_time: '09:00', end_time: '12:00' },
    ],
  },
  {
    id: 'doc-6',
    full_name: 'dr. Rizky Pratama, Sp.OG',
    poli_name: 'Poli Kandungan',
    poli_id: 'p6',
    str_number: 'STR-2021-6677889',
    bio: 'Dokter spesialis obstetri & ginekologi bersertifikasi USG fetomaternal, melayani konsultasi antenatal care dan kesehatan reproduksi.',
    schedules: [
      { day_of_week: 2, start_time: '08:00', end_time: '12:00' },
      { day_of_week: 5, start_time: '13:00', end_time: '17:00' },
    ],
  },
];

export default async function DoctorsPage() {
  let doctors = [];
  let polis = [];
  let currentUser = null;

  try {
    const [user, docsRes, polisRes] = await Promise.all([
      getCurrentUser(),
      getPublicDoctors(),
      getPublicPolis(),
    ]);
    currentUser = user;

    const doctorData = docsRes?.success && Array.isArray(docsRes.data) ? docsRes.data : [];
    const poliData = polisRes?.success && Array.isArray(polisRes.data) ? polisRes.data : [];
    doctors = doctorData.length > 0 ? doctorData : FALLBACK_DOCTORS;
    polis = poliData.length > 0 ? poliData : FALLBACK_POLIS;
  } catch (err) {
    console.error('Error fetching doctors data:', err);
    doctors = FALLBACK_DOCTORS;
    polis = FALLBACK_POLIS;
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-sky-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-600 text-sm font-medium">Memuat Direktori Dokter...</p>
        </div>
      </div>
    }>
      <DoctorDirectory initialDoctors={doctors} initialPolis={polis} currentUser={currentUser} />
    </Suspense>
  );
}
