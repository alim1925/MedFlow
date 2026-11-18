import { getAppointmentWithPatient } from '@/services/doctorService';
import { toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const result = await getAppointmentWithPatient(id);
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('GET /api/doctor/appointments/[id] error:', err);
    return errorResponse('Gagal memuat detail janji temu.', 500);
  }
}
