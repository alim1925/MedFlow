import { toggleUserActive } from '@/services/adminService';
import { toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function PATCH(_request, { params }) {
  try {
    const { id } = await params;
    const result = await toggleUserActive(id);
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('PATCH /api/admin/users/[id]/toggle-active error:', err);
    return errorResponse('Gagal mengubah status pengguna.', 500);
  }
}
