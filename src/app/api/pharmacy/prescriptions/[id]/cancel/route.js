import { cancelPrescription } from '@/services/pharmacyService';
import { parseRequestBody, toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await parseRequestBody(request);
    const result = await cancelPrescription(id, body.reason);
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('PATCH /api/pharmacy/prescriptions/[id]/cancel error:', err);
    return errorResponse('Gagal membatalkan resep.', 500);
  }
}
