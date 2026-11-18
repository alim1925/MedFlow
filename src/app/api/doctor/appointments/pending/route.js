import { getPendingAppointments } from '@/services/doctorService';
import { toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function GET() {
  try {
    const result = await getPendingAppointments();
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('GET /api/doctor/appointments/pending error:', err);
    return errorResponse('Gagal memuat janji temu menunggu konfirmasi.', 500);
  }
}
