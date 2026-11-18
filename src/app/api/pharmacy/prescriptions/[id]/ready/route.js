import { markReady } from '@/services/pharmacyService';
import { toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function PATCH(_request, { params }) {
  try {
    const { id } = await params;
    const result = await markReady(id);
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('PATCH /api/pharmacy/prescriptions/[id]/ready error:', err);
    return errorResponse('Gagal menandai resep siap diambil.', 500);
  }
}
