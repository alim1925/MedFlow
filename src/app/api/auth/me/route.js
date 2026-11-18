import { getAuthUser } from '@/services/authService';
import { toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function GET() {
  try {
    const result = await getAuthUser();
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('GET /api/auth/me error:', err);
    return errorResponse('Gagal memeriksa sesi pengguna.', 500);
  }
}
