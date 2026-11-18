import { registerPatient } from '@/services/authService';
import { parseRequestBody, toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function POST(request) {
  try {
    const body = await parseRequestBody(request);
    const result = await registerPatient(body);
    return toJsonResponse(result, 201);
  } catch (err) {
    console.error('POST /api/auth/register error:', err);
    return errorResponse('Terjadi kesalahan sistem saat mendaftar.', 500);
  }
}
