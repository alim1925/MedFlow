import bcrypt from 'bcryptjs';
import { query, withTransaction } from '@/lib/db';
import { createSession, destroySession, getCurrentUser } from '@/lib/auth';
import { loginSchema, registerSchema } from '@/lib/validators';
import { toServiceErrorResult } from '@/lib/serviceErrors';

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
