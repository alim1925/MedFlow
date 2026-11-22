import { seedSampleOperationalData } from '@/services/operationalReportService';
import { toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function POST() {
  try {
    const result = await seedSampleOperationalData();
    return toJsonResponse(result, 201);
  } catch (err) {
    console.error('POST /api/admin/reports/seed error:', err);
    return errorResponse('Gagal memuat data sampel operasional.', 500);
  }
}
