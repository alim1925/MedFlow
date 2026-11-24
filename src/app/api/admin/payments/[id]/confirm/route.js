import { confirmPrescriptionPayment } from '@/services/pharmacyService';
import { parseRequestBody, toJsonResponse, errorResponse } from '@/lib/routeHelpers';

async function handleConfirm(request, { params }) {
  try {
    const { id } = await params;
    const body = await parseRequestBody(request);
    const result = await confirmPrescriptionPayment(id, body);
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('Confirm payment error:', err);
    return errorResponse('Gagal mengonfirmasi pembayaran obat.', 500);
  }
}

export async function POST(request, context) {
  return handleConfirm(request, context);
}

export async function PATCH(request, context) {
  return handleConfirm(request, context);
}
