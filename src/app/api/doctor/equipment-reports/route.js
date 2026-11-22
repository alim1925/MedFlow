import {
  getMyEquipmentReports,
  createEquipmentDamageReport,
} from '@/services/doctorEquipmentService';
import { parseRequestBody, toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function GET() {
  try {
    const result = await getMyEquipmentReports();
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('GET /api/doctor/equipment-reports error:', err);
    return errorResponse('Gagal memuat daftar laporan alat rusak.', 500);
  }
}

export async function POST(request) {
  try {
    const body = await parseRequestBody(request);
    const result = await createEquipmentDamageReport(body);
    return toJsonResponse(result, 201);
  } catch (err) {
    console.error('POST /api/doctor/equipment-reports error:', err);
    return errorResponse('Gagal mengirim laporan kerusakan alat medis.', 500);
  }
}
