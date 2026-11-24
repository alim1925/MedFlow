import { submitPrescriptionPayment } from '@/services/patientService';
import { parseRequestBody, toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await parseRequestBody(request);
    const result = await submitPrescriptionPayment(id, body);
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('POST /api/patient/prescriptions/[id]/pay error:', err);
    return errorResponse('Gagal mengirim konfirmasi pembayaran obat.', 500);
  }
}
