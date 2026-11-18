import { getPolis, createPoli } from '@/services/adminService';
import { parseRequestBody, toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function GET() {
  try {
    const result = await getPolis();
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('GET /api/admin/polis error:', err);
    return errorResponse('Gagal memuat daftar poliklinik.', 500);
  }
}

export async function POST(request) {
  try {
    const body = await parseRequestBody(request);
    const result = await createPoli(body);
    return toJsonResponse(result, 201);
  } catch (err) {
    console.error('POST /api/admin/polis error:', err);
    return errorResponse('Gagal menambahkan poliklinik.', 500);
  }
}
