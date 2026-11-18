import { getPatientProfile } from '@/services/patientService';
import { toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function GET() {
  try {
    const result = await getPatientProfile();
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('GET /api/patient/profile error:', err);
    return errorResponse('Gagal memuat profil pasien.', 500);
  }
}
