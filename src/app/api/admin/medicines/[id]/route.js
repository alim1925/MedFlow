import { updateMedicine, deleteMedicine } from '@/services/adminService';
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

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    const result = await deleteMedicine(id);
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('DELETE /api/admin/medicines/[id] error:', err);
    return errorResponse('Gagal menghapus data obat.', 500);
  }
}
