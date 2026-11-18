import { markNotificationAsRead } from '@/services/patientService';
import { toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function PATCH(_request, { params }) {
  try {
    const { id } = await params;
    const result = await markNotificationAsRead(id);
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('PATCH /api/patient/notifications/[id]/read error:', err);
    return errorResponse('Gagal menandai pesan sudah dibaca.', 500);
  }
}
