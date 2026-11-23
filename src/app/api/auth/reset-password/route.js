import { destroySession } from '@/lib/auth';
import {
  verifyPasswordResetToken,
  resetPasswordWithToken,
} from '@/services/authService';
import { parseRequestBody, toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function GET(request) {
  try {
    const token = request.nextUrl.searchParams.get('token') || '';
    const result = await verifyPasswordResetToken(token);
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('GET /api/auth/reset-password error:', err);
    return errorResponse('Gagal memverifikasi tautan reset kata sandi.', 500);
  }
}

export async function POST(request) {
  try {
    const body = await parseRequestBody(request);
    const result = await resetPasswordWithToken(body);
    if (result?.success) {
      await destroySession().catch(() => {});
    }
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('POST /api/auth/reset-password error:', err);
    return errorResponse('Terjadi kesalahan sistem saat memperbarui kata sandi.', 500);
  }
}
