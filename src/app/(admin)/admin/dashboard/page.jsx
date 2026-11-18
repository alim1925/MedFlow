import Sidebar from '@/components/Sidebar';
import StatusBadge from '@/components/StatusBadge';
import Link from 'next/link';
import { getStats, getMedicines } from '@/services/adminService';
import { getPharmacyQueue } from '@/services/pharmacyService';
import { getCurrentUser } from '@/lib/auth';
import {
  Users,
  UserCheck,
  Calendar,
  AlertTriangle,
  Pill,
  ArrowRight,
  Shield,
  Activity,
  Layers,
  FileText,
  Clock,
  Sparkles,
  PackageX
} from 'lucide-react';

export const metadata = {
  title: 'Dashboard Admin',
  description: 'Ringkasan operasional rumah sakit, antrean farmasi, dan inventaris obat MedFlow HMIS.',
};

function formatDateIndo(date = new Date()) {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export default async function AdminDashboardPage() {
  let user = null;
  let stats = {
    totalPatients: 0,
    activeDoctors: 0,
    todaysAppointments: 0,
    lowStockMedicines: 0,
    prescriptionsWaiting: 0,
  };
  let pharmacyQueue = [];
  let lowStockList = [];

  try {
    user = await getCurrentUser();
    const [statsRes, queueRes, medsRes] = await Promise.all([
      getStats(),
      getPharmacyQueue(),
      getMedicines(),
    ]);

    if (statsRes?.success && statsRes.data) {
      stats = {
        totalPatients: statsRes.data.patients,
        activeDoctors: statsRes.data.doctors,
        todaysAppointments: statsRes.data.today_appointments,
        lowStockMedicines: statsRes.data.low_stock_medicines,
        prescriptionsWaiting: statsRes.data.prescriptions_waiting,
      };
    }
    if (queueRes?.success && Array.isArray(queueRes.data)) {
      pharmacyQueue = queueRes.data;
    }
    if (medsRes?.success && Array.isArray(medsRes.data)) {
      lowStockList = medsRes.data.filter(
        (medicine) => medicine.is_active && medicine.stock <= medicine.min_stock
      );
    }
  } catch (err) {
    console.error('Error loading admin dashboard:', err);
  }

  // Filter pharmacy active queue (WAITING or PROCESSING)
  const activePharmacy = pharmacyQueue.filter(
    (p) => p.status === 'WAITING' || p.status === 'PROCESSING'
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans md:flex-row">
      <Sidebar
        role="ADMIN"
        userName="Administrator"
        userEmail={user?.email || 'admin@medflow.com'}
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 space-y-8">
        {/* Header Banner */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-600 uppercase tracking-wider mb-1">
              <Shield className="w-4 h-4 text-sky-500" />
              <span>Pusat Kendali Eksekutif MedFlow HMIS</span>
            </div>
            <h1 className="text-2xl font-heading font-extrabold text-slate-900">
              Dashboard Administrator
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Monitoring performa pelayanan medis, ketersediaan obat, dan alur pasien secara real-time
            </p>
          </div>

          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-50 border border-sky-100 text-sky-800 text-xs font-semibold w-fit">
            <Calendar className="w-4 h-4 text-sky-600" />
            <span>{formatDateIndo(new Date())}</span>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Total Pasien */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 block">Total Pasien Terdaftar</span>
              <span className="text-3xl font-heading font-extrabold text-slate-900 mt-1 block">
                {stats.totalPatients || stats.patients_count || 0}
              </span>
              <span className="text-[11px] text-sky-600 font-semibold mt-1 block">
                Pasien RME Aktif
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: Dokter Aktif */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 block">Dokter Spesialis Aktif</span>
              <span className="text-3xl font-heading font-extrabold text-slate-900 mt-1 block">
                {stats.activeDoctors || stats.doctors_count || 0}
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
                Tersedia di poliklinik
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Janji Hari Ini */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 block">Janji Temu Hari Ini</span>
              <span className="text-3xl font-heading font-extrabold text-slate-900 mt-1 block">
                {stats.todaysAppointments || stats.today_appointments || 0}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Jadwal rawat jalan aktif
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
          </div>

          {/* Card 4: Obat Stok Menipis */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 block">Obat Stok Menipis</span>
              <span className="text-3xl font-heading font-extrabold text-red-600 mt-1 block">
                {stats.lowStockMedicines || lowStockList.length}
              </span>
              <span className="text-[11px] text-red-600 font-semibold mt-1 block">
                Perlu restock segera
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
              <PackageX className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* 2-Column Grid: Pharmacy Queue Preview & Low Stock Alert */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Pharmacy Queue Preview (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-heading font-bold text-base text-slate-900 flex items-center gap-2">
                  <Pill className="w-5 h-5 text-purple-600" />
                  <span>Antrean Peracikan Farmasi</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Resep yang sedang menunggu atau diproses oleh instalasi farmasi
                </p>
              </div>
              <Link
                href="/admin/pharmacy"
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
              >
                <span>Kelola Farmasi</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {activePharmacy.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-xs text-slate-400">
                  Tidak ada resep yang sedang menunggu proses saat ini.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 px-3">Pasien</th>
                      <th className="py-2.5 px-3">Item Obat</th>
                      <th className="py-2.5 px-2">Status</th>
                      <th className="py-2.5 px-2 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activePharmacy.slice(0, 5).map((rx) => {
                      const medNames = rx.items
                        ? rx.items.map((i) => i.medicine_name || i.name).join(', ')
                        : 'Obat Resep';

                      return (
                        <tr key={rx.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3 font-semibold text-slate-900">
                            {rx.patient_name || 'Pasien'}
                            <span className="block text-[10px] text-slate-400 font-mono">
                              {rx.medical_record_no}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-600 max-w-[200px] truncate">
                            {medNames}
                          </td>
                          <td className="py-3 px-2">
                            <StatusBadge status={rx.status} size="sm" />
                          </td>
                          <td className="py-3 px-2 text-right">
                            <Link
                              href="/admin/pharmacy"
                              className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-[11px] font-semibold transition"
                            >
                              Proses
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Low Stock Medicines (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-heading font-bold text-base text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <span>Peringatan Stok Obat Menipis</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Stok di bawah ambang batas minimum sistem
                </p>
              </div>
              <Link
                href="/admin/medicines"
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
              >
                <span>Lihat Gudang</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {lowStockList.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-xs text-emerald-600 font-semibold">
                  Semua stok obat dalam kondisi aman di atas batas minimum.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {lowStockList.slice(0, 6).map((med) => (
                  <div
                    key={med.id}
                    className="p-3 rounded-xl border-l-4 border-l-amber-500 bg-amber-50/50 border border-slate-100 flex items-center justify-between"
                  >
                    <div>
                      <h3 className="font-bold text-xs text-slate-900">{med.name}</h3>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Kode: {med.code} • Min: {med.min_stock} {med.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-bold">
                        Sisa {med.stock} {med.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Navigation Cards Grid */}
        <div>
          <h2 className="text-sm font-heading font-bold text-slate-800 uppercase tracking-wider mb-4">
            Modul Administrasi MedFlow
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <Link
              href="/admin/users"
              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-sky-300 hover:shadow-md transition text-center group"
            >
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-2 group-hover:bg-sky-500 group-hover:text-white transition">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-heading font-bold text-slate-800">Pengguna</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Kelola Akun & Akses</p>
            </Link>

            <Link
              href="/admin/polis"
              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-sky-300 hover:shadow-md transition text-center group"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2 group-hover:bg-indigo-500 group-hover:text-white transition">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-heading font-bold text-slate-800">Poliklinik</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Daftar Layanan Spesialis</p>
            </Link>

            <Link
              href="/admin/doctors"
              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-sky-300 hover:shadow-md transition text-center group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 group-hover:bg-emerald-500 group-hover:text-white transition">
                <UserCheck className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-heading font-bold text-slate-800">Dokter</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Profil & STR</p>
            </Link>

            <Link
              href="/admin/medicines"
              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-sky-300 hover:shadow-md transition text-center group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2 group-hover:bg-amber-500 group-hover:text-white transition">
                <Pill className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-heading font-bold text-slate-800">Obat & Stok</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Inventori & Restock</p>
            </Link>

            <Link
              href="/admin/pharmacy"
              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-sky-300 hover:shadow-md transition text-center group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-2 group-hover:bg-purple-500 group-hover:text-white transition">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-heading font-bold text-slate-800">Farmasi</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Antrean Resep</p>
            </Link>

            <Link
              href="/admin/audit-logs"
              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-sky-300 hover:shadow-md transition text-center group"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-2 group-hover:bg-slate-700 group-hover:text-white transition">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-heading font-bold text-slate-800">Audit Log</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Aktivitas Sistem</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
