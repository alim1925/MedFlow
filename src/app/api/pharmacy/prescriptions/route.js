import { getPharmacyQueue } from '@/services/pharmacyService';
import { toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function GET() {
  try {
    const result = await getPharmacyQueue();
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('GET /api/pharmacy/prescriptions error:', err);
    return errorResponse('Gagal memuat antrean farmasi.', 500);
  }
}
