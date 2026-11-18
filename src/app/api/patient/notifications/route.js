import { getMyNotifications } from '@/services/patientService';
import { toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function GET() {
  try {
    const result = await getMyNotifications();
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('GET /api/patient/notifications error:', err);
    return errorResponse('Gagal memuat pesan.', 500);
  }
}
