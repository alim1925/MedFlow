import { getPatientProfile, updatePatientProfile } from '@/services/patientService';
import { parseRequestBody, toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function GET() {
  try {
    const result = await getPatientProfile();
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('GET /api/patient/profile error:', err);
    return errorResponse('Gagal memuat profil pasien.', 500);
  }
}

export async function PATCH(request) {
  try {
    const body = await parseRequestBody(request);
    const result = await updatePatientProfile(body);
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('PATCH /api/patient/profile error:', err);
    return errorResponse('Gagal memperbarui profil pasien.', 500);
  }
}
