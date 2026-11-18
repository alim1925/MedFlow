import { startProcessing } from '@/services/pharmacyService';
import { toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function PATCH(_request, { params }) {
  try {
    const { id } = await params;
    const result = await startProcessing(id);
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('PATCH /api/pharmacy/prescriptions/[id]/process error:', err);
    return errorResponse('Gagal memulai peracikan resep.', 500);
  }
}
