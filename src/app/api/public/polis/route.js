import { getPublicPolis } from '@/services/patientService';
import { toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function GET() {
  try {
    const result = await getPublicPolis();
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('GET /api/public/polis error:', err);
    return errorResponse('Gagal memuat daftar poliklinik.', 500);
  }
}
