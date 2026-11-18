import { updateSchedule, deleteSchedule } from '@/services/doctorService';
import { parseRequestBody, toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await parseRequestBody(request);
    const result = await updateSchedule(id, body);
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('PATCH /api/doctor/schedules/[id] error:', err);
    return errorResponse('Gagal memperbarui jadwal praktik.', 500);
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    const result = await deleteSchedule(id);
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('DELETE /api/doctor/schedules/[id] error:', err);
    return errorResponse('Gagal menghapus jadwal praktik.', 500);
  }
}
