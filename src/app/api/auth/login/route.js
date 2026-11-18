import { loginUser } from '@/services/authService';
import { parseRequestBody, toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function POST(request) {
  try {
    const body = await parseRequestBody(request);
    const result = await loginUser(body);
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('POST /api/auth/login error:', err);
    return errorResponse('Terjadi kesalahan sistem saat proses masuk.', 500);
  }
}
