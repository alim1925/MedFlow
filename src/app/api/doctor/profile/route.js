import { getDoctorProfile, updateDoctorProfile } from '@/services/doctorService';
import { parseRequestBody, toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function GET() {
  try {
    const result = await getDoctorProfile();
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('GET /api/doctor/profile error:', err);
    return errorResponse('Gagal memuat profil dokter.', 500);
  }
}

export async function PATCH(request) {
  try {
    const body = await parseRequestBody(request);
    const result = await updateDoctorProfile(body);
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('PATCH /api/doctor/profile error:', err);
    return errorResponse('Gagal memperbarui profil dokter.', 500);
  }
}
