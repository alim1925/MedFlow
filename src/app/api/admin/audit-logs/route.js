import { getAuditLogs } from '@/services/adminService';
import { toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function GET(request) {
  try {
    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = limitParam ? Number(limitParam) : 100;
    const result = await getAuditLogs(limit);
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('GET /api/admin/audit-logs error:', err);
    return errorResponse('Gagal memuat audit log.', 500);
  }
}
