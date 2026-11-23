import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query, withTransaction } from '@/lib/db';
import { createSession, destroySession, getCurrentUser } from '@/lib/auth';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@/lib/validators';
import { ServiceError, toServiceErrorResult } from '@/lib/serviceErrors';

const RESET_TOKEN_TTL_MINUTES = 30;
let ensureResetTablePromise = null;

/**
 * Ensure the password_reset_tokens table exists in PostgreSQL.
 * Allows the feature to work out-of-the-box without requiring a manual DB re-seed.
 */
async function ensurePasswordResetTable() {
  if (!ensureResetTablePromise) {
    ensureResetTablePromise = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash VARCHAR(64) UNIQUE NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          used_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await query(
        'CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)'
      );
      await query(
        'CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at)'
      );
    })().catch((err) => {
      ensureResetTablePromise = null;
      throw err;
    });
  }
  return ensureResetTablePromise;
}

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function maskEmail(email) {
  const [localPart = '', domain = ''] = String(email).split('@');
  if (!domain) return email;
  const visible = localPart.slice(0, Math.min(2, localPart.length));
  return `${visible}***@${domain}`;
}

function getZodFirstError(validation, fallback) {
  return (
    validation?.error?.issues?.[0]?.message ||
    validation?.error?.errors?.[0]?.message ||
    fallback
  );
}

/**
 * Normalize input that might arrive as FormData or plain Object.
 * @param {FormData|Object} input
 * @returns {Object}
 */
function normalizeInput(input) {
  if (typeof FormData !== 'undefined' && input instanceof FormData) {
    return Object.fromEntries(input.entries());
  }
  return input || {};
}

/**
 * Register a new patient account.
 * @param {FormData|Object} input
 * @returns {Promise<{success: boolean, data?: any, error?: string, status?: number}>}
 */
export async function registerPatient(input) {
  try {
    const raw = normalizeInput(input);

    const validation = registerSchema.safeParse(raw);
    if (!validation.success) {
      const firstError = validation.error.errors[0]?.message || 'Data registrasi tidak valid.';
      return { success: false, error: firstError, status: 400 };
    }

    const {
      email,
      password,
      full_name,
      nik,
      birth_date,
      gender,
      blood_type,
      phone,
      address,
      emergency_contact,
      allergies,
    } = validation.data;

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return {
        success: false,
        error: 'Email sudah terdaftar. Silakan gunakan email lain atau masuk ke akun Anda.',
        status: 409,
      };
    }

    if (nik) {
      const existingNik = await query(
        'SELECT id FROM patients WHERE nik = $1',
        [nik]
      );
      if (existingNik.rows.length > 0) {
        return {
          success: false,
          error: 'NIK sudah terdaftar dalam sistem.',
          status: 409,
        };
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const currentYear = new Date().getFullYear();
    const randomDigits = String(Math.floor(100000 + Math.random() * 900000));
    const medicalRecordNo = `MR${currentYear}${randomDigits}`;

    const result = await withTransaction(async (client) => {
      const userRes = await client.query(
        `INSERT INTO users (email, password_hash, role, is_active)
         VALUES ($1, $2, 'PATIENT', true)
         RETURNING id, email, role`,
        [normalizedEmail, passwordHash]
      );
      const newUser = userRes.rows[0];

      const patientRes = await client.query(
        `INSERT INTO patients (
           user_id, medical_record_no, full_name, nik,
           birth_date, gender, blood_type, phone,
           address, emergency_contact, allergies
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id, medical_record_no, full_name`,
        [
          newUser.id,
          medicalRecordNo,
          full_name.trim(),
          nik || null,
          birth_date,
          gender || null,
          blood_type || null,
          phone || null,
          address || null,
          emergency_contact || null,
          allergies || null,
        ]
      );
      const newPatient = patientRes.rows[0];

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
         VALUES ($1, 'REGISTER', 'users', $2, $3)`,
        [
          newUser.id,
          newUser.id,
          JSON.stringify({
            email: newUser.email,
            medical_record_no: newPatient.medical_record_no,
            full_name: newPatient.full_name,
          }),
        ]
      );

      return {
        userId: newUser.id,
        patientId: newPatient.id,
        medicalRecordNo: newPatient.medical_record_no,
      };
    });

    return {
      success: true,
      data: result,
    };
  } catch (err) {
    if (err.code === '23505') {
      return {
        success: false,
        error: 'Data duplikat: Email atau NIK sudah terdaftar dalam sistem.',
        status: 409,
      };
    }
    return toServiceErrorResult(
      'registerPatient',
      err,
      'Terjadi kesalahan sistem saat mendaftar. Silakan coba lagi.'
    );
  }
}

/**
 * Login user and initialize secure session cookie.
 * @param {FormData|Object} input
 * @returns {Promise<{success: boolean, role?: string, error?: string, status?: number}>}
 */
export async function loginUser(input) {
  try {
    const raw = normalizeInput(input);

    const validation = loginSchema.safeParse(raw);
    if (!validation.success) {
      const firstError = validation.error.errors[0]?.message || 'Format email atau kata sandi tidak valid.';
      return { success: false, error: firstError, status: 400 };
    }

    const { email, password } = validation.data;
    const normalizedEmail = email.toLowerCase().trim();

    const res = await query(
      `SELECT id, email, password_hash, role, is_active
       FROM users
       WHERE email = $1`,
      [normalizedEmail]
    );

    if (res.rows.length === 0) {
      return {
        success: false,
        error: 'Email atau kata sandi tidak sesuai.',
        status: 401,
      };
    }

    const user = res.rows[0];

    if (!user.is_active) {
      return {
        success: false,
        error: 'Akun Anda telah dinonaktifkan. Silakan hubungi administrator.',
        status: 403,
      };
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return {
        success: false,
        error: 'Email atau kata sandi tidak sesuai.',
        status: 401,
      };
    }

    await query(
      `UPDATE users
       SET last_login_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [user.id]
    );

    await query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
       VALUES ($1, 'LOGIN', 'users', $2, $3)`,
      [
        user.id,
        user.id,
        JSON.stringify({
          email: user.email,
          role: user.role,
          timestamp: new Date().toISOString(),
        }),
      ]
    );

    await createSession({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      success: true,
      role: user.role,
    };
  } catch (err) {
    return toServiceErrorResult(
      'loginUser',
      err,
      'Terjadi kesalahan sistem saat proses masuk. Silakan coba lagi.'
    );
  }
}

/**
 * Logout current user and destroy session cookie.
 * @returns {Promise<{success: boolean, error?: string, status?: number}>}
 */
export async function logoutUser() {
  try {
    const user = await getCurrentUser();
    if (user?.id) {
      await query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
         VALUES ($1, 'LOGOUT', 'users', $2, $3)`,
        [
          user.id,
          user.id,
          JSON.stringify({ email: user.email, timestamp: new Date().toISOString() }),
        ]
      ).catch(() => {});
    }

    await destroySession();
    return { success: true };
  } catch (err) {
    return toServiceErrorResult('logoutUser', err, 'Gagal keluar dari sistem.');
  }
}

/**
 * Get currently authenticated user data.
 * @returns {Promise<{success: boolean, data?: any, error?: string, status?: number}>}
 */
export async function getAuthUser() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Tidak ada sesi aktif.', status: 401 };
    }
    return { success: true, data: user };
  } catch (err) {
    return toServiceErrorResult('getAuthUser', err);
  }
}

/**
 * Create a single-use password reset token for an active user account.
 * In development mode without an email provider, returns `devResetPath` so
 * the reset flow can be tested directly from the UI.
 * @param {FormData|Object} input
 * @returns {Promise<{success: boolean, message?: string, devResetPath?: string, error?: string, status?: number}>}
 */
export async function requestPasswordReset(input) {
  try {
    const raw = normalizeInput(input);
    const validation = forgotPasswordSchema.safeParse(raw);
    if (!validation.success) {
      return {
        success: false,
        error: getZodFirstError(validation, 'Format email tidak valid.'),
        status: 400,
      };
    }

    await ensurePasswordResetTable();

    const normalizedEmail = validation.data.email.toLowerCase().trim();
    const userRes = await query(
      `SELECT id, email, is_active
       FROM users
       WHERE LOWER(email) = $1`,
      [normalizedEmail]
    );

    const genericMessage =
      'Jika email terdaftar dan aktif, tautan pengaturan ulang kata sandi telah disiapkan (berlaku selama 30 menit).';

    if (userRes.rows.length === 0 || !userRes.rows[0].is_active) {
      return {
        success: true,
        message: genericMessage,
      };
    }

    const user = userRes.rows[0];
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(rawToken);

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE password_reset_tokens
         SET used_at = NOW()
         WHERE user_id = $1 AND used_at IS NULL`,
        [user.id]
      );

      await client.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 minute'))`,
        [user.id, tokenHash, RESET_TOKEN_TTL_MINUTES]
      );

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
         VALUES ($1, 'PASSWORD_RESET_REQUEST', 'users', $2, $3)`,
        [
          user.id,
          user.id,
          JSON.stringify({
            email: user.email,
            expires_in_minutes: RESET_TOKEN_TTL_MINUTES,
            timestamp: new Date().toISOString(),
          }),
        ]
      );
    });

    const resetPath = `/reset-password?token=${rawToken}`;
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    const isDev = process.env.NODE_ENV !== 'production';

    if (isDev) {
      console.info(`[MedFlow Auth] Password reset link for ${user.email}: ${appUrl}${resetPath}`);
    }

    return {
      success: true,
      message: genericMessage,
      ...(isDev ? { devResetPath: resetPath } : {}),
    };
  } catch (err) {
    return toServiceErrorResult(
      'requestPasswordReset',
      err,
      'Terjadi kesalahan sistem saat memproses permintaan lupa sandi.'
    );
  }
}

/**
 * Validate whether a password reset token exists, is unused, and has not expired.
 * @param {string} token
 * @returns {Promise<{success: boolean, data?: {maskedEmail: string, expiresAt: string}, error?: string, status?: number}>}
 */
export async function verifyPasswordResetToken(token) {
  try {
    const cleanToken = typeof token === 'string' ? token.trim() : '';
    if (!cleanToken) {
      return {
        success: false,
        error: 'Token reset kata sandi tidak ditemukan.',
        status: 400,
      };
    }

    await ensurePasswordResetTable();

    const tokenHash = hashResetToken(cleanToken);
    const res = await query(
      `SELECT prt.id, prt.expires_at, prt.used_at, u.email, u.is_active
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token_hash = $1`,
      [tokenHash]
    );

    if (res.rows.length === 0) {
      return {
        success: false,
        error: 'Tautan reset kata sandi tidak valid atau sudah tidak berlaku.',
        status: 400,
      };
    }

    const row = res.rows[0];
    if (row.used_at) {
      return {
        success: false,
        error: 'Tautan reset kata sandi ini sudah pernah digunakan.',
        status: 400,
      };
    }

    if (new Date(row.expires_at) <= new Date()) {
      return {
        success: false,
        error: 'Tautan reset kata sandi sudah kedaluwarsa. Silakan minta tautan baru.',
        status: 400,
      };
    }

    if (!row.is_active) {
      return {
        success: false,
        error: 'Akun pengguna sedang dinonaktifkan. Silakan hubungi administrator.',
        status: 403,
      };
    }

    return {
      success: true,
      data: {
        maskedEmail: maskEmail(row.email),
        expiresAt: row.expires_at,
      },
    };
  } catch (err) {
    return toServiceErrorResult(
      'verifyPasswordResetToken',
      err,
      'Gagal memverifikasi tautan reset kata sandi.'
    );
  }
}

/**
 * Reset a user's password using a valid single-use reset token.
 * @param {FormData|Object} input
 * @returns {Promise<{success: boolean, message?: string, error?: string, status?: number}>}
 */
export async function resetPasswordWithToken(input) {
  try {
    const raw = normalizeInput(input);
    const validation = resetPasswordSchema.safeParse(raw);
    if (!validation.success) {
      return {
        success: false,
        error: getZodFirstError(validation, 'Data pengaturan ulang kata sandi tidak valid.'),
        status: 400,
      };
    }

    await ensurePasswordResetTable();

    const { token, password } = validation.data;
    const tokenHash = hashResetToken(token);
    const newPasswordHash = await bcrypt.hash(password, 12);

    await withTransaction(async (client) => {
      const tokenRes = await client.query(
        `SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at, u.email, u.is_active
         FROM password_reset_tokens prt
         JOIN users u ON u.id = prt.user_id
         WHERE prt.token_hash = $1
         FOR UPDATE`,
        [tokenHash]
      );

      if (tokenRes.rows.length === 0) {
        throw new ServiceError('Tautan reset kata sandi tidak valid atau sudah tidak berlaku.', 400);
      }

      const row = tokenRes.rows[0];
      if (row.used_at) {
        throw new ServiceError('Tautan reset kata sandi ini sudah pernah digunakan.', 400);
      }
      if (new Date(row.expires_at) <= new Date()) {
        throw new ServiceError('Tautan reset kata sandi sudah kedaluwarsa. Silakan minta tautan baru.', 400);
      }
      if (!row.is_active) {
        throw new ServiceError('Akun pengguna sedang dinonaktifkan. Silakan hubungi administrator.', 403);
      }

      await client.query(
        `UPDATE users
         SET password_hash = $1, updated_at = NOW()
         WHERE id = $2`,
        [newPasswordHash, row.user_id]
      );

      await client.query(
        `UPDATE password_reset_tokens
         SET used_at = NOW()
         WHERE user_id = $1 AND used_at IS NULL`,
        [row.user_id]
      );

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
         VALUES ($1, 'PASSWORD_RESET', 'users', $2, $3)`,
        [
          row.user_id,
          row.user_id,
          JSON.stringify({
            email: row.email,
            timestamp: new Date().toISOString(),
          }),
        ]
      );
    });

    return {
      success: true,
      message: 'Kata sandi berhasil diperbarui. Silakan masuk menggunakan kata sandi baru Anda.',
    };
  } catch (err) {
    return toServiceErrorResult(
      'resetPasswordWithToken',
      err,
      'Terjadi kesalahan sistem saat memperbarui kata sandi.'
    );
  }
}
