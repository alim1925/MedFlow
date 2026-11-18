import { markPickedUp } from '@/services/pharmacyService';
import { toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function PATCH(_request, { params }) {
  try {
    const { id } = await params;
    const result = await markPickedUp(id);
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('PATCH /api/pharmacy/prescriptions/[id]/pickup error:', err);
    return errorResponse('Gagal mengonfirmasi pengambilan obat.', 500);
  }
}
