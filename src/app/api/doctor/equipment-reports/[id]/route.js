import { deleteMyEquipmentReport } from '@/services/doctorEquipmentService';
import { toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    const result = await deleteMyEquipmentReport(id);
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('DELETE /api/doctor/equipment-reports/[id] error:', err);
    return errorResponse('Gagal membatalkan laporan kerusakan alat.', 500);
  }
}
