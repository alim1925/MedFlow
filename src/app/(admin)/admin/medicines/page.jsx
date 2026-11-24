'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import { apiRequest } from '@/lib/apiClient';
import { formatRupiah } from '@/lib/currency';
import {
  Pill,
  Plus,
  Pencil,
  Trash2,
  RotateCw,
  Search,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  PackagePlus,
  Boxes,
  Lock
} from 'lucide-react';

export default function AdminMedicinesPage() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [restockQty, setRestockQty] = useState(50);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Add/Edit Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    medicine_type: 'BIASA',
    category: 'Analgesik',
    dosage_form: 'Tablet',
    unit: 'tablet',
    price: 2000,
    stock: 100,
    min_stock: 20,
  });

  const loadMedicines = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/api/admin/medicines');
      const medicines = res?.success && Array.isArray(res.data) ? res.data : [];
      const normalizedQuery = searchQuery.trim().toLowerCase();
      setMedicines(
        medicines.filter((medicine) => {
          const medType = (medicine.medicine_type || 'BIASA').toUpperCase();
          const matchesQuery =
            !normalizedQuery ||
            [medicine.name, medicine.code, medicine.category, medicine.description, medType]
              .filter(Boolean)
              .some((value) => value.toLowerCase().includes(normalizedQuery));
          const matchesType = typeFilter === 'ALL' || medType === typeFilter;
          const matchesStock =
            !lowStockOnly || medicine.stock <= medicine.min_stock;
          return matchesQuery && matchesType && matchesStock;
        })
      );
    } catch (err) {
      console.error('Error fetching medicines:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, typeFilter, lowStockOnly]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMedicines();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadMedicines]);

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      code: 'MED-' + Math.floor(1000 + Math.random() * 9000),
      name: '',
      description: '',
      medicine_type: 'BIASA',
      category: 'Analgesik',
      dosage_form: 'Tablet',
      unit: 'tablet',
      price: 2000,
      stock: 100,
      min_stock: 20,
    });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (med) => {
    setEditingId(med.id);
    setFormData({
      code: med.code || '',
      name: med.name || '',
      description: med.description || '',
      medicine_type: (med.medicine_type || 'BIASA').toUpperCase() === 'KERAS' ? 'KERAS' : 'BIASA',
      category: med.category || 'Analgesik',
      dosage_form: med.dosage_form || med.form || 'Tablet',
      unit: med.unit || 'tablet',
      price: Number(med.price) || 0,
      stock: med.stock ?? 0,
      min_stock: med.min_stock ?? 20,
    });
    setError('');
    setShowModal(true);
  };

  const openRestock = (med) => {
    setSelectedMedicine(med);
    setRestockQty(50);
    setError('');
    setShowRestockModal(true);
  };

  const openDeleteModal = (med) => {
    setSelectedMedicine(med);
    setError('');
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedMedicine) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await apiRequest(`/api/admin/medicines/${selectedMedicine.id}`, {
        method: 'DELETE',
      });
      if (res && res.success) {
        setToast(res.message || `Obat "${selectedMedicine.name}" berhasil dihapus.`);
        setShowDeleteModal(false);
        setSelectedMedicine(null);
        await loadMedicines();
      } else {
        setError(res?.error || 'Gagal menghapus obat.');
      }
    } catch (err) {
      console.error('Delete medicine error:', err);
      setError('Terjadi kendala jaringan saat menghapus obat.');
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast(''), 4000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      setError('Kode dan nama obat wajib diisi.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const form = new FormData();
      form.append('code', formData.code.trim());
      form.append('name', formData.name.trim());
      form.append('description', formData.description.trim());
      form.append('medicine_type', formData.medicine_type);
      form.append('category', formData.category);
      form.append('dosage_form', formData.dosage_form);
      form.append('unit', formData.unit);
      form.append('price', String(formData.price));
      form.append('stock', String(formData.stock));
      form.append('min_stock', String(formData.min_stock));

      let res;
      if (editingId) {
        res = await apiRequest(`/api/admin/medicines/${editingId}`, {
          method: 'PATCH',
          body: form,
        });
      } else {
        res = await apiRequest('/api/admin/medicines', {
          method: 'POST',
          body: form,
        });
      }

      if (res && res.success) {
        setToast(editingId ? 'Data obat berhasil diperbarui.' : 'Obat baru berhasil ditambahkan.');
        setShowModal(false);
        await loadMedicines();
      } else {
        setError(res?.error || 'Gagal menyimpan data obat.');
      }
    } catch (err) {
      console.error('Submit medicine error:', err);
      setError('Terjadi kendala jaringan saat menyimpan obat.');
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast(''), 4000);
    }
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMedicine || restockQty <= 0) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await apiRequest(`/api/admin/medicines/${selectedMedicine.id}/restock`, {
        method: 'POST',
        body: { quantity: parseInt(restockQty) },
      });
      if (res && res.success) {
        setToast(`Berhasil menambah ${restockQty} ${selectedMedicine.unit} untuk ${selectedMedicine.name}.`);
        setShowRestockModal(false);
        await loadMedicines();
      } else {
        setError(res?.error || 'Gagal merestock obat.');
      }
    } catch (err) {
      console.error('Restock medicine error:', err);
      setError('Terjadi kendala jaringan saat restock obat.');
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast(''), 4000);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans md:flex-row">
      <Sidebar role="ADMIN" userName="Administrator" userEmail="admin@medflow.com" />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-extrabold text-slate-900">
              Inventori Obat & Formularium
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Pantau jumlah stok gudang farmasi, ambang batas peringatan, dan mutasi barang masuk
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs sm:text-sm shadow-sm transition cursor-pointer w-fit"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Obat Baru</span>
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2.5 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{toast}</span>
          </div>
        )}

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nama obat, deskripsi, kode, kategori..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="ALL">Semua Tipe Obat</option>
              <option value="BIASA">Obat Biasa</option>
              <option value="KERAS">Obat Keras</option>
            </select>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(e) => setLowStockOnly(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300"
              />
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                Hanya Tampilkan Stok Menipis
              </span>
            </label>
          </div>
        </div>

        {/* Medicines Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="w-8 h-8 text-sky-500 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">Memuat inventori obat...</p>
            </div>
          ) : medicines.length === 0 ? (
            <div className="py-16 text-center">
              <Boxes className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-heading font-bold text-slate-700">
                Tidak Ada Obat Ditemukan
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Silakan sesuaikan pencarian atau tambahkan obat baru ke formularium.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Kode, Nama & Deskripsi Obat</th>
                    <th className="py-3 px-4">Tipe Obat</th>
                    <th className="py-3 px-4">Kategori & Bentuk</th>
                    <th className="py-3 px-4">Harga Satuan</th>
                    <th className="py-3 px-4">Stok</th>
                    <th className="py-3 px-4">Batas Min.</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {medicines.map((med) => {
                    const isLow = (med.stock || 0) <= (med.min_stock || 0);
                    const isKeras = (med.medicine_type || 'BIASA').toUpperCase() === 'KERAS';
                    const activeTxCount = Number(med.active_transaction_count) || 0;
                    const inTransaction = activeTxCount > 0;

                    return (
                      <tr
                        key={med.id}
                        className={`hover:bg-slate-50/60 transition ${
                          isLow ? 'border-l-4 border-l-amber-500 bg-amber-50/20' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="font-bold text-slate-900 text-xs sm:text-sm">
                              {med.name}
                            </p>
                            {inTransaction && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200"
                                title={`Obat ini sedang digunakan dalam ${activeTxCount} transaksi resep/pembayaran aktif`}
                              >
                                <Lock className="w-2.5 h-2.5" />
                                Dalam Transaksi ({activeTxCount})
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {med.code}
                          </span>
                          {med.description && (
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                              {med.description}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              isKeras
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-sky-50 text-sky-700 border-sky-200'
                            }`}
                          >
                            {isKeras ? 'Obat Keras' : 'Obat Biasa'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-slate-700">
                            {med.category || 'Generik'}
                          </p>
                          <span className="text-[11px] text-slate-400">
                            {med.dosage_form || med.form || 'Tablet'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <p className="font-heading font-bold text-slate-900">
                            {formatRupiah(med.price)}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            per {med.unit || 'unit'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`font-heading font-bold text-sm ${
                              isLow ? 'text-red-600' : 'text-slate-800'
                            }`}
                          >
                            {med.stock} {med.unit || 'unit'}
                          </span>
                          {isLow && (
                            <span className="block text-[10px] font-bold text-red-500">
                              Kritis!
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono">
                          {med.min_stock} {med.unit}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openRestock(med)}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                              title="Restock Obat"
                            >
                              <PackagePlus className="w-3.5 h-3.5" />
                              <span>Restock</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(med)}
                              className="p-1.5 rounded-xl text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition cursor-pointer"
                              title="Edit Data Obat"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={inTransaction}
                              onClick={() => openDeleteModal(med)}
                              className={`p-1.5 rounded-xl transition ${
                                inTransaction
                                  ? 'text-slate-300 bg-slate-100 cursor-not-allowed'
                                  : 'text-slate-500 hover:text-red-600 hover:bg-red-50 cursor-pointer'
                              }`}
                              title={
                                inTransaction
                                  ? `Tidak dapat dihapus: sedang dalam ${activeTxCount} proses transaksi aktif`
                                  : 'Hapus Obat'
                              }
                            >
                              <Trash2 className="w-4 h-4" />
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
      </main>

      {/* Add / Edit Medicine Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl animate-scale-up space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-heading font-bold text-base text-slate-900">
                {editingId ? 'Edit Data Obat' : 'Tambah Obat Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Kode Obat *
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="MED-001"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Kategori Obat
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Analgesik, Antibiotik..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Nama Obat & Dosis *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Paracetamol 500mg"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Deskripsi Obat
              </label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Indikasi, kegunaan, atau catatan penggunaan obat..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Tipe Obat *
              </label>
              <select
                value={formData.medicine_type}
                onChange={(e) => setFormData({ ...formData, medicine_type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="BIASA">Obat Biasa (Bebas / Bebas Terbatas)</option>
                <option value="KERAS">Obat Keras (Wajib Resep Dokter)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Bentuk Sediaan
                </label>
                <select
                  value={formData.dosage_form}
                  onChange={(e) => setFormData({ ...formData, dosage_form: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="Tablet">Tablet</option>
                  <option value="Kapsul">Kapsul</option>
                  <option value="Sirup">Sirup</option>
                  <option value="Injeksi">Injeksi</option>
                  <option value="Salep">Salep</option>
                  <option value="Tetes">Tetes</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Satuan
                </label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="tablet, botol, ampul..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Harga (Rp) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  {editingId ? 'Jumlah Stok' : 'Stok Awal'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Min. Stok
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.min_stock}
                  onChange={(e) => setFormData({ ...formData, min_stock: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowModal(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Obat'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Restock Modal */}
      {showRestockModal && selectedMedicine && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleRestockSubmit}
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl animate-scale-up space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-heading font-bold text-sm text-slate-900">
                Restock Inventori Obat
              </h3>
              <button
                type="button"
                onClick={() => setShowRestockModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
              <p className="font-bold text-slate-800">{selectedMedicine.name}</p>
              <p className="text-slate-500">
                Stok saat ini:{' '}
                <strong className="text-slate-900">
                  {selectedMedicine.stock} {selectedMedicine.unit}
                </strong>
              </p>
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-red-50 text-red-800 text-xs">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Jumlah Tambah Stok ({selectedMedicine.unit}) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={restockQty}
                onChange={(e) => setRestockQty(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowRestockModal(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting || restockQty <= 0}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Konfirmasi Restock'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedMedicine && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl animate-scale-up space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-heading font-bold text-sm text-slate-900 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-600" />
                <span>Hapus Obat dari Inventori</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-red-50/70 border border-red-100 text-xs space-y-1.5">
              <p className="font-bold text-slate-900">{selectedMedicine.name}</p>
              <p className="text-slate-600 font-mono">
                Kode: {selectedMedicine.code} • Sisa Stok: {selectedMedicine.stock} {selectedMedicine.unit}
              </p>
              <p className="text-red-700 pt-1 leading-relaxed">
                Apakah Anda yakin ingin menghapus obat ini? Jika obat sudah pernah diresepkan, data akan dinonaktifkan agar riwayat medis tetap aman.
              </p>
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowDeleteModal(false)}
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
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
