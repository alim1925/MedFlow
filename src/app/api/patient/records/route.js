import { getMyMedicalRecords } from '@/services/patientService';
import { toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function GET() {
  try {
    const result = await getMyMedicalRecords();
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('GET /api/patient/records error:', err);
    return errorResponse('Gagal memuat rekam medis.', 500);
  }
}
