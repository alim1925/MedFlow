import React from 'react';
import {
  Clock,
  CheckCircle,
  XCircle,
  Ban,
  CheckCircle2,
  AlertCircle,
  Hourglass,
  Loader2,
  PackageCheck,
  ShoppingBag,
  HelpCircle,
  CreditCard,
  BadgeCheck,
} from 'lucide-react';

const STATUS_MAP = {
  PENDING: { label: 'Menunggu', icon: Clock, className: 'bg-amber-50 text-amber-700 border-amber-200' },
  CONFIRMED: { label: 'Approved', icon: CheckCircle, className: 'bg-sky-50 text-sky-700 border-sky-200' },
  REJECTED: { label: 'Rejected', icon: XCircle, className: 'bg-red-50 text-red-700 border-red-200' },
  CANCELLED: { label: 'Dibatalkan', icon: Ban, className: 'bg-slate-50 text-slate-500 border-slate-200' },
  COMPLETED: { label: 'Selesai', icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  NO_SHOW: { label: 'Tidak Hadir', icon: AlertCircle, className: 'bg-orange-50 text-orange-700 border-orange-200' },
  WAITING: { label: 'Menunggu Farmasi', icon: Hourglass, className: 'bg-amber-50 text-amber-700 border-amber-200' },
  PROCESSING: { label: 'Diproses', icon: Loader2, className: 'bg-blue-50 text-blue-700 border-blue-200', spin: true },
  READY: { label: 'Siap Diambil', icon: PackageCheck, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PICKED_UP: { label: 'Sudah Diambil', icon: ShoppingBag, className: 'bg-purple-50 text-purple-700 border-purple-200' },
  UNPAID: { label: 'Belum Dibayar', icon: CreditCard, className: 'bg-amber-50 text-amber-700 border-amber-200' },
  WAITING_CONFIRMATION: { label: 'Menunggu Konfirmasi', icon: Hourglass, className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  PAID: { label: 'Lunas', icon: BadgeCheck, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PAYMENT_REJECTED: { label: 'Pembayaran Ditolak', icon: XCircle, className: 'bg-red-50 text-red-700 border-red-200' },
};

const SIZE_MAP = {
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-2.5 py-1 text-xs gap-1.5',
  lg: 'px-3 py-1.5 text-sm gap-2',
};

const ICON_SIZE_MAP = {
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
  lg: 'w-4 h-4',
};

export default function StatusBadge({ status, size = 'md', className = '' }) {
  const normalizedKey = status ? String(status).toUpperCase() : 'PENDING';
  const config = STATUS_MAP[normalizedKey] || {
    label: status || 'Status',
    icon: HelpCircle,
    className: 'bg-slate-50 text-slate-600 border-slate-200',
    spin: false,
  };

  const Icon = config.icon;
  const sizeClasses = SIZE_MAP[size] || SIZE_MAP.md;
  const iconSizeClasses = ICON_SIZE_MAP[size] || ICON_SIZE_MAP.md;

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border transition-colors ${config.className} ${sizeClasses} ${className}`}
    >
      <Icon
        className={`${iconSizeClasses} flex-shrink-0 ${config.spin ? 'animate-spin' : ''}`}
        aria-hidden="true"
      />
      <span>{config.label}</span>
    </span>
  );
}
