'use client';

import { useState } from 'react';
import {
  Calendar,
  User,
  ChevronDown,
  Activity,
  FileText,
  Clock,
  ShieldAlert,
  Stethoscope,
  HeartPulse,
  Thermometer,
  Weight,
  Sparkles
} from 'lucide-react';

function formatDateIndo(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

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

export default function RecordsList({ records = [] }) {
  const [expandedIds, setExpandedIds] = useState(() => {
    // Expand the first record by default
    return records.length > 0 ? [records[0].id] : [];
  });

  const toggleExpand = (id) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-4">
      {records.map((rec) => {
        const isExpanded = expandedIds.includes(rec.id);
        const vital = rec.vital_signs || {};
        const addenda = rec.addenda || [];

        return (
          <div
            key={rec.id}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-200"
          >
            {/* Always-Visible Card Header */}
            <button
              type="button"
              onClick={() => toggleExpand(rec.id)}
              className="w-full p-5 text-left flex items-start justify-between gap-3 hover:bg-slate-50/70 transition cursor-pointer"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Calendar className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
                  <span>{formatDateIndo(rec.created_at || rec.appointment_date)}</span>
                  <span className="text-slate-300">•</span>
                  <span className="font-semibold text-sky-700">{rec.poli_name || 'Poli'}</span>
                </div>

                <h3 className="font-heading font-bold text-base text-slate-900 leading-snug">
                  {rec.diagnosis || 'Pemeriksaan Klinis'}
                </h3>

                <p className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
                  <Stethoscope className="w-3.5 h-3.5 text-sky-600" />
                  <span>{rec.doctor_name || 'Dokter Spesialis'}</span>
                </p>
              </div>

              <div
                className={`w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center transition-transform duration-200 flex-shrink-0 mt-1 ${
                  isExpanded ? 'rotate-180 bg-sky-100 text-sky-600' : ''
                }`}
              >
                <ChevronDown className="w-4 h-4" />
              </div>
            </button>

            {/* Expandable Content Area */}
            {isExpanded && (
              <div className="px-5 pb-5 pt-2 border-t border-slate-100 space-y-4 animate-fade-in text-xs text-slate-700">
                {/* ICD-10 Code & Complaint */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Kode ICD-10
                    </span>
                    <span className="font-mono font-bold text-slate-800">
                      {rec.icd10_code || 'Z00.0 (General Examination)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Keluhan Awal Pasien
                    </span>
                    <span className="text-slate-800 italic">
                      {rec.complaint || 'Tidak ada catatan keluhan spesifik.'}
                    </span>
                  </div>
                </div>

                {/* Vital Signs Table */}
                <div>
                  <h4 className="text-[11px] font-heading font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <HeartPulse className="w-3.5 h-3.5 text-red-500" />
                    <span>Tanda-Tanda Vital (Vital Signs)</span>
                  </h4>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-medium">Tekanan Darah</span>
                      <span className="font-bold text-slate-800 text-xs">
                        {vital.blood_pressure || vital.td || '-'} mmHg
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-medium">Nadi</span>
                      <span className="font-bold text-slate-800 text-xs">
                        {vital.pulse || vital.nadi || '-'} bpm
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-medium">Suhu Tubuh</span>
                      <span className="font-bold text-slate-800 text-xs">
                        {vital.temperature || vital.suhu || '-'} °C
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-medium">Berat Badan</span>
                      <span className="font-bold text-slate-800 text-xs">
                        {vital.weight || vital.bb || '-'} kg
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-medium">Tinggi Badan</span>
                      <span className="font-bold text-slate-800 text-xs">
                        {vital.height || vital.tb || '-'} cm
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-medium">SpO2</span>
                      <span className="font-bold text-slate-800 text-xs">
                        {vital.oxygen_saturation || vital.spo2 || '-'} %
                      </span>
                    </div>
                  </div>
                </div>

                {/* Treatment & Clinical Notes */}
                <div className="space-y-2">
                  <div>
                    <span className="text-[11px] font-heading font-bold text-slate-800 uppercase tracking-wider block mb-1">
                      Tindakan & Terapi Medis
                    </span>
                    <p className="bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                      {rec.treatment || 'Edukasi kesehatan umum dan pengobatan simptomatik.'}
                    </p>
                  </div>

                  {rec.notes && (
                    <div>
                      <span className="text-[11px] font-heading font-bold text-slate-800 uppercase tracking-wider block mb-1">
                        Catatan Tambahan Dokter
                      </span>
                      <p className="bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed text-slate-600">
                        {rec.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Addenda List (if any) */}
                {addenda.length > 0 && (
                  <div className="pt-3 border-t border-slate-100">
                    <h5 className="text-[11px] font-heading font-bold text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                      <span>Adendum Rekam Medis ({addenda.length})</span>
                    </h5>
                    <div className="space-y-2">
                      {addenda.map((ad, idx) => (
                        <div
                          key={idx}
                          className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs"
                        >
                          <div className="flex items-center justify-between text-[10px] text-amber-900 font-semibold mb-1">
                            <span>Oleh: {ad.doctor_name || 'Dokter Pemeriksa'}</span>
                            <span className="font-mono text-slate-500">
                              {formatDateTimeIndo(ad.created_at)}
                            </span>
                          </div>
                          <p className="text-slate-800 leading-relaxed">
                            {ad.notes || ad.note}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
