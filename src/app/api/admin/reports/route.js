import {
  getOperationalReport,
  createRevenue,
  updateRevenue,
  deleteRevenue,
  createExpense,
  updateExpense,
  deleteExpense,
  createPayroll,
  updatePayroll,
  deletePayroll,
  createReceivable,
  updateReceivable,
  deleteReceivable,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
} from '@/services/operationalReportService';
import { parseRequestBody, toJsonResponse, errorResponse } from '@/lib/routeHelpers';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || undefined;
    const result = await getOperationalReport({ period });
    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('GET /api/admin/reports error:', err);
    return errorResponse('Gagal memuat laporan operasional.', 500);
  }
}

export async function POST(request) {
  try {
    const body = await parseRequestBody(request);
    const { type, ...payload } = body || {};

    let result;
    switch (type) {
      case 'revenue':
        result = await createRevenue(payload);
        break;
      case 'expense':
        result = await createExpense(payload);
        break;
      case 'payroll':
        result = await createPayroll(payload);
        break;
      case 'receivable':
        result = await createReceivable(payload);
        break;
      case 'maintenance':
        result = await createMaintenance(payload);
        break;
      default:
        return errorResponse('Tipe entri laporan tidak dikenali.', 400);
    }

    return toJsonResponse(result, 201);
  } catch (err) {
    console.error('POST /api/admin/reports error:', err);
    return errorResponse('Gagal menyimpan data laporan operasional.', 500);
  }
}

export async function PATCH(request) {
  try {
    const body = await parseRequestBody(request);
    const { type, id, ...payload } = body || {};

    if (!id) {
      return errorResponse('ID entri wajib disertakan.', 400);
    }

    let result;
    switch (type) {
      case 'revenue':
        result = await updateRevenue(id, payload);
        break;
      case 'expense':
        result = await updateExpense(id, payload);
        break;
      case 'payroll':
        result = await updatePayroll(id, payload);
        break;
      case 'receivable':
        result = await updateReceivable(id, payload);
        break;
      case 'maintenance':
        result = await updateMaintenance(id, payload);
        break;
      default:
        return errorResponse('Tipe entri laporan tidak dikenali.', 400);
    }

    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('PATCH /api/admin/reports error:', err);
    return errorResponse('Gagal memperbarui data laporan operasional.', 500);
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const body = await parseRequestBody(request);
    const type = searchParams.get('type') || body?.type;
    const id = searchParams.get('id') || body?.id;

    if (!id) {
      return errorResponse('ID entri wajib disertakan.', 400);
    }

    let result;
    switch (type) {
      case 'revenue':
        result = await deleteRevenue(id);
        break;
      case 'expense':
        result = await deleteExpense(id);
        break;
      case 'payroll':
        result = await deletePayroll(id);
        break;
      case 'receivable':
        result = await deleteReceivable(id);
        break;
      case 'maintenance':
        result = await deleteMaintenance(id);
        break;
      default:
        return errorResponse('Tipe entri laporan tidak dikenali.', 400);
    }

    return toJsonResponse(result, 200);
  } catch (err) {
    console.error('DELETE /api/admin/reports error:', err);
    return errorResponse('Gagal menghapus data laporan operasional.', 500);
  }
}
