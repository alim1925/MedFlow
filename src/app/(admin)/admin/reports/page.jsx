import { getCurrentUser } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import OperationalReportsClient from './OperationalReportsClient';

export const metadata = {
  title: 'Laporan Operasional',
  description:
    'Laporan keuangan & operasional rumah sakit: pendapatan, pengeluaran, selisih, keuntungan, gaji, piutang, dan pemeliharaan alat medis.',
};

export default async function AdminReportsPage() {
  const user = await getCurrentUser().catch(() => null);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans md:flex-row">
      <div className="print:hidden">
        <Sidebar
          role="ADMIN"
          userName="Administrator"
          userEmail={user?.email || 'admin@medflow.com'}
        />
      </div>

      <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
        <OperationalReportsClient />
      </main>
    </div>
  );
}
