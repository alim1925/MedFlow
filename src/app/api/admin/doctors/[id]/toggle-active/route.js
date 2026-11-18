import { toggleDoctorActive } from '@/services/adminService';
import { toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function PATCH(_request, { params }) {
  try {
    const { id } = await params;
    const result = await toggleDoctorActive(id);
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('PATCH /api/admin/doctors/[id]/toggle-active error:', err);
    return errorResponse('Gagal mengubah status dokter.', 500);
  }
}
