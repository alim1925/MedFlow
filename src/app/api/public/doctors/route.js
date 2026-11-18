import { getPublicDoctors } from '@/services/patientService';
import { toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function GET(request) {
  try {
    const poliId = request.nextUrl.searchParams.get('poliId') || null;
    const result = await getPublicDoctors(poliId);
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('GET /api/public/doctors error:', err);
    return errorResponse('Gagal memuat daftar dokter.', 500);
  }
}
