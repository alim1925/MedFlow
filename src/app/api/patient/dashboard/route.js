import { getDashboardData } from '@/services/patientService';
import { toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function GET() {
  try {
    const result = await getDashboardData();
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('GET /api/patient/dashboard error:', err);
    return errorResponse('Gagal memuat data dashboard pasien.', 500);
  }
}
