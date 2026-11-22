import { updateAppointmentStatusByAdmin } from '@/services/adminService';
import { parseRequestBody, toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await parseRequestBody(request);
    const result = await updateAppointmentStatusByAdmin(id, body.status, body.reason);
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('PATCH /api/admin/appointments/[id] error:', err);
    return errorResponse('Gagal memperbarui status janji temu.', 500);
  }
}
