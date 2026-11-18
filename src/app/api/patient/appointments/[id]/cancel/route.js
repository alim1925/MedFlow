import { cancelAppointment } from '@/services/patientService';
import { toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function PATCH(_request, { params }) {
  try {
    const { id } = await params;
    const result = await cancelAppointment(id);
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('PATCH /api/patient/appointments/[id]/cancel error:', err);
    return errorResponse('Gagal membatalkan janji temu.', 500);
  }
}
