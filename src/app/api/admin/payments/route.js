import { getPrescriptionPayments } from '@/services/pharmacyService';
import { toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const result = await getPrescriptionPayments(status);
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('GET /api/admin/payments error:', err);
    return errorResponse('Gagal memuat daftar pembayaran obat.', 500);
  }
}
