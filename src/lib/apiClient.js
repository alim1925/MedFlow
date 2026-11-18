/**
 * Client-side helper to call Next.js Route Handlers (/api/*).
 * Preserves `{ success, data, error, ... }` response shape even on HTTP error statuses.
 *
 * @param {string} url
 * @param {Object} [options]
 * @param {string} [options.method='GET']
 * @param {Object|FormData} [options.body]
 * @param {Object} [options.headers]
 * @returns {Promise<{success: boolean, data?: any, error?: string, [key: string]: any}>}
 */
export async function apiRequest(url, options = {}) {
  const { method = 'GET', body, headers = {}, ...rest } = options;

  const fetchOptions = {
    method,
    headers: { ...headers },
    credentials: 'same-origin',
    ...rest,
  };

  if (body !== undefined && body !== null) {
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      fetchOptions.body = body;
    } else if (typeof body === 'string') {
      fetchOptions.headers['Content-Type'] = fetchOptions.headers['Content-Type'] || 'application/json';
      fetchOptions.body = body;
    } else {
      fetchOptions.headers['Content-Type'] = fetchOptions.headers['Content-Type'] || 'application/json';
      fetchOptions.body = JSON.stringify(body);
    }
  }

  const response = await fetch(url, fetchOptions);

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (payload && typeof payload === 'object') {
    if (typeof payload.success === 'boolean') {
      return payload;
    }
    return {
      success: response.ok,
      ...payload,
      error: response.ok ? undefined : payload.error || response.statusText,
    };
  }

  if (!response.ok) {
    return {
      success: false,
      error: response.statusText || 'Permintaan gagal diproses oleh server.',
    };
  }

  return { success: true };
}
