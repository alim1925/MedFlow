import { getDoctorProfile } from '@/services/doctorService';
import { toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function GET() {
  try {
    const result = await getDoctorProfile();
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('GET /api/doctor/profile error:', err);
    return errorResponse('Gagal memuat profil dokter.', 500);
  }
}
