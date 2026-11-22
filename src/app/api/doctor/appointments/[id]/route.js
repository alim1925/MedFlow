import { getAppointmentWithPatient, updateAppointmentStatusByDoctor } from '@/services/doctorService';
import { parseRequestBody, toJsonResponse, errorResponse } from '@/lib/routeHelpers';

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

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await parseRequestBody(request);
    const result = await updateAppointmentStatusByDoctor(id, body.status, body.reason);
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('PATCH /api/doctor/appointments/[id] error:', err);
    return errorResponse('Gagal memperbarui status janji temu.', 500);
  }
}
