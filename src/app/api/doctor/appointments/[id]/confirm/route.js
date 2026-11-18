import { confirmAppointment } from '@/services/doctorService';
import { toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function PATCH(_request, { params }) {
  try {
    const { id } = await params;
    const result = await confirmAppointment(id);
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('PATCH /api/doctor/appointments/[id]/confirm error:', err);
    return errorResponse('Gagal mengonfirmasi janji temu.', 500);
  }
}
