import { restockMedicine } from '@/services/adminService';
import { parseRequestBody, toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await parseRequestBody(request);
    const result = await restockMedicine(id, body.quantity);
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('POST /api/admin/medicines/[id]/restock error:', err);
    return errorResponse('Gagal merestock obat.', 500);
  }
}
