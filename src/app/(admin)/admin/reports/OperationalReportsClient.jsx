'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiRequest } from '@/lib/apiClient';
import {
  TrendingUp,
  TrendingDown,
  Scale,
  BadgeDollarSign,
  Users,
  Receipt,
  Wrench,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Download,
  Printer,
  Calendar,
  Sparkles,
  CreditCard,
  Clock,
  Activity,
  FileSpreadsheet,
  Search,
} from 'lucide-react';

const REVENUE_CATEGORIES = {
  POLI_SERVICE: 'Jasa Layanan Poli',
  PHARMACY: 'Penjualan Farmasi',
  LABORATORY: 'Laboratorium & Diagnostik',
  ADMINISTRATION: 'Administrasi & Pendaftaran',
  OTHER: 'Pendapatan Lainnya',
};

const EXPENSE_CATEGORIES = {
  MEDICINE_PURCHASE: 'Pengadaan Obat & Farmasi',
  UTILITIES: 'Listrik, Air & Utilitas',
  MEDICAL_SUPPLIES: 'Bahan Medis Habis Pakai',
  FACILITY: 'Fasilitas, Kebersihan & Limbah',
  ADMINISTRATION: 'ATK & Administrasi',
  OTHER: 'Pengeluaran Lainnya',
};

const PAYMENT_METHODS = {
  CASH: 'Tunai',
  TRANSFER: 'Transfer Bank',
  QRIS: 'QRIS',
  BPJS: 'Klaim BPJS',
  INSURANCE: 'Asuransi',
};

const DEBTOR_TYPES = {
  PATIENT: 'Pasien Umum',
  BPJS: 'BPJS Kesehatan',
  INSURANCE: 'Asuransi Swasta',
  CORPORATE: 'Korporat / Mitra',
};

const MAINTENANCE_TYPES = {
  PREVENTIVE: 'Pemeliharaan Preventif',
  CALIBRATION: 'Kalibrasi Alat',
  REPAIR: 'Perbaikan / Servis',
};

const TABS = [
  { id: 'overview', label: 'Ringkasan & Laba Rugi', icon: FileSpreadsheet },
  { id: 'revenues', label: 'Pendapatan', icon: TrendingUp },
  { id: 'expenses', label: 'Pengeluaran', icon: TrendingDown },
  { id: 'payrolls', label: 'Gaji (Payroll)', icon: Users },
  { id: 'receivables', label: 'Piutang', icon: Receipt },
  { id: 'maintenances', label: 'Pemeliharaan Alat', icon: Wrench },
];

function formatRupiah(amount) {
  const num = Number(amount) || 0;
  const sign = num < 0 ? '-' : '';
  return `${sign}Rp ${Math.abs(num).toLocaleString('id-ID')}`;
}

function formatDateIndo(dateStr) {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
}

function toInputDate(dateStr) {
  if (!dateStr) return new Date().toISOString().slice(0, 10);
  try {
    return new Date(dateStr).toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(ym) {
  if (!ym || ym === 'ALL') return 'Semua Periode';
  const [y, m] = ym.split('-');
  if (!y || !m) return ym;
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

export default function OperationalReportsClient() {
  const [period, setPeriod] = useState(getCurrentMonth());
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const [toast, setToast] = useState('');
  const [pageError, setPageError] = useState('');

  // CRUD Modal State
  const [modalType, setModalType] = useState(null); // 'revenue' | 'expense' | 'payroll' | 'receivable' | 'maintenance'
  const [editingItem, setEditingItem] = useState(null);
  const [formState, setFormState] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Payment Modal for Piutang
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    payment_amount: 0,
    payment_method: 'TRANSFER',
    record_as_revenue: true,
    notes: '',
  });

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState(null); // { type, id, label }

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4500);
  };

  const loadReport = useCallback(async (targetPeriod = period) => {
    try {
      setLoading(true);
      setPageError('');
      const res = await apiRequest(`/api/admin/reports?period=${encodeURIComponent(targetPeriod)}`);
      if (res?.success && res.data) {
        setReport(res.data);
      } else {
        setPageError(res?.error || 'Gagal memuat data laporan operasional.');
      }
    } catch (err) {
      console.error('Error loading operational report:', err);
      setPageError('Terjadi kendala jaringan saat memuat laporan operasional.');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setPageError('');
        const res = await apiRequest(`/api/admin/reports?period=${encodeURIComponent(period)}`);
        if (!active) return;
        if (res?.success && res.data) {
          setReport(res.data);
        } else {
          setPageError(res?.error || 'Gagal memuat data laporan operasional.');
        }
      } catch (err) {
        if (!active) return;
        console.error('Error loading operational report:', err);
        setPageError('Terjadi kendala jaringan saat memuat laporan operasional.');
      } finally {
        if (active) setLoading(false);
      }
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [period]);

  const handleSeedSample = async () => {
    setSeeding(true);
    setPageError('');
    try {
      const res = await apiRequest('/api/admin/reports/seed', { method: 'POST' });
      if (res?.success) {
        showToast(res.message || 'Data sampel operasional berhasil dimuat.');
        await loadReport();
      } else {
        setPageError(res?.error || 'Gagal memuat data sampel.');
      }
    } catch {
      setPageError('Terjadi kendala saat memuat data sampel.');
    } finally {
      setSeeding(false);
    }
  };

  const openCreateModal = (type) => {
    setModalType(type);
    setEditingItem(null);
    setModalError('');
    const today = new Date().toISOString().slice(0, 10);
    const activeMonth = period === 'ALL' ? getCurrentMonth() : period;

    if (type === 'revenue') {
      setFormState({
        reference_no: `REV-${Date.now().toString().slice(-5)}`,
        transaction_date: today,
        category: 'POLI_SERVICE',
        description: '',
        amount: '',
        payment_method: 'CASH',
        notes: '',
      });
    } else if (type === 'expense') {
      setFormState({
        reference_no: `EXP-${Date.now().toString().slice(-5)}`,
        transaction_date: today,
        category: 'MEDICINE_PURCHASE',
        description: '',
        amount: '',
        vendor: '',
        notes: '',
      });
    } else if (type === 'payroll') {
      setFormState({
        employee_name: '',
        doctor_id: '',
        role_title: 'Dokter / Tenaga Medis',
        period_month: activeMonth,
        base_salary: '',
        allowance: '0',
        deduction: '0',
        status: 'PENDING',
        notes: '',
      });
    } else if (type === 'receivable') {
      const nextTwoWeeks = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
      setFormState({
        invoice_number: `INV-PIU-${Date.now().toString().slice(-5)}`,
        debtor_name: '',
        debtor_type: 'PATIENT',
        patient_id: '',
        description: '',
        total_amount: '',
        paid_amount: '0',
        due_date: nextTwoWeeks,
        notes: '',
      });
    } else if (type === 'maintenance') {
      setFormState({
        equipment_code: `ALT-${Date.now().toString().slice(-4)}`,
        equipment_name: '',
        department: 'Poli Umum',
        maintenance_type: 'PREVENTIVE',
        maintenance_date: today,
        next_maintenance_date: '',
        vendor_name: '',
        cost: '0',
        status: 'SCHEDULED',
        notes: '',
      });
    }
  };

  const openEditModal = (type, item) => {
    setModalType(type);
    setEditingItem(item);
    setModalError('');

    if (type === 'revenue') {
      setFormState({
        reference_no: item.reference_no || '',
        transaction_date: toInputDate(item.transaction_date),
        category: item.category || 'POLI_SERVICE',
        description: item.description || '',
        amount: String(item.amount ?? ''),
        payment_method: item.payment_method || 'CASH',
        notes: item.notes || '',
      });
    } else if (type === 'expense') {
      setFormState({
        reference_no: item.reference_no || '',
        transaction_date: toInputDate(item.transaction_date),
        category: item.category || 'MEDICINE_PURCHASE',
        description: item.description || '',
        amount: String(item.amount ?? ''),
        vendor: item.vendor || '',
        notes: item.notes || '',
      });
    } else if (type === 'payroll') {
      setFormState({
        employee_name: item.employee_name || '',
        doctor_id: item.doctor_id || '',
        role_title: item.role_title || '',
        period_month: item.period_month || getCurrentMonth(),
        base_salary: String(item.base_salary ?? 0),
        allowance: String(item.allowance ?? 0),
        deduction: String(item.deduction ?? 0),
        status: item.status || 'PENDING',
        notes: item.notes || '',
      });
    } else if (type === 'receivable') {
      setFormState({
        invoice_number: item.invoice_number || '',
        debtor_name: item.debtor_name || '',
        debtor_type: item.debtor_type || 'PATIENT',
        patient_id: item.patient_id || '',
        description: item.description || '',
        total_amount: String(item.total_amount ?? ''),
        paid_amount: String(item.paid_amount ?? 0),
        due_date: toInputDate(item.due_date),
        notes: item.notes || '',
      });
    } else if (type === 'maintenance') {
      setFormState({
        equipment_code: item.equipment_code || '',
        equipment_name: item.equipment_name || '',
        department: item.department || '',
        maintenance_type: item.maintenance_type || 'PREVENTIVE',
        maintenance_date: toInputDate(item.maintenance_date),
        next_maintenance_date: item.next_maintenance_date ? toInputDate(item.next_maintenance_date) : '',
        vendor_name: item.vendor_name || '',
        cost: String(item.cost ?? 0),
        status: item.status || 'SCHEDULED',
        notes: item.notes || '',
      });
    }
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError('');

    try {
      const method = editingItem ? 'PATCH' : 'POST';
      const body = editingItem
        ? { type: modalType, id: editingItem.id, ...formState }
        : { type: modalType, ...formState };

      const res = await apiRequest('/api/admin/reports', { method, body });
      if (res?.success) {
        showToast(editingItem ? 'Data laporan berhasil diperbarui.' : 'Data laporan berhasil ditambahkan.');
        setModalType(null);
        setEditingItem(null);
        await loadReport();
      } else {
        setModalError(res?.error || 'Gagal menyimpan data.');
      }
    } catch {
      setModalError('Terjadi kendala jaringan saat menyimpan data.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickMarkPayrollPaid = async (payroll) => {
    try {
      const res = await apiRequest('/api/admin/reports', {
        method: 'PATCH',
        body: { type: 'payroll', id: payroll.id, action: 'MARK_PAID' },
      });
      if (res?.success) {
        showToast(`Gaji ${payroll.employee_name} ditandai sudah dibayar.`);
        await loadReport();
      } else {
        setPageError(res?.error || 'Gagal memperbarui status gaji.');
      }
    } catch {
      setPageError('Terjadi kendala jaringan.');
    }
  };

  const handleQuickMaintenanceStatus = async (item, newStatus) => {
    try {
      const res = await apiRequest('/api/admin/reports', {
        method: 'PATCH',
        body: { type: 'maintenance', id: item.id, action: 'UPDATE_STATUS', status: newStatus },
      });
      if (res?.success) {
        showToast(`Status pemeliharaan ${item.equipment_name} diperbarui.`);
        await loadReport();
      } else {
        setPageError(res?.error || 'Gagal memperbarui status pemeliharaan.');
      }
    } catch {
      setPageError('Terjadi kendala jaringan.');
    }
  };

  const openPaymentModal = (rec) => {
    setPaymentTarget(rec);
    setModalError('');
    setPaymentForm({
      payment_amount: rec.remaining_amount || 0,
      payment_method: 'TRANSFER',
      record_as_revenue: true,
      notes: '',
    });
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!paymentTarget) return;
    setSubmitting(true);
    setModalError('');

    try {
      const res = await apiRequest('/api/admin/reports', {
        method: 'PATCH',
        body: {
          type: 'receivable',
          id: paymentTarget.id,
          action: 'RECORD_PAYMENT',
          ...paymentForm,
        },
      });
      if (res?.success) {
        showToast(`Pembayaran piutang ${paymentTarget.invoice_number} berhasil dicatat.`);
        setPaymentTarget(null);
        await loadReport();
      } else {
        setModalError(res?.error || 'Gagal mencatat pembayaran piutang.');
      }
    } catch {
      setModalError('Terjadi kendala jaringan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    setModalError('');
    try {
      const res = await apiRequest(
        `/api/admin/reports?type=${encodeURIComponent(deleteTarget.type)}&id=${encodeURIComponent(deleteTarget.id)}`,
        { method: 'DELETE' }
      );
      if (res?.success) {
        showToast(`Data "${deleteTarget.label}" berhasil dihapus.`);
        setDeleteTarget(null);
        await loadReport();
      } else {
        setModalError(res?.error || 'Gagal menghapus data.');
      }
    } catch {
      setModalError('Terjadi kendala jaringan saat menghapus data.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCsv = () => {
    if (!report) return;
    const s = report.summary;
    const rows = [
      ['LAPORAN OPERASIONAL MEDFLOW HMIS', formatMonthLabel(report.period)],
      [],
      ['RINGKASAN KEUANGAN', 'NOMINAL (IDR)'],
      ['Total Pendapatan', s.totalRevenue],
      ['Pengeluaran Operasional Umum', s.generalExpenses],
      ['Beban Gaji Dokter & Staf', s.payrollTotal],
      ['Biaya Pemeliharaan Alat Medis', s.maintenanceCost],
      ['Total Pengeluaran Operasional', s.totalExpenses],
      ['Selisih (Pendapatan - Pengeluaran)', s.variance],
      ['Laba Kotor (Pendapatan - Pengeluaran Umum)', s.grossProfit],
      ['Keuntungan Bersih (Laba Bersih)', s.netProfit],
      ['Margin Keuntungan (%)', `${s.profitMarginPercent}%`],
      ['Total Piutang Tercatat', s.receivablesTotal],
      ['Piutang Sudah Tertagih', s.receivablesCollected],
      ['Sisa Piutang Belum Lunas', s.receivablesOutstanding],
      [],
      ['RINCIAN PENDAPATAN', 'Tanggal', 'Ref', 'Kategori', 'Deskripsi', 'Metode', 'Nominal'],
      ...report.lists.revenues.map((r) => [
        'Pendapatan',
        toInputDate(r.transaction_date),
        r.reference_no || '-',
        REVENUE_CATEGORIES[r.category] || r.category,
        r.description,
        r.payment_method,
        r.amount,
      ]),
      [],
      ['RINCIAN PENGELUARAN UMUM', 'Tanggal', 'Ref', 'Kategori', 'Deskripsi', 'Vendor', 'Nominal'],
      ...report.lists.expenses.map((e) => [
        'Pengeluaran',
        toInputDate(e.transaction_date),
        e.reference_no || '-',
        EXPENSE_CATEGORIES[e.category] || e.category,
        e.description,
        e.vendor || '-',
        e.amount,
      ]),
      [],
      ['RINCIAN GAJI', 'Periode', 'Nama', 'Jabatan', 'Gaji Pokok', 'Tunjangan', 'Potongan', 'Gaji Bersih', 'Status'],
      ...report.lists.payrolls.map((p) => [
        'Gaji',
        p.period_month,
        p.employee_name,
        p.role_title,
        p.base_salary,
        p.allowance,
        p.deduction,
        p.net_salary,
        p.status,
      ]),
      [],
      ['RINCIAN PIUTANG', 'No Invoice', 'Debitur', 'Tipe', 'Jatuh Tempo', 'Total', 'Terbayar', 'Sisa', 'Status'],
      ...report.lists.receivables.map((rec) => [
        'Piutang',
        rec.invoice_number,
        rec.debtor_name,
        DEBTOR_TYPES[rec.debtor_type] || rec.debtor_type,
        toInputDate(rec.due_date),
        rec.total_amount,
        rec.paid_amount,
        rec.remaining_amount,
        rec.effective_status,
      ]),
      [],
      ['PEMELIHARAAN ALAT MEDIS', 'Tanggal', 'Kode Alat', 'Nama Alat', 'Unit/Poli', 'Jenis', 'Vendor', 'Biaya', 'Status'],
      ...report.lists.maintenances.map((m) => [
        'Pemeliharaan',
        toInputDate(m.maintenance_date),
        m.equipment_code,
        m.equipment_name,
        m.department || '-',
        MAINTENANCE_TYPES[m.maintenance_type] || m.maintenance_type,
        m.vendor_name || '-',
        m.cost,
        m.status,
      ]),
    ];

    const csvContent =
      '\uFEFF' +
      rows
        .map((row) =>
          row
            .map((cell) => {
              const str = String(cell ?? '');
              return `"${str.replace(/"/g, '""')}"`;
            })
            .join(',')
        )
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `laporan-operasional-medflow-${report.period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const summary = report?.summary || {};
  const lists = useMemo(
    () =>
      report?.lists || {
        revenues: [],
        expenses: [],
        payrolls: [],
        receivables: [],
        maintenances: [],
      },
    [report]
  );
  const references = report?.references || { doctors: [], patients: [] };
  const monthlyTrend = useMemo(() => report?.monthlyTrend || [], [report]);
  const clinicalContext = report?.clinicalContext || {};

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredRevenues = useMemo(() => {
    if (!normalizedSearch) return lists.revenues;
    return lists.revenues.filter((r) =>
      [r.reference_no, r.description, r.category, r.payment_method]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(normalizedSearch))
    );
  }, [lists.revenues, normalizedSearch]);

  const filteredExpenses = useMemo(() => {
    if (!normalizedSearch) return lists.expenses;
    return lists.expenses.filter((e) =>
      [e.reference_no, e.description, e.category, e.vendor]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(normalizedSearch))
    );
  }, [lists.expenses, normalizedSearch]);

  const filteredPayrolls = useMemo(() => {
    if (!normalizedSearch) return lists.payrolls;
    return lists.payrolls.filter((p) =>
      [p.employee_name, p.role_title, p.period_month, p.status]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(normalizedSearch))
    );
  }, [lists.payrolls, normalizedSearch]);

  const filteredReceivables = useMemo(() => {
    if (!normalizedSearch) return lists.receivables;
    return lists.receivables.filter((r) =>
      [r.invoice_number, r.debtor_name, r.debtor_type, r.description, r.effective_status]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(normalizedSearch))
    );
  }, [lists.receivables, normalizedSearch]);

  const filteredMaintenances = useMemo(() => {
    if (!normalizedSearch) return lists.maintenances;
    return lists.maintenances.filter((m) =>
      [m.equipment_code, m.equipment_name, m.department, m.vendor_name, m.maintenance_type, m.status]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(normalizedSearch))
    );
  }, [lists.maintenances, normalizedSearch]);

  const maxTrendValue = useMemo(() => {
    return Math.max(
      1,
      ...monthlyTrend.map((t) => Math.max(t.revenue || 0, t.expense || 0))
    );
  }, [monthlyTrend]);

  return (
    <div className="space-y-6">
      {/* Header & Period Toolbar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-600 uppercase tracking-wider mb-1">
            <FileSpreadsheet className="w-4 h-4 text-sky-500" />
            <span>Akuntansi & Keuangan Operasional Rumah Sakit</span>
          </div>
          <h1 className="text-2xl font-heading font-extrabold text-slate-900">
            Laporan Operasional & Keuangan
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pantau pendapatan, pengeluaran, selisih, keuntungan bersih, gaji pegawai/dokter, piutang, dan pemeliharaan alat medis
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input
              type="month"
              value={period === 'ALL' ? getCurrentMonth() : period}
              onChange={(e) => setPeriod(e.target.value || getCurrentMonth())}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setPeriod(period === 'ALL' ? getCurrentMonth() : 'ALL')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              period === 'ALL'
                ? 'bg-sky-500 text-white border-sky-500'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {period === 'ALL' ? 'Menampilkan: Semua Periode' : 'Semua Periode'}
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!report}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold transition cursor-pointer shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak</span>
          </button>
        </div>
      </div>

      {/* Toast & Error */}
      {toast && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2.5 print:hidden">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {pageError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span>{pageError}</span>
        </div>
      )}

      {/* Optional Sample Seeder Banner when empty */}
      {!loading && report?.isAllEmpty && (
        <div className="p-5 rounded-2xl bg-sky-50 border border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-heading font-bold text-sky-900">
                Belum Ada Data Operasional pada Periode Ini
              </h3>
              <p className="text-xs text-sky-700 mt-0.5">
                Anda dapat mulai menambahkan catatan pendapatan, pengeluaran, gaji, piutang, dan pemeliharaan alat secara manual, atau muat data sampel untuk melihat simulasi laporan lengkap.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSeedSample}
            disabled={seeding}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-50 flex-shrink-0"
          >
            {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Isi Data Sampel Operasional</span>
          </button>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-20 text-center">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Menghitung laporan keuangan & operasional...</p>
        </div>
      ) : (
        <>
          {/* Primary 4 Executive KPI Cards: Pendapatan, Pengeluaran, Selisih, Keuntungan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* 1. Pendapatan */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-medium text-slate-500 block">
                  Total Pendapatan ({formatMonthLabel(report?.period)})
                </span>
                <span className="text-xl sm:text-2xl font-heading font-extrabold text-emerald-700 mt-1 block truncate">
                  {formatRupiah(summary.totalRevenue)}
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {lists.revenues.length} transaksi tercatat
                </span>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            {/* 2. Pengeluaran */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-medium text-slate-500 block">
                  Total Pengeluaran Operasional
                </span>
                <span className="text-xl sm:text-2xl font-heading font-extrabold text-rose-600 mt-1 block truncate">
                  {formatRupiah(summary.totalExpenses)}
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Umum + Gaji + Pemeliharaan Alat
                </span>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>

            {/* 3. Selisih */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-medium text-slate-500 block">
                  Selisih (Pendapatan − Pengeluaran)
                </span>
                <span
                  className={`text-xl sm:text-2xl font-heading font-extrabold mt-1 block truncate ${
                    (summary.variance || 0) >= 0 ? 'text-sky-700' : 'text-red-600'
                  }`}
                >
                  {(summary.variance || 0) > 0 ? '+' : ''}
                  {formatRupiah(summary.variance)}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 ${
                    (summary.variance || 0) >= 0
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {(summary.variance || 0) >= 0 ? 'SURPLUS KAS' : 'DEFISIT KAS'}
                </span>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0">
                <Scale className="w-5 h-5" />
              </div>
            </div>

            {/* 4. Keuntungan & Margin */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-medium text-slate-500 block">
                  Keuntungan Bersih & Margin
                </span>
                <span
                  className={`text-xl sm:text-2xl font-heading font-extrabold mt-1 block truncate ${
                    (summary.netProfit || 0) >= 0 ? 'text-indigo-700' : 'text-red-600'
                  }`}
                >
                  {formatRupiah(summary.netProfit)}
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Margin: <strong className="text-slate-800">{summary.profitMarginPercent || 0}%</strong> • Laba Kotor:{' '}
                  <strong className="text-slate-800">{formatRupiah(summary.grossProfit)}</strong>
                </span>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                <BadgeDollarSign className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Secondary 3 Operational KPI Cards: Gaji, Piutang, Pemeliharaan Alat */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Gaji */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-slate-500 block">
                  Beban Gaji Dokter & Staf
                </span>
                <span className="text-lg font-heading font-extrabold text-slate-900 mt-1 block">
                  {formatRupiah(summary.payrollTotal)}
                </span>
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px]">
                  <span className="text-emerald-700 font-semibold">
                    Dibayar: {formatRupiah(summary.payrollPaid)}
                  </span>
                  <span className="text-amber-600 font-semibold">
                    • Pending: {formatRupiah(summary.payrollPending)}
                  </span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5" />
              </div>
            </div>

            {/* Piutang */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-slate-500 block">
                  Sisa Piutang Belum Lunas
                </span>
                <span className="text-lg font-heading font-extrabold text-amber-700 mt-1 block">
                  {formatRupiah(summary.receivablesOutstanding)}
                </span>
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px]">
                  <span className="text-slate-600">
                    Tertagih: <strong>{formatRupiah(summary.receivablesCollected)}</strong>
                  </span>
                  {(summary.receivablesOverdueCount || 0) > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-bold">
                      {summary.receivablesOverdueCount} Jatuh Tempo
                    </span>
                  )}
                </div>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
            </div>

            {/* Pemeliharaan Alat Medis */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-slate-500 block">
                  Pemeliharaan Alat Medis
                </span>
                <span className="text-lg font-heading font-extrabold text-slate-900 mt-1 block">
                  {formatRupiah(summary.maintenanceCost)}
                </span>
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-slate-600">
                  <span>{summary.maintenanceScheduledCount || 0} Terjadwal</span>
                  <span>• {summary.maintenanceInProgressCount || 0} Proses</span>
                  <span className="text-emerald-700 font-semibold">
                    • {summary.maintenanceCompletedCount || 0} Selesai
                  </span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center flex-shrink-0">
                <Wrench className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Tab Navigation + Search Toolbar */}
          <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3 print:hidden">
            <div className="flex flex-wrap items-center gap-1.5">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSearchQuery('');
                    }}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      active
                        ? 'bg-[#084C61] text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {activeTab !== 'overview' && (
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Cari transaksi / nama / kode..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const typeMap = {
                      revenues: 'revenue',
                      expenses: 'expense',
                      payrolls: 'payroll',
                      receivables: 'receivable',
                      maintenances: 'maintenance',
                    };
                    openCreateModal(typeMap[activeTab]);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold transition cursor-pointer shadow-sm flex-shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Data</span>
                </button>
              </div>
            )}
          </div>

          {/* ================================================================= */}
          {/* TAB 1: RINGKASAN & LABA RUGI                                       */}
          {/* ================================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Structured Income Statement (Laba Rugi) */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h2 className="font-heading font-bold text-base text-slate-900">
                        Laporan Laba Rugi & Selisih Operasional
                      </h2>
                      <p className="text-xs text-slate-500">
                        Periode: {formatMonthLabel(report?.period)}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        (summary.netProfit || 0) >= 0
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {(summary.netProfit || 0) >= 0 ? 'Profit / Surplus' : 'Rugi / Defisit'}
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    {/* Pendapatan */}
                    <div className="space-y-1.5">
                      <div className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                        A. Pendapatan Operasional
                      </div>
                      {Object.entries(REVENUE_CATEGORIES).map(([key, label]) => {
                        const val = report?.breakdowns?.revenueByCategory?.[key] || 0;
                        if (val === 0) return null;
                        return (
                          <div key={key} className="flex items-center justify-between pl-3 text-slate-600">
                            <span>{label}</span>
                            <span className="font-mono font-semibold text-slate-800">{formatRupiah(val)}</span>
                          </div>
                        );
                      })}
                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 font-bold text-emerald-700 text-sm">
                        <span>Total Pendapatan</span>
                        <span className="font-mono">{formatRupiah(summary.totalRevenue)}</span>
                      </div>
                    </div>

                    {/* Pengeluaran Umum */}
                    <div className="space-y-1.5 pt-2">
                      <div className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                        B. Pengeluaran Operasional Umum
                      </div>
                      {Object.entries(EXPENSE_CATEGORIES).map(([key, label]) => {
                        const val = report?.breakdowns?.expenseByCategory?.[key] || 0;
                        if (val === 0) return null;
                        return (
                          <div key={key} className="flex items-center justify-between pl-3 text-slate-600">
                            <span>{label}</span>
                            <span className="font-mono font-semibold text-slate-800">{formatRupiah(val)}</span>
                          </div>
                        );
                      })}
                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 font-semibold text-slate-800">
                        <span>Subtotal Pengeluaran Umum</span>
                        <span className="font-mono text-rose-600">{formatRupiah(summary.generalExpenses)}</span>
                      </div>
                      <div className="flex items-center justify-between pl-3 py-1.5 rounded-lg bg-slate-50 px-3 font-bold text-slate-900">
                        <span>Laba Kotor (Pendapatan − Pengeluaran Umum)</span>
                        <span className="font-mono">{formatRupiah(summary.grossProfit)}</span>
                      </div>
                    </div>

                    {/* Beban Gaji & Pemeliharaan Alat */}
                    <div className="space-y-1.5 pt-2">
                      <div className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                        C. Beban Gaji & Pemeliharaan Alat Medis
                      </div>
                      <div className="flex items-center justify-between pl-3 text-slate-600">
                        <span>Beban Gaji Dokter & Staf</span>
                        <span className="font-mono font-semibold text-slate-800">{formatRupiah(summary.payrollTotal)}</span>
                      </div>
                      <div className="flex items-center justify-between pl-3 text-slate-600">
                        <span>Biaya Pemeliharaan & Kalibrasi Alat Medis</span>
                        <span className="font-mono font-semibold text-slate-800">{formatRupiah(summary.maintenanceCost)}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 font-bold text-rose-700">
                        <span>Total Seluruh Pengeluaran (B + C)</span>
                        <span className="font-mono">{formatRupiah(summary.totalExpenses)}</span>
                      </div>
                    </div>

                    {/* Selisih & Keuntungan Bersih */}
                    <div className="pt-3 border-t-2 border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between text-sm sm:text-base font-heading font-extrabold">
                        <span className="text-slate-900">Selisih / Keuntungan Bersih (Laba Bersih)</span>
                        <span
                          className={`font-mono ${
                            (summary.netProfit || 0) >= 0 ? 'text-emerald-700' : 'text-red-600'
                          }`}
                        >
                          {formatRupiah(summary.netProfit)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Margin Keuntungan Bersih</span>
                        <span className="font-bold text-slate-800">{summary.profitMarginPercent || 0}%</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Posisi Piutang Tertunggak (Belum Lunas)</span>
                        <span className="font-bold text-amber-700">{formatRupiah(summary.receivablesOutstanding)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6-Month Trend + Clinical Context */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Monthly Trend */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
                    <div className="border-b border-slate-100 pb-3">
                      <h2 className="font-heading font-bold text-base text-slate-900">
                        Tren 6 Bulan Terakhir
                      </h2>
                      <p className="text-xs text-slate-500">
                        Perbandingan Pendapatan vs Total Pengeluaran
                      </p>
                    </div>

                    <div className="space-y-3">
                      {monthlyTrend.map((row) => {
                        const revPct = Math.round(((row.revenue || 0) / maxTrendValue) * 100);
                        const expPct = Math.round(((row.expense || 0) / maxTrendValue) * 100);
                        return (
                          <div key={row.month} className="space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-700">{formatMonthLabel(row.month)}</span>
                              <span
                                className={`font-mono font-bold ${
                                  row.profit >= 0 ? 'text-emerald-700' : 'text-red-600'
                                }`}
                              >
                                {row.profit >= 0 ? '+' : ''}
                                {formatRupiah(row.profit)}
                              </span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="w-16 text-[10px] text-slate-400">Masuk</span>
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500 rounded-full transition-all"
                                    style={{ width: `${revPct}%` }}
                                  />
                                </div>
                                <span className="w-24 text-right font-mono text-[10px] text-slate-600">
                                  {formatRupiah(row.revenue)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-16 text-[10px] text-slate-400">Keluar</span>
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-rose-500 rounded-full transition-all"
                                    style={{ width: `${expPct}%` }}
                                  />
                                </div>
                                <span className="w-24 text-right font-mono text-[10px] text-slate-600">
                                  {formatRupiah(row.expense)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Clinical Operational Metrics */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-3">
                    <h2 className="font-heading font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-sky-600" />
                      <span>Aktivitas Klinis MedFlow ({formatMonthLabel(report?.period)})</span>
                    </h2>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-slate-500 block text-[11px]">Kunjungan Selesai</span>
                        <span className="text-lg font-heading font-bold text-slate-900">
                          {clinicalContext.completedAppointments || 0}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-slate-500 block text-[11px]">Resep Diambil</span>
                        <span className="text-lg font-heading font-bold text-slate-900">
                          {clinicalContext.pickedUpPrescriptions || 0}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-slate-500 block text-[11px]">Dokter Aktif</span>
                        <span className="text-lg font-heading font-bold text-slate-900">
                          {clinicalContext.activeDoctorsCount || 0}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-slate-500 block text-[11px]">Total Unit Obat</span>
                        <span className="text-lg font-heading font-bold text-slate-900">
                          {(clinicalContext.totalInventoryUnits || 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: PENDAPATAN                                                 */}
          {/* ================================================================= */}
          {activeTab === 'revenues' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {filteredRevenues.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  Belum ada catatan pendapatan pada periode ini.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="py-3 px-4">Tanggal & Ref</th>
                        <th className="py-3 px-4">Kategori</th>
                        <th className="py-3 px-4">Deskripsi</th>
                        <th className="py-3 px-4">Metode</th>
                        <th className="py-3 px-4 text-right">Nominal</th>
                        <th className="py-3 px-4 text-right print:hidden">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRevenues.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-900">{formatDateIndo(item.transaction_date)}</p>
                            <span className="text-[10px] font-mono text-slate-400">{item.reference_no || '-'}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[11px]">
                              {REVENUE_CATEGORIES[item.category] || item.category}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-medium text-slate-800">{item.description}</p>
                            {item.notes && <p className="text-[10px] text-slate-400">{item.notes}</p>}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {PAYMENT_METHODS[item.payment_method] || item.payment_method}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                            {formatRupiah(item.amount)}
                          </td>
                          <td className="py-3 px-4 text-right print:hidden">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openEditModal('revenue', item)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 cursor-pointer"
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({ type: 'revenue', id: item.id, label: item.description })
                                }
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                title="Hapus"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 3: PENGELUARAN                                                */}
          {/* ================================================================= */}
          {activeTab === 'expenses' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {filteredExpenses.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  Belum ada catatan pengeluaran umum pada periode ini.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="py-3 px-4">Tanggal & Ref</th>
                        <th className="py-3 px-4">Kategori</th>
                        <th className="py-3 px-4">Deskripsi</th>
                        <th className="py-3 px-4">Vendor / Pemasok</th>
                        <th className="py-3 px-4 text-right">Nominal</th>
                        <th className="py-3 px-4 text-right print:hidden">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredExpenses.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-900">{formatDateIndo(item.transaction_date)}</p>
                            <span className="text-[10px] font-mono text-slate-400">{item.reference_no || '-'}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold text-[11px]">
                              {EXPENSE_CATEGORIES[item.category] || item.category}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-medium text-slate-800">{item.description}</p>
                            {item.notes && <p className="text-[10px] text-slate-400">{item.notes}</p>}
                          </td>
                          <td className="py-3 px-4 text-slate-600">{item.vendor || '-'}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                            {formatRupiah(item.amount)}
                          </td>
                          <td className="py-3 px-4 text-right print:hidden">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openEditModal('expense', item)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 cursor-pointer"
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({ type: 'expense', id: item.id, label: item.description })
                                }
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                title="Hapus"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 4: GAJI (PAYROLL)                                             */}
          {/* ================================================================= */}
          {activeTab === 'payrolls' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {filteredPayrolls.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  Belum ada data penggajian pada periode ini.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="py-3 px-4">Nama & Jabatan</th>
                        <th className="py-3 px-4">Periode</th>
                        <th className="py-3 px-4 text-right">Gaji Pokok</th>
                        <th className="py-3 px-4 text-right">Tunjangan / Jasa</th>
                        <th className="py-3 px-4 text-right">Potongan</th>
                        <th className="py-3 px-4 text-right">Gaji Bersih</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right print:hidden">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPayrolls.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{p.employee_name}</p>
                            <span className="text-[11px] text-slate-500">{p.role_title}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">{p.period_month}</td>
                          <td className="py-3 px-4 text-right font-mono">{formatRupiah(p.base_salary)}</td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-700">+{formatRupiah(p.allowance)}</td>
                          <td className="py-3 px-4 text-right font-mono text-rose-600">-{formatRupiah(p.deduction)}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            {formatRupiah(p.net_salary)}
                          </td>
                          <td className="py-3 px-4">
                            {p.status === 'PAID' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                                <CheckCircle2 className="w-3 h-3" />
                                Dibayar
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px]">
                                <Clock className="w-3 h-3" />
                                Menunggu
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right print:hidden">
                            <div className="flex items-center justify-end gap-1">
                              {p.status !== 'PAID' && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickMarkPayrollPaid(p)}
                                  className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-semibold cursor-pointer"
                                >
                                  Bayar
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openEditModal('payroll', p)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 cursor-pointer"
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({ type: 'payroll', id: p.id, label: `${p.employee_name} (${p.period_month})` })
                                }
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                title="Hapus"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 5: PIUTANG                                                    */}
          {/* ================================================================= */}
          {activeTab === 'receivables' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {filteredReceivables.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  Belum ada catatan piutang pasien atau asuransi.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="py-3 px-4">Invoice & Debitur</th>
                        <th className="py-3 px-4">Jatuh Tempo</th>
                        <th className="py-3 px-4 text-right">Total Tagihan</th>
                        <th className="py-3 px-4 text-right">Sudah Dibayar</th>
                        <th className="py-3 px-4 text-right">Sisa Piutang</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right print:hidden">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredReceivables.map((rec) => {
                        const statusStyles = {
                          PAID: 'bg-emerald-50 text-emerald-700',
                          PARTIAL: 'bg-sky-50 text-sky-700',
                          UNPAID: 'bg-amber-50 text-amber-700',
                          OVERDUE: 'bg-red-50 text-red-700',
                        };
                        const statusLabels = {
                          PAID: 'Lunas',
                          PARTIAL: 'Dibayar Sebagian',
                          UNPAID: 'Belum Lunas',
                          OVERDUE: 'Jatuh Tempo',
                        };
                        return (
                          <tr key={rec.id} className="hover:bg-slate-50/60">
                            <td className="py-3 px-4">
                              <p className="font-bold text-slate-900">{rec.debtor_name}</p>
                              <p className="text-[10px] font-mono text-slate-400">
                                {rec.invoice_number} • {DEBTOR_TYPES[rec.debtor_type] || rec.debtor_type}
                              </p>
                              {rec.description && (
                                <p className="text-[11px] text-slate-500 mt-0.5">{rec.description}</p>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-600">
                              {formatDateIndo(rec.due_date)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-semibold">
                              {formatRupiah(rec.total_amount)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-emerald-700">
                              {formatRupiah(rec.paid_amount)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">
                              {formatRupiah(rec.remaining_amount)}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                  statusStyles[rec.effective_status] || 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {statusLabels[rec.effective_status] || rec.effective_status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right print:hidden">
                              <div className="flex items-center justify-end gap-1">
                                {rec.remaining_amount > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => openPaymentModal(rec)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-semibold cursor-pointer"
                                  >
                                    <CreditCard className="w-3 h-3" />
                                    <span>Bayar</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => openEditModal('receivable', rec)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 cursor-pointer"
                                  title="Edit"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteTarget({
                                      type: 'receivable',
                                      id: rec.id,
                                      label: `${rec.invoice_number} (${rec.debtor_name})`,
                                    })
                                  }
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 6: PEMELIHARAAN ALAT MEDIS                                    */}
          {/* ================================================================= */}
          {activeTab === 'maintenances' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {filteredMaintenances.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  Belum ada catatan pemeliharaan alat medis pada periode ini.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="py-3 px-4">Alat Medis & Unit</th>
                        <th className="py-3 px-4">Jenis</th>
                        <th className="py-3 px-4">Tanggal & Jadwal Ulang</th>
                        <th className="py-3 px-4">Vendor / Teknisi</th>
                        <th className="py-3 px-4 text-right">Biaya</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right print:hidden">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMaintenances.map((m) => {
                        const statusMap = {
                          SCHEDULED: { label: 'Terjadwal', cls: 'bg-amber-50 text-amber-700' },
                          IN_PROGRESS: { label: 'Dikerjakan', cls: 'bg-sky-50 text-sky-700' },
                          COMPLETED: { label: 'Selesai', cls: 'bg-emerald-50 text-emerald-700' },
                        };
                        const st = statusMap[m.status] || { label: m.status, cls: 'bg-slate-100 text-slate-700' };
                        return (
                          <tr key={m.id} className="hover:bg-slate-50/60">
                            <td className="py-3 px-4">
                              <p className="font-bold text-slate-900">{m.equipment_name}</p>
                              <span className="text-[10px] font-mono text-slate-400">
                                {m.equipment_code} • {m.department || 'Umum'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-800 font-semibold text-[11px]">
                                {MAINTENANCE_TYPES[m.maintenance_type] || m.maintenance_type}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <p className="font-semibold text-slate-800">{formatDateIndo(m.maintenance_date)}</p>
                              {m.next_maintenance_date && (
                                <span className="text-[10px] text-slate-400">
                                  Berikutnya: {formatDateIndo(m.next_maintenance_date)}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-600">{m.vendor_name || '-'}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                              {formatRupiah(m.cost)}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${st.cls}`}>
                                {st.label}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right print:hidden">
                              <div className="flex items-center justify-end gap-1">
                                {m.status !== 'COMPLETED' && (
                                  <button
                                    type="button"
                                    onClick={() => handleQuickMaintenanceStatus(m, 'COMPLETED')}
                                    className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-semibold cursor-pointer"
                                  >
                                    Selesai
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => openEditModal('maintenance', m)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 cursor-pointer"
                                  title="Edit"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteTarget({
                                      type: 'maintenance',
                                      id: m.id,
                                      label: `${m.equipment_name} (${m.equipment_code})`,
                                    })
                                  }
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ================================================================= */}
      {/* ADD / EDIT MODAL FOR ALL 5 ENTITIES                               */}
      {/* ================================================================= */}
      {modalType && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveModal}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-heading font-bold text-base text-slate-900">
                {editingItem ? 'Edit ' : 'Tambah '}
                {modalType === 'revenue' && 'Catatan Pendapatan'}
                {modalType === 'expense' && 'Catatan Pengeluaran'}
                {modalType === 'payroll' && 'Data Gaji Pegawai / Dokter'}
                {modalType === 'receivable' && 'Data Piutang'}
                {modalType === 'maintenance' && 'Pemeliharaan Alat Medis'}
              </h3>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Form: REVENUE */}
            {modalType === 'revenue' && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tanggal *</label>
                    <input
                      type="date"
                      required
                      value={formState.transaction_date || ''}
                      onChange={(e) => setFormState({ ...formState, transaction_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">No. Referensi</label>
                    <input
                      type="text"
                      value={formState.reference_no || ''}
                      onChange={(e) => setFormState({ ...formState, reference_no: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Kategori *</label>
                    <select
                      value={formState.category || 'POLI_SERVICE'}
                      onChange={(e) => setFormState({ ...formState, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    >
                      {Object.entries(REVENUE_CATEGORIES).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Metode Pembayaran</label>
                    <select
                      value={formState.payment_method || 'CASH'}
                      onChange={(e) => setFormState({ ...formState, payment_method: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    >
                      {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Deskripsi Pendapatan *</label>
                  <input
                    type="text"
                    required
                    value={formState.description || ''}
                    onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                    placeholder="Contoh: Layanan konsultasi Poli Umum..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nominal (Rp) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formState.amount || ''}
                    onChange={(e) => setFormState({ ...formState, amount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Catatan</label>
                  <textarea
                    rows={2}
                    value={formState.notes || ''}
                    onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
            )}

            {/* Form: EXPENSE */}
            {modalType === 'expense' && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tanggal *</label>
                    <input
                      type="date"
                      required
                      value={formState.transaction_date || ''}
                      onChange={(e) => setFormState({ ...formState, transaction_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">No. Referensi</label>
                    <input
                      type="text"
                      value={formState.reference_no || ''}
                      onChange={(e) => setFormState({ ...formState, reference_no: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Kategori *</label>
                    <select
                      value={formState.category || 'MEDICINE_PURCHASE'}
                      onChange={(e) => setFormState({ ...formState, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    >
                      {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Vendor / Pemasok</label>
                    <input
                      type="text"
                      value={formState.vendor || ''}
                      onChange={(e) => setFormState({ ...formState, vendor: e.target.value })}
                      placeholder="PT Kimia Farma, PLN..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Deskripsi Pengeluaran *</label>
                  <input
                    type="text"
                    required
                    value={formState.description || ''}
                    onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                    placeholder="Contoh: Pembelian stok obat bulanan..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nominal (Rp) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formState.amount || ''}
                    onChange={(e) => setFormState({ ...formState, amount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Catatan</label>
                  <textarea
                    rows={2}
                    value={formState.notes || ''}
                    onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
            )}

            {/* Form: PAYROLL */}
            {modalType === 'payroll' && (
              <div className="space-y-3 text-xs">
                {references.doctors.length > 0 && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Pilih dari Daftar Dokter (Opsional)</label>
                    <select
                      value={formState.doctor_id || ''}
                      onChange={(e) => {
                        const docId = e.target.value;
                        const doc = references.doctors.find((d) => String(d.id) === docId);
                        setFormState({
                          ...formState,
                          doctor_id: docId,
                          employee_name: doc ? doc.full_name : formState.employee_name,
                          role_title: doc ? 'Dokter Spesialis / Umum' : formState.role_title,
                        });
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    >
                      <option value="">-- Input Staf / Pegawai Manual --</option>
                      {references.doctors.map((d) => (
                        <option key={d.id} value={d.id}>{d.full_name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nama Pegawai / Dokter *</label>
                    <input
                      type="text"
                      required
                      value={formState.employee_name || ''}
                      onChange={(e) => setFormState({ ...formState, employee_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Jabatan / Profesi *</label>
                    <input
                      type="text"
                      required
                      value={formState.role_title || ''}
                      onChange={(e) => setFormState({ ...formState, role_title: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Periode Bulan *</label>
                    <input
                      type="month"
                      required
                      value={formState.period_month || ''}
                      onChange={(e) => setFormState({ ...formState, period_month: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Status Pembayaran</label>
                    <select
                      value={formState.status || 'PENDING'}
                      onChange={(e) => setFormState({ ...formState, status: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    >
                      <option value="PENDING">Menunggu Pencairan</option>
                      <option value="PAID">Sudah Dibayar</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Gaji Pokok *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formState.base_salary || ''}
                      onChange={(e) => setFormState({ ...formState, base_salary: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tunjangan</label>
                    <input
                      type="number"
                      min="0"
                      value={formState.allowance || '0'}
                      onChange={(e) => setFormState({ ...formState, allowance: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Potongan</label>
                    <input
                      type="number"
                      min="0"
                      value={formState.deduction || '0'}
                      onChange={(e) => setFormState({ ...formState, deduction: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                    />
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="font-semibold text-slate-600">Estimasi Gaji Bersih:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatRupiah(
                      Math.max(
                        (Number(formState.base_salary) || 0) +
                          (Number(formState.allowance) || 0) -
                          (Number(formState.deduction) || 0),
                        0
                      )
                    )}
                  </span>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Catatan</label>
                  <input
                    type="text"
                    value={formState.notes || ''}
                    onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
            )}

            {/* Form: RECEIVABLE */}
            {modalType === 'receivable' && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">No. Invoice *</label>
                    <input
                      type="text"
                      required
                      value={formState.invoice_number || ''}
                      onChange={(e) => setFormState({ ...formState, invoice_number: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Jenis Debitur *</label>
                    <select
                      value={formState.debtor_type || 'PATIENT'}
                      onChange={(e) => setFormState({ ...formState, debtor_type: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    >
                      {Object.entries(DEBTOR_TYPES).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {formState.debtor_type === 'PATIENT' && references.patients.length > 0 && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tautkan Pasien (Opsional)</label>
                    <select
                      value={formState.patient_id || ''}
                      onChange={(e) => {
                        const pId = e.target.value;
                        const pt = references.patients.find((x) => String(x.id) === pId);
                        setFormState({
                          ...formState,
                          patient_id: pId,
                          debtor_name: pt ? `${pt.full_name} (${pt.medical_record_no})` : formState.debtor_name,
                        });
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    >
                      <option value="">-- Input Nama Debitur Manual --</option>
                      {references.patients.map((pt) => (
                        <option key={pt.id} value={pt.id}>
                          {pt.full_name} ({pt.medical_record_no})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Debitur / Penjamin *</label>
                  <input
                    type="text"
                    required
                    value={formState.debtor_name || ''}
                    onChange={(e) => setFormState({ ...formState, debtor_name: e.target.value })}
                    placeholder="BPJS Kesehatan, Asuransi, atau Nama Pasien"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Total Tagihan *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formState.total_amount || ''}
                      onChange={(e) => setFormState({ ...formState, total_amount: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Sudah Dibayar</label>
                    <input
                      type="number"
                      min="0"
                      value={formState.paid_amount || '0'}
                      onChange={(e) => setFormState({ ...formState, paid_amount: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Jatuh Tempo *</label>
                    <input
                      type="date"
                      required
                      value={formState.due_date || ''}
                      onChange={(e) => setFormState({ ...formState, due_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Keterangan Tagihan</label>
                  <input
                    type="text"
                    value={formState.description || ''}
                    onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
            )}

            {/* Form: MAINTENANCE */}
            {modalType === 'maintenance' && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Kode Alat Medis *</label>
                    <input
                      type="text"
                      required
                      value={formState.equipment_code || ''}
                      onChange={(e) => setFormState({ ...formState, equipment_code: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Unit / Ruangan / Poli</label>
                    <input
                      type="text"
                      value={formState.department || ''}
                      onChange={(e) => setFormState({ ...formState, department: e.target.value })}
                      placeholder="Radiologi, Poli Gigi, Lab..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Alat Medis *</label>
                  <input
                    type="text"
                    required
                    value={formState.equipment_name || ''}
                    onChange={(e) => setFormState({ ...formState, equipment_name: e.target.value })}
                    placeholder="Contoh: Mesin USG 4D, Dental Unit..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Jenis Pemeliharaan</label>
                    <select
                      value={formState.maintenance_type || 'PREVENTIVE'}
                      onChange={(e) => setFormState({ ...formState, maintenance_type: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    >
                      {Object.entries(MAINTENANCE_TYPES).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Status</label>
                    <select
                      value={formState.status || 'SCHEDULED'}
                      onChange={(e) => setFormState({ ...formState, status: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    >
                      <option value="SCHEDULED">Terjadwal</option>
                      <option value="IN_PROGRESS">Sedang Dikerjakan</option>
                      <option value="COMPLETED">Selesai</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tanggal Pemeliharaan *</label>
                    <input
                      type="date"
                      required
                      value={formState.maintenance_date || ''}
                      onChange={(e) => setFormState({ ...formState, maintenance_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Jadwal Berikutnya</label>
                    <input
                      type="date"
                      value={formState.next_maintenance_date || ''}
                      onChange={(e) => setFormState({ ...formState, next_maintenance_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Vendor / Teknisi</label>
                    <input
                      type="text"
                      value={formState.vendor_name || ''}
                      onChange={(e) => setFormState({ ...formState, vendor_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Biaya (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      value={formState.cost || '0'}
                      onChange={(e) => setFormState({ ...formState, cost: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Catatan Teknis</label>
                  <textarea
                    rows={2}
                    value={formState.notes || ''}
                    onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setModalType(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Data'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================================================================= */}
      {/* RECEIVABLE PAYMENT MODAL                                          */}
      {/* ================================================================= */}
      {paymentTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleRecordPayment}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-heading font-bold text-sm text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Catat Pembayaran Piutang</span>
              </h3>
              <button
                type="button"
                onClick={() => setPaymentTarget(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
              <p className="font-bold text-slate-900">{paymentTarget.debtor_name}</p>
              <p className="text-slate-500 font-mono">{paymentTarget.invoice_number}</p>
              <p className="text-slate-700 pt-1">
                Sisa Tagihan: <strong className="text-amber-700 font-mono">{formatRupiah(paymentTarget.remaining_amount)}</strong>
              </p>
            </div>

            {modalError && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
                {modalError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nominal Dibayarkan (Rp) *</label>
                <input
                  type="number"
                  min="1"
                  max={paymentTarget.remaining_amount}
                  required
                  value={paymentForm.payment_amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_amount: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-sm"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Metode Pembayaran</label>
                <select
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                >
                  {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-slate-700 font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={paymentForm.record_as_revenue}
                  onChange={(e) => setPaymentForm({ ...paymentForm, record_as_revenue: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600"
                />
                <span>Otomatis catat pelunasan ini sebagai Pendapatan masuk</span>
              </label>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan</label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setPaymentTarget(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Konfirmasi Pembayaran'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================================================================= */}
      {/* DELETE CONFIRMATION MODAL                                         */}
      {/* ================================================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-heading font-bold text-sm text-slate-900 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-600" />
                <span>Hapus Data Laporan</span>
              </h3>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus data <strong className="text-slate-900">{deleteTarget.label}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>

            {modalError && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
                {modalError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setDeleteTarget(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteConfirm}
                className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
