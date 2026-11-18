import { getMySchedules, createSchedule } from '@/services/doctorService';
import { parseRequestBody, toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function GET() {
  try {
    const result = await getMySchedules();
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('GET /api/doctor/schedules error:', err);
    return errorResponse('Gagal memuat jadwal praktik.', 500);
  }
}

export async function POST(request) {
  try {
    const body = await parseRequestBody(request);
    const result = await createSchedule(body);
    return toJsonResponse(result, 201);
  } catch (err) {
    console.error('POST /api/doctor/schedules error:', err);
    return errorResponse('Gagal menambahkan jadwal praktik.', 500);
  }
}
