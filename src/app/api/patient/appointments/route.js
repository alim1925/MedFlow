import { getMyAppointments, bookAppointment } from '@/services/patientService';
import { parseRequestBody, toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function GET() {
  try {
    const result = await getMyAppointments();
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('GET /api/patient/appointments error:', err);
    return errorResponse('Gagal memuat daftar janji temu.', 500);
  }
}

export async function POST(request) {
  try {
    const body = await parseRequestBody(request);
    const result = await bookAppointment(body);
    return toJsonResponse(result, 201);
  } catch (err) {
    console.error('POST /api/patient/appointments error:', err);
    return errorResponse('Gagal membuat janji temu.', 500);
  }
}
