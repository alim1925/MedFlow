'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Calendar,
  Clock,
  Shield,
  ChevronDown,
  ChevronRight,
  Code,
  FileText,
  Activity
} from 'lucide-react';

function formatDateTimeIndo(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function getActionBadgeStyle(action = '') {
  const act = action.toUpperCase();
  if (act.includes('LOGIN') || act.includes('LOGOUT') || act.includes('AUTH')) {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }
  if (act.includes('REGISTER') || act.includes('CREATE') || act.includes('INSERT')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (act.includes('UPDATE') || act.includes('MODIFY') || act.includes('EDIT')) {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  if (act.includes('DELETE') || act.includes('CANCEL') || act.includes('REJECT')) {
    return 'bg-red-50 text-red-700 border-red-200';
  }
  if (act.includes('PHARMACY') || act.includes('PRESCRIPTION') || act.includes('MEDICINE') || act.includes('STOCK')) {
    return 'bg-purple-50 text-purple-700 border-purple-200';
  }
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

export default function AuditLogsClient({ initialLogs = [] }) {
  const [logs] = useState(initialLogs);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActionFilter, setSelectedActionFilter] = useState('ALL');
  const [expandedLogId, setExpandedLogId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedLogId((prev) => (prev === id ? null : id));
  };

  // Distinct actions list for dropdown
  const actionOptions = useMemo(() => {
    const set = new Set();
    logs.forEach((l) => {
      if (l.action) set.add(l.action);
    });
    return Array.from(set);
  }, [logs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const matchAction =
        selectedActionFilter === 'ALL' || l.action === selectedActionFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (l.action && l.action.toLowerCase().includes(q)) ||
        (l.user_email && l.user_email.toLowerCase().includes(q)) ||
        (l.entity && l.entity.toLowerCase().includes(q)) ||
        (l.ip_address && l.ip_address.toLowerCase().includes(q)) ||
        (l.entity_id && String(l.entity_id).toLowerCase().includes(q));

      return matchAction && matchSearch;
    });
  }, [logs, selectedActionFilter, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari aksi, email pengguna, entitas, IP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <select
            value={selectedActionFilter}
            onChange={(e) => setSelectedActionFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="ALL">Semua Jenis Aksi</option>
            {actionOptions.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-heading font-bold text-slate-700">
              Tidak Ada Catatan Log Sesuai Filter
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Jejak audit akan bertambah seiring penggunaan sistem oleh staf dan pasien.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Waktu (WIB)</th>
                  <th className="py-3 px-4">Pengguna</th>
                  <th className="py-3 px-4">Aksi</th>
                  <th className="py-3 px-4">Entitas Target</th>
                  <th className="py-3 px-4">ID Entitas</th>
                  <th className="py-3 px-4">Alamat IP</th>
                  <th className="py-3 px-3 text-center">Rincian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const badgeColor = getActionBadgeStyle(log.action);
                  const truncatedId = log.entity_id
                    ? String(log.entity_id).substring(0, 8) + '...'
                    : '-';

                  return (
                    <tr
                      key={log.id}
                      onClick={() => toggleExpand(log.id)}
                      className={`hover:bg-slate-50/70 transition cursor-pointer ${
                        isExpanded ? 'bg-sky-50/40' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {formatDateTimeIndo(log.created_at)}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {log.user_email || log.user_name || 'System / Guest'}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-medium text-slate-600">
                        {log.entity || '-'}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                        {truncatedId}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        {log.ip_address || '127.0.0.1'}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span className="text-slate-400 hover:text-sky-600 inline-block transition">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Expanded Metadata Preview Modal/Drawer */}
        {expandedLogId && (
          <div className="p-4 bg-slate-900 text-slate-200 border-t border-slate-800 text-xs font-mono animate-fade-in">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5 font-bold text-sky-400">
                <Code className="w-4 h-4" />
                Metadata Payload JSONB (Log ID: {expandedLogId})
              </span>
              <button
                type="button"
                onClick={() => setExpandedLogId(null)}
                className="text-slate-400 hover:text-white"
              >
                Tutup
              </button>
            </div>
            <pre className="overflow-x-auto p-2 bg-slate-950 rounded-lg text-[11px] text-emerald-400">
              {JSON.stringify(
                logs.find((l) => l.id === expandedLogId)?.metadata || { info: 'Tidak ada metadata JSONB tambahan.' },
                null,
                2
              )}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
