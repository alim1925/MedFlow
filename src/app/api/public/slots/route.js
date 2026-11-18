import { getAvailableSlots } from '@/services/patientService';
import { toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function GET(request) {
  try {
    const doctorId = request.nextUrl.searchParams.get('doctorId');
    const dateStr = request.nextUrl.searchParams.get('date');
    const result = await getAvailableSlots(doctorId, dateStr);
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('GET /api/public/slots error:', err);
    return errorResponse('Gagal memuat slot jadwal.', 500);
  }
}
