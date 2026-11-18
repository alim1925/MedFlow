import { getTodaysAppointments } from '@/services/doctorService';
import { toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function GET() {
  try {
    const result = await getTodaysAppointments();
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('GET /api/doctor/appointments/today error:', err);
    return errorResponse('Gagal memuat antrean hari ini.', 500);
  }
}
