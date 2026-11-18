import { getUsers } from '@/services/adminService';
import { toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function GET() {
  try {
    const result = await getUsers();
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('GET /api/admin/users error:', err);
    return errorResponse('Gagal memuat daftar pengguna.', 500);
  }
}
