import { addAddendum } from '@/services/doctorService';
import { parseRequestBody, toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await parseRequestBody(request);
    const result = await addAddendum(id, body.note);
    return toJsonResponse(result, 201);
  } catch (err) {
    console.error('POST /api/doctor/medical-records/[id]/addenda error:', err);
    return errorResponse('Gagal menambahkan addendum.', 500);
  }
}
