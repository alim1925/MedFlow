import { submitFeedback } from '@/services/patientService';
import { parseRequestBody, toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await parseRequestBody(request);
    const result = await submitFeedback(id, body);
    return toJsonResponse(result, 201);
  } catch (err) {
    console.error('POST /api/patient/appointments/[id]/feedback error:', err);
    return errorResponse('Gagal menyimpan ulasan.', 500);
  }
}
