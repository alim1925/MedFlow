import { getAllAppointments } from '@/services/adminService';
import { toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function GET(request) {
  try {
    const sp = request.nextUrl.searchParams;
    const filters = {
      status: sp.get('status') || undefined,
      date: sp.get('date') || undefined,
      doctor_id: sp.get('doctor_id') || undefined,
    };
    const result = await getAllAppointments(filters);
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('GET /api/admin/appointments error:', err);
    return errorResponse('Gagal memuat daftar janji temu.', 500);
  }
}
