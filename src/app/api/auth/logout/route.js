import { logoutUser } from '@/services/authService';
import { toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function POST() {
  try {
    const result = await logoutUser();
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('POST /api/auth/logout error:', err);
    return errorResponse('Gagal keluar dari sistem.', 500);
  }
}
