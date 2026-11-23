import { NextResponse } from 'next/server';
import { getMedicalRecordDocument } from '@/services/medicalRecordDocumentService';
import { generateMedicalRecordPdfBytes, buildPdfFilename } from '@/lib/medicalRecordPdf';
import { errorResponse } from '@/lib/routeHelpers';

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const result = await getMedicalRecordDocument(id);

    if (!result?.success || !result.data) {
      return errorResponse(
        result?.error || 'Dokumen rekam medis tidak ditemukan.',
        result?.status || 404
      );
    }

    const pdfBytes = generateMedicalRecordPdfBytes(result.data);
    const filename = buildPdfFilename(result.data);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('GET /api/medical-records/[id]/pdf error:', err);
    return errorResponse('Gagal membuat dokumen PDF rekam medis.', 500);
  }
}
