'use client';

import Link from 'next/link';
import { Download, Printer } from 'lucide-react';
import { downloadMedicalRecordPdf } from '@/lib/medicalRecordPdf';

export default function MedicalRecordActions({
  recordId,
  recordData = null,
  size = 'sm',
}) {
  if (!recordId) return null;

  const isCompact = size === 'xs';
  const btnPadding = isCompact ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-xs sm:text-sm';

  const handleDownloadPdf = (e) => {
    e.stopPropagation();
    if (recordData) {
      try {
        downloadMedicalRecordPdf(recordData);
        return;
      } catch (err) {
        console.error('Client PDF generation fallback to API:', err);
      }
    }
    const link = document.createElement('a');
    link.href = `/api/medical-records/${recordId}/pdf`;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleDownloadPdf}
        className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-sm transition cursor-pointer ${btnPadding}`}
      >
        <Download className="w-3.5 h-3.5" />
        <span>Unduh PDF</span>
      </button>

      <Link
        href={`/medical-records/${recordId}/print`}
        onClick={(e) => e.stopPropagation()}
        className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-sky-300 text-slate-700 hover:text-sky-700 font-semibold transition ${btnPadding}`}
      >
        <Printer className="w-3.5 h-3.5" />
        <span>Cetak</span>
      </Link>
    </div>
  );
}
