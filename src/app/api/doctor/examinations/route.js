import { getMyExaminations } from '@/services/doctorService';
import { toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function GET() {
  try {
    const result = await getMyExaminations();
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('GET /api/doctor/examinations error:', err);
    return errorResponse('Gagal memuat riwayat pemeriksaan.', 500);
  }
}
