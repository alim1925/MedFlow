import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'medflow-fallback-secret-key-32-chars-min!!'
);
const COOKIE_NAME = 'medflow_session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

/**
 * Creates and sets an encrypted HTTP-only session cookie for the authenticated user.
 * @param {Object} payload User identity data { id, email, role, name, patientId, doctorId }
 * @returns {Promise<string>} The signed JWT token
 */
export async function createSession(payload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  });

  return token;
}

/**
 * Reads and verifies the current session from the HTTP-only cookie.
 * @returns {Promise<Object|null>} The decoded session payload, or null if unauthenticated or expired.
 */
export async function getSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, SECRET);
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Destroys the current user session by clearing the HTTP-only cookie.
 */
export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Helper to retrieve current authenticated user details from session.
 * @returns {Promise<{id: string, email: string, role: string, name?: string, patientId?: string, doctorId?: string}|null>}
 */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session || !session.id) return null;

  return {
    id: session.id,
    email: session.email,
    role: session.role,
    name: session.name || null,
    patientId: session.patientId || null,
    doctorId: session.doctorId || null,
  };
}
