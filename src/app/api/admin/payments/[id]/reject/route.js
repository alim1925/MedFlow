import { rejectPrescriptionPayment } from '@/services/pharmacyService';
import { parseRequestBody, toJsonResponse, errorResponse } from '@/lib/routeHelpers';

async function handleReject(request, { params }) {
  try {
    const { id } = await params;
    const body = await parseRequestBody(request);
    const result = await rejectPrescriptionPayment(id, body.reason);
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('Reject payment error:', err);
    return errorResponse('Gagal menolak pengajuan pembayaran obat.', 500);
  }
}

export async function POST(request, context) {
  return handleReject(request, context);
}

export async function PATCH(request, context) {
  return handleReject(request, context);
}
