'use client';

import { useState, useEffect, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import { apiRequest } from '@/lib/apiClient';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  UserCheck,
  UserX,
  Shield,
  Stethoscope,
  HeartHandshake
} from 'lucide-react';

function formatDateIndo(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getInitials(name = '') {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] ? parts[0].substring(0, 2) : 'US').toUpperCase();
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');

  // Confirmation modal state
  const [targetUser, setTargetUser] = useState(null);
  const [toggling, setToggling] = useState(false);
  const [toast, setToast] = useState('');

  const loadUsersList = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/api/admin/users');
      setUsers(res?.success && Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsersList();
  }, []);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchRole = selectedRole === 'ALL' || u.role === selectedRole;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.full_name && u.full_name.toLowerCase().includes(q)) ||
        (u.medical_record_no && u.medical_record_no.toLowerCase().includes(q));

      return matchRole && matchSearch;
    });
  }, [users, selectedRole, searchQuery]);

  const handleConfirmToggle = async () => {
    if (!targetUser) return;
    setToggling(true);
    try {
      const res = await apiRequest(`/api/admin/users/${targetUser.id}/toggle-active`, {
        method: 'PATCH',
      });
      if (res && res.success) {
        setToast(`Status akun ${targetUser.email} berhasil diubah.`);
        await loadUsersList();
      } else {
        alert(res?.error || 'Gagal mengubah status akun.');
      }
    } catch (err) {
      console.error('Toggle user active error:', err);
      alert('Terjadi kesalahan saat memproses status akun.');
    } finally {
      setToggling(false);
      setTargetUser(null);
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
              Manajemen Akun Pengguna
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Kelola status aktivasi akun pasien, dokter spesialis, dan staf administrator
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 w-fit">
            <Users className="w-4 h-4" />
            <span>Total {users.length} Akun Terdaftar</span>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2.5 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{toast}</span>
          </div>
        )}

        {/* Search & Role Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nama, email, No. RM..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Role Filter Buttons */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'Semua Peran' },
              { id: 'PATIENT', label: 'Pasien' },
              { id: 'DOCTOR', label: 'Dokter' },
              { id: 'ADMIN', label: 'Admin' },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedRole(r.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedRole === r.id
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="w-8 h-8 text-sky-500 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">Memuat daftar pengguna...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-heading font-bold text-slate-700">
                Pengguna Tidak Ditemukan
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Silakan ubah filter peran atau kata kunci pencarian Anda.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Pengguna</th>
                    <th className="py-3 px-4">Peran (Role)</th>
                    <th className="py-3 px-4">Status Akun</th>
                    <th className="py-3 px-4">Tanggal Daftar</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => {
                    const initials = getInitials(u.full_name || u.email);
                    const isActive = u.is_active !== false;

                    let roleBadgeColor = 'bg-slate-100 text-slate-700';
                    let roleIcon = Users;
                    if (u.role === 'ADMIN') {
                      roleBadgeColor = 'bg-purple-50 text-purple-700 border border-purple-200';
                      roleIcon = Shield;
                    } else if (u.role === 'DOCTOR') {
                      roleBadgeColor = 'bg-sky-50 text-sky-700 border border-sky-200';
                      roleIcon = Stethoscope;
                    } else if (u.role === 'PATIENT') {
                      roleBadgeColor = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                      roleIcon = HeartHandshake;
                    }

                    const RoleIcon = roleIcon;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/60 transition">
                        {/* Avatar & Name */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 text-white font-heading font-bold text-xs flex items-center justify-center flex-shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate">
                                {u.full_name || u.email.split('@')[0]}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate font-mono">
                                {u.email}
                              </p>
                              {u.medical_record_no && (
                                <span className="text-[10px] text-sky-600 font-mono">
                                  No. RM: {u.medical_record_no}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${roleBadgeColor}`}
                          >
                            <RoleIcon className="w-3.5 h-3.5" />
                            {u.role}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                              Nonaktif
                            </span>
                          )}
                        </td>

                        {/* Registered Date */}
                        <td className="py-3 px-4 text-slate-500">
                          {formatDateIndo(u.created_at)}
                        </td>

                        {/* Action Toggle */}
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setTargetUser(u)}
                            className={`px-3 py-1.5 rounded-xl font-semibold text-xs transition cursor-pointer border ${
                              isActive
                                ? 'border-red-200 text-red-600 hover:bg-red-50'
                                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            {isActive ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>
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

      {/* Confirmation Dialog */}
      {targetUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl animate-scale-up space-y-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
                targetUser.is_active !== false
                  ? 'bg-red-50 text-red-600'
                  : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              {targetUser.is_active !== false ? (
                <UserX className="w-6 h-6" />
              ) : (
                <UserCheck className="w-6 h-6" />
              )}
            </div>

            <div className="text-center">
              <h3 className="font-heading font-bold text-base text-slate-900">
                Konfirmasi Ubah Status Akun
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin{' '}
                <strong className="text-slate-800">
                  {targetUser.is_active !== false ? 'menonaktifkan' : 'mengaktifkan kembali'}
                </strong>{' '}
                akses akun milik <span className="font-mono text-sky-600">{targetUser.email}</span>?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                disabled={toggling}
                onClick={() => setTargetUser(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={toggling}
                onClick={handleConfirmToggle}
                className={`py-2.5 px-4 rounded-xl text-white text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer ${
                  targetUser.is_active !== false
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {toggling ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : targetUser.is_active !== false ? (
                  'Ya, Nonaktifkan'
                ) : (
                  'Ya, Aktifkan'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
