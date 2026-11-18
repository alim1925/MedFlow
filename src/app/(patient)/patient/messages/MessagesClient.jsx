'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/apiClient';
import {
  Bell,
  Calendar,
  CheckCheck,
  CheckCircle2,
  FileText,
  Pill,
  MailOpen,
  Mail,
  Loader2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

const TYPE_META = {
  APPOINTMENT: {
    label: 'Janji Temu',
    icon: Calendar,
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    iconBg: 'bg-sky-50 text-sky-600',
    href: '/patient/appointments',
    linkLabel: 'Lihat Janji Temu',
  },
  MEDICAL_RECORD: {
    label: 'Rekam Medis',
    icon: FileText,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconBg: 'bg-emerald-50 text-emerald-600',
    href: '/patient/records',
    linkLabel: 'Buka Rekam Medis',
  },
  PRESCRIPTION: {
    label: 'Farmasi & Resep',
    icon: Pill,
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    iconBg: 'bg-purple-50 text-purple-600',
    href: '/patient/prescriptions',
    linkLabel: 'Cek Status Resep',
  },
};

const TABS = [
  { id: 'ALL', label: 'Semua Pesan' },
  { id: 'UNREAD', label: 'Belum Dibaca' },
  { id: 'APPOINTMENT', label: 'Janji Temu' },
  { id: 'MEDICAL_RECORD', label: 'Rekam Medis' },
  { id: 'PRESCRIPTION', label: 'Farmasi' },
];

function formatDateTimeIndo(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function MessagesClient({ initialNotifications = [], initialError = '' }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [activeTab, setActiveTab] = useState('ALL');
  const [busyId, setBusyId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState(initialError);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (activeTab === 'ALL') return true;
      if (activeTab === 'UNREAD') return !item.is_read;
      return item.type === activeTab;
    });
  }, [notifications, activeTab]);

  const handleMarkRead = async (id) => {
    setBusyId(id);
    setError('');
    try {
      const res = await apiRequest(`/api/patient/notifications/${id}/read`, {
        method: 'PATCH',
      });
      if (res?.success) {
        setNotifications((prev) =>
          prev.map((item) => (item.id === id ? { ...item, is_read: true } : item))
        );
        router.refresh();
      } else {
        setError(res?.error || 'Gagal menandai pesan sudah dibaca.');
      }
    } catch (err) {
      console.error('Error marking message read:', err);
      setError('Terjadi kesalahan saat memperbarui status pesan.');
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    setError('');
    try {
      const res = await apiRequest('/api/patient/notifications/read-all', {
        method: 'PATCH',
      });
      if (res?.success) {
        setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
        router.refresh();
      } else {
        setError(res?.error || 'Gagal menandai semua pesan.');
      }
    } catch (err) {
      console.error('Error marking all messages read:', err);
      setError('Terjadi kesalahan saat memperbarui pesan.');
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-600 uppercase tracking-wider mb-1">
            <Bell className="w-4 h-4" />
            <span>Pusat Pesan Pasien</span>
          </div>
          <h1 className="text-2xl font-heading font-extrabold text-slate-900">
            Pesan & Notifikasi
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Informasi konfirmasi janji temu, catatan pemeriksaan dokter, dan pemberitahuan pengambilan obat farmasi.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-100 text-sky-800 text-xs font-semibold">
            {unreadCount} Belum Dibaca
          </span>
          <button
            type="button"
            disabled={unreadCount === 0 || markingAll}
            onClick={handleMarkAllRead}
            className="btn-outline text-xs py-2 disabled:opacity-50"
          >
            {markingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4 text-emerald-600" />
            )}
            <span>Tandai Semua Dibaca</span>
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap items-center gap-2">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                isActive
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
              {tab.id === 'UNREAD' && unreadCount > 0 ? ` (${unreadCount})` : ''}
            </button>
          );
        })}
      </div>

      {/* Messages List */}
      {filteredNotifications.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-100 shadow-sm text-center">
          <div className="w-14 h-14 rounded-full bg-sky-50 text-sky-500 flex items-center justify-center mx-auto mb-3">
            <MailOpen className="w-7 h-7" />
          </div>
          <h3 className="text-base font-heading font-bold text-slate-800">
            Tidak Ada Pesan
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {activeTab === 'UNREAD'
              ? 'Semua pesan dan notifikasi Anda sudah dibaca.'
              : 'Belum ada pesan atau notifikasi sistem untuk kategori ini.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((item) => {
            const meta = TYPE_META[item.type] || {
              label: 'Informasi',
              icon: Bell,
              badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
              iconBg: 'bg-slate-100 text-slate-600',
              href: '/patient/dashboard',
              linkLabel: 'Ke Dashboard',
            };
            const Icon = meta.icon;
            const isUnread = !item.is_read;
            const isBusy = busyId === item.id;

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl p-5 border shadow-sm transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                  isUnread
                    ? 'border-sky-300 ring-1 ring-sky-100 bg-sky-50/20'
                    : 'border-slate-100'
                }`}
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.iconBg}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${meta.badgeClass}`}>
                        {meta.label}
                      </span>
                      {isUnread ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-600 border border-red-200">
                          <Mail className="w-3 h-3" />
                          Baru
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          Dibaca
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatDateTimeIndo(item.created_at)}
                      </span>
                    </div>

                    <h2 className="font-heading font-bold text-sm sm:text-base text-slate-900">
                      {item.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {item.message}
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-end gap-2 flex-shrink-0">
                  <Link
                    href={meta.href}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold transition"
                  >
                    <span>{meta.linkLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  {isUnread && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleMarkRead(item.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                    >
                      {isBusy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                      <span>Tandai Dibaca</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
