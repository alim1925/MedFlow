import { updatePoli } from '@/services/adminService';
import { parseRequestBody, toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await parseRequestBody(request);
    const result = await updatePoli(id, body);
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('PATCH /api/admin/polis/[id] error:', err);
    return errorResponse('Gagal memperbarui poliklinik.', 500);
  }
}
