import { updateMedicine } from '@/services/adminService';
import { parseRequestBody, toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await parseRequestBody(request);
    const result = await updateMedicine(id, body);
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('PATCH /api/admin/medicines/[id] error:', err);
    return errorResponse('Gagal memperbarui data obat.', 500);
  }
}
