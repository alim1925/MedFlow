import { markAllNotificationsAsRead } from '@/services/patientService';
import { toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function PATCH() {
  try {
    const result = await markAllNotificationsAsRead();
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('PATCH /api/patient/notifications/read-all error:', err);
    return errorResponse('Gagal memperbarui status pesan.', 500);
  }
}
