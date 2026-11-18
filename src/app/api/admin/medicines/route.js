import { getMedicines, createMedicine } from '@/services/adminService';
import { parseRequestBody, toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function GET() {
  try {
    const result = await getMedicines();
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('GET /api/admin/medicines error:', err);
    return errorResponse('Gagal memuat daftar obat.', 500);
  }
}

export async function POST(request) {
  try {
    const body = await parseRequestBody(request);
    const result = await createMedicine(body);
    return toJsonResponse(result, 201);
  } catch (err) {
    console.error('POST /api/admin/medicines error:', err);
    return errorResponse('Gagal menambahkan obat.', 500);
  }
}
