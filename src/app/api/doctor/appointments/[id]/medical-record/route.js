import { saveMedicalRecord } from '@/services/doctorService';
import { parseRequestBody, toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await parseRequestBody(request);
    const recordData = body.recordData ?? body;
    const prescriptionItems = body.prescriptionItems ?? [];
    const result = await saveMedicalRecord(id, recordData, prescriptionItems);
    return toJsonResponse(result, 201);
  } catch (err) {
    console.error('POST /api/doctor/appointments/[id]/medical-record error:', err);
    return errorResponse('Gagal menyimpan rekam medis.', 500);
  }
}
