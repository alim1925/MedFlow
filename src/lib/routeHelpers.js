import { NextResponse } from 'next/server';

/**
 * Parse request body from either JSON or FormData / URL-encoded payloads.
 * @param {Request} request
 * @returns {Promise<Object>}
 */
export async function parseRequestBody(request) {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
    const formData = await request.formData();
    return Object.fromEntries(formData.entries());
  }

  try {
    const body = await request.json();
    return body && typeof body === 'object' ? body : {};
  } catch {
    return {};
  }
}

/**
 * Convert a service result object into a NextResponse JSON response with proper HTTP status code.
 * @param {Object} result
 * @param {number} [successStatus=200]
 * @returns {NextResponse}
 */
export function toJsonResponse(result, successStatus = 200) {
  if (!result || typeof result !== 'object') {
    return NextResponse.json(
      { success: false, error: 'Respons server tidak valid.' },
      { status: 500 }
    );
  }

  const { status, ...payload } = result;
  const httpStatus = result.success ? successStatus : (status || 400);

  return NextResponse.json(payload, { status: httpStatus });
}

/**
 * Build a standardized JSON error response.
 * @param {string} message
 * @param {number} [status=500]
 * @returns {NextResponse}
 */
export function errorResponse(message, status = 500) {
  return NextResponse.json(
    { success: false, error: message || 'Terjadi kesalahan pada server.' },
    { status }
  );
}
