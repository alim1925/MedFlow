import { requestPasswordReset } from '@/services/authService';
import { parseRequestBody, toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function POST(request) {
  try {
    const body = await parseRequestBody(request);
    const result = await requestPasswordReset(body);
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('POST /api/auth/forgot-password error:', err);
    return errorResponse('Terjadi kesalahan sistem saat memproses permintaan lupa sandi.', 500);
  }
}
