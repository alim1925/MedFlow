import { getMyPrescriptions } from '@/services/patientService';
import { toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function GET() {
  try {
    const result = await getMyPrescriptions();
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('GET /api/patient/prescriptions error:', err);
    return errorResponse('Gagal memuat resep obat.', 500);
  }
}
