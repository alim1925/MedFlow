import { getDoctors, createDoctor } from '@/services/adminService';
import { parseRequestBody, toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function GET() {
  try {
    const result = await getDoctors();
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('GET /api/admin/doctors error:', err);
    return errorResponse('Gagal memuat daftar dokter.', 500);
  }
}

export async function POST(request) {
  try {
    const body = await parseRequestBody(request);
    const result = await createDoctor(body);
    return toJsonResponse(result, 201);
  } catch (err) {
    console.error('POST /api/admin/doctors error:', err);
    return errorResponse('Gagal mendaftarkan dokter.', 500);
  }
}
