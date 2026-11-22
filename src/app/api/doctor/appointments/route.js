import { getDoctorAppointments } from '@/services/doctorService';
import { toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function GET(request) {
  try {
    const status = request.nextUrl.searchParams.get('status') || '';
    const result = await getDoctorAppointments(status);
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('GET /api/doctor/appointments error:', err);
    return errorResponse('Gagal memuat daftar janji temu dokter.', 500);
  }
}
