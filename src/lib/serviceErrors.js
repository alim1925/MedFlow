/**
 * Custom error class carrying an HTTP status code for Route Handlers.
 */
export class ServiceError extends Error {
  /**
   * @param {string} message
   * @param {number} [status=400]
   */
  constructor(message, status = 400) {
    super(message);
    this.name = 'ServiceError';
    this.status = status;
  }
}

/**
 * Convert an error thrown inside a service into a standardized `{ success: false, error, status }` object.
 * @param {string} context
 * @param {unknown} err
 * @param {string} [fallbackMessage]
 * @returns {{success: false, error: string, status: number}}
 */
export function toServiceErrorResult(context, err, fallbackMessage) {
  console.error(`Error in ${context}:`, err);
  if (err instanceof ServiceError) {
    return {
      success: false,
      error: err.message,
      status: err.status,
    };
  }
  const message =
    err instanceof Error && err.message
      ? err.message
      : fallbackMessage || 'Terjadi kesalahan pada server.';
  return {
    success: false,
    error: message,
    status: 500,
  };
}
