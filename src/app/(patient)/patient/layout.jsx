import Sidebar from '@/components/Sidebar';
import { getCurrentUser } from '@/lib/auth';
import { getPatientProfile, getMyNotifications } from '@/services/patientService';

export default async function PatientLayout({ children }) {
  let user = null;
  let patient = null;
  let unreadCount = 0;

  try {
    const [currentUser, profileRes, notifRes] = await Promise.all([
      getCurrentUser(),
      getPatientProfile(),
      getMyNotifications(),
    ]);
    user = currentUser;
    if (profileRes?.success && profileRes.data) {
      patient = profileRes.data;
    }
    if (notifRes?.success) {
      unreadCount = notifRes.unreadCount || 0;
    }
  } catch (err) {
    console.error('Error loading patient layout:', err);
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans md:flex-row">
      <Sidebar
        role="PATIENT"
        userName={patient?.full_name || user?.name || 'Pasien MedFlow'}
        userEmail={user?.email || 'patient@medflow.com'}
        unreadCount={unreadCount}
      />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
        {children}
      </main>
    </div>
  );
}
