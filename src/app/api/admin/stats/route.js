import { getStats } from '@/services/adminService';
import { toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function GET() {
  try {
    const result = await getStats();
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('GET /api/admin/stats error:', err);
    return errorResponse('Gagal memuat statistik sistem.', 500);
  }
}
