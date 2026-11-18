import { rejectAppointment } from '@/services/doctorService';
import { parseRequestBody, toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await parseRequestBody(request);
    const result = await rejectAppointment(id, body.reason);
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('PATCH /api/doctor/appointments/[id]/reject error:', err);
    return errorResponse('Gagal menolak janji temu.', 500);
  }
}
