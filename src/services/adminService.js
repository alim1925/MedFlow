import bcrypt from 'bcryptjs';
import { query, withTransaction } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { poliSchema, medicineSchema } from '@/lib/validators';
import { ServiceError, toServiceErrorResult } from '@/lib/serviceErrors';
import { ensurePharmacySchema } from '@/lib/pharmacySchema';
import { transitionAppointmentStatus } from '@/services/appointmentStatusService';

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    throw new ServiceError('Sesi tidak ditemukan. Silakan masuk terlebih dahulu.', 401);
  }
  if (user.role !== 'ADMIN') {
    throw new ServiceError(
      'Akses ditolak: Hanya administrator yang diizinkan melakukan tindakan ini.',
      403
    );
  }
  return user;
}

async function requireAdminOrDoctor() {
  const user = await getCurrentUser();
  if (!user) {
    throw new ServiceError('Sesi tidak ditemukan. Silakan masuk terlebih dahulu.', 401);
  }
  if (!['ADMIN', 'DOCTOR'].includes(user.role)) {
    throw new ServiceError(
      'Akses ditolak: Hanya administrator atau dokter yang diizinkan.',
      403
    );
  }
  return user;
}

function normalizeInput(input) {
  if (typeof FormData !== 'undefined' && input instanceof FormData) {
    return Object.fromEntries(input.entries());
  }
  return input || {};
}

export async function getStats() {
  try {
    await requireAdmin();
    await ensurePharmacySchema();

    const [
      patientsRes,
      doctorsRes,
      todayApptRes,
      prescWaitingRes,
      lowStockRes,
      totalApptRes,
      pendingPaymentsRes,
    ] = await Promise.all([
      query('SELECT COUNT(*)::int AS count FROM patients'),
      query('SELECT COUNT(*)::int AS count FROM doctors WHERE is_active = true'),
      query('SELECT COUNT(*)::int AS count FROM appointments WHERE appointment_date = CURRENT_DATE'),
      query("SELECT COUNT(*)::int AS count FROM prescriptions WHERE status IN ('WAITING', 'PROCESSING')"),
      query('SELECT COUNT(*)::int AS count FROM medicines WHERE stock <= min_stock AND is_active = true'),
      query('SELECT COUNT(*)::int AS count FROM appointments'),
      query("SELECT COUNT(*)::int AS count FROM prescription_payments WHERE status = 'WAITING_CONFIRMATION'"),
    ]);

    const statsData = {
      patients: patientsRes.rows[0]?.count || 0,
      doctors: doctorsRes.rows[0]?.count || 0,
      today_appointments: todayApptRes.rows[0]?.count || 0,
      prescriptions_waiting: prescWaitingRes.rows[0]?.count || 0,
      low_stock_medicines: lowStockRes.rows[0]?.count || 0,
      total_appointments: totalApptRes.rows[0]?.count || 0,
      pending_payment_confirmations: pendingPaymentsRes.rows[0]?.count || 0,
    };

    return {
      success: true,
      data: statsData,
      ...statsData,
    };
  } catch (err) {
    return toServiceErrorResult('getStats', err);
  }
}

export async function getUsers() {
  try {
    await requireAdmin();

    const res = await query(
      `SELECT 
         u.id,
         u.email,
         u.role,
         u.is_active,
         u.last_login_at,
         u.created_at,
         p.full_name AS patient_name,
         p.medical_record_no,
         d.full_name AS doctor_name,
         d.str_number,
         pol.name AS doctor_poli,
         COALESCE(p.full_name, d.full_name, u.email) AS display_name
       FROM users u
       LEFT JOIN patients p ON u.id = p.user_id AND u.role = 'PATIENT'
       LEFT JOIN doctors d ON u.id = d.user_id AND u.role = 'DOCTOR'
       LEFT JOIN polis pol ON d.poli_id = pol.id
       ORDER BY u.created_at DESC`
    );

    return {
      success: true,
      data: res.rows,
    };
  } catch (err) {
    return toServiceErrorResult('getUsers', err);
  }
}

export async function toggleUserActive(userId) {
  try {
    const admin = await requireAdmin();

    if (userId === admin.id) {
      return {
        success: false,
        error: 'Tidak dapat menonaktifkan akun sendiri saat sedang masuk.',
        status: 400,
      };
    }

    const res = await query(
      `UPDATE users 
       SET is_active = NOT is_active, updated_at = NOW() 
       WHERE id = $1 
       RETURNING id, email, role, is_active`,
      [userId]
    );

    if (res.rows.length === 0) {
      return { success: false, error: 'Pengguna tidak ditemukan.', status: 404 };
    }

    const updatedUser = res.rows[0];

    await query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
       VALUES ($1, 'TOGGLE_USER_ACTIVE', 'users', $2, $3)`,
      [
        admin.id,
        updatedUser.id,
        JSON.stringify({
          target_email: updatedUser.email,
          target_role: updatedUser.role,
          is_active: updatedUser.is_active,
        }),
      ]
    );

    return {
      success: true,
      data: updatedUser,
    };
  } catch (err) {
    return toServiceErrorResult('toggleUserActive', err);
  }
}

export async function getPolis() {
  try {
    await requireAdmin();

    const res = await query('SELECT * FROM polis ORDER BY name ASC');
    return {
      success: true,
      data: res.rows,
    };
  } catch (err) {
    return toServiceErrorResult('getPolis', err);
  }
}

export async function createPoli(input) {
  try {
    const admin = await requireAdmin();
    const raw = normalizeInput(input);

    const validation = poliSchema.safeParse(raw);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || 'Data poli tidak valid.',
        status: 400,
      };
    }

    const { name, description, icon } = validation.data;

    const res = await query(
      `INSERT INTO polis (name, description, icon, is_active)
       VALUES ($1, $2, $3, true)
       RETURNING *`,
      [name.trim(), description?.trim() || null, icon?.trim() || 'Stethoscope']
    );

    const newPoli = res.rows[0];

    await query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
       VALUES ($1, 'CREATE_POLI', 'polis', $2, $3)`,
      [admin.id, newPoli.id, JSON.stringify({ name: newPoli.name })]
    );

    return {
      success: true,
      data: newPoli,
    };
  } catch (err) {
    if (err.code === '23505') {
      return { success: false, error: 'Poli dengan nama tersebut sudah ada.', status: 409 };
    }
    return toServiceErrorResult('createPoli', err);
  }
}

export async function updatePoli(id, input) {
  try {
    const admin = await requireAdmin();
    const raw = normalizeInput(input);

    const validation = poliSchema.safeParse(raw);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || 'Data poli tidak valid.',
        status: 400,
      };
    }

    const { name, description, icon } = validation.data;

    const res = await query(
      `UPDATE polis
       SET name = $1, description = $2, icon = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [name.trim(), description?.trim() || null, icon?.trim() || 'Stethoscope', id]
    );

    if (res.rows.length === 0) {
      return { success: false, error: 'Poli tidak ditemukan.', status: 404 };
    }

    const updatedPoli = res.rows[0];

    await query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
       VALUES ($1, 'UPDATE_POLI', 'polis', $2, $3)`,
      [admin.id, updatedPoli.id, JSON.stringify({ name: updatedPoli.name })]
    );

    return {
      success: true,
      data: updatedPoli,
    };
  } catch (err) {
    if (err.code === '23505') {
      return { success: false, error: 'Poli dengan nama tersebut sudah ada.', status: 409 };
    }
    return toServiceErrorResult('updatePoli', err);
  }
}

export async function togglePoliActive(id) {
  try {
    const admin = await requireAdmin();

    const res = await query(
      `UPDATE polis
       SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (res.rows.length === 0) {
      return { success: false, error: 'Poli tidak ditemukan.', status: 404 };
    }

    const updated = res.rows[0];

    await query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
       VALUES ($1, 'TOGGLE_POLI_ACTIVE', 'polis', $2, $3)`,
      [admin.id, updated.id, JSON.stringify({ name: updated.name, is_active: updated.is_active })]
    );

    return {
      success: true,
      data: updated,
    };
  } catch (err) {
    return toServiceErrorResult('togglePoliActive', err);
  }
}

export async function getDoctors() {
  try {
    await requireAdmin();

    const res = await query(
      `SELECT 
         d.id,
         d.user_id,
         d.poli_id,
         d.full_name,
         d.str_number,
         d.bio,
         d.photo_url,
         d.is_active,
         d.created_at,
         u.email,
         u.is_active AS user_active,
         p.name AS poli_name
       FROM doctors d
       JOIN users u ON d.user_id = u.id
       JOIN polis p ON d.poli_id = p.id
       ORDER BY d.full_name ASC`
    );

    return {
      success: true,
      data: res.rows,
    };
  } catch (err) {
    return toServiceErrorResult('getDoctors', err);
  }
}

export async function createDoctor(input) {
  try {
    const admin = await requireAdmin();
    const raw = normalizeInput(input);

    const { email, password, full_name, poli_id, str_number, bio, photo_url } = raw;

    if (!email || !password || !full_name || !poli_id || !str_number) {
      return {
        success: false,
        error: 'Email, kata sandi, nama lengkap, poli, dan nomor STR wajib diisi.',
        status: 400,
      };
    }

    if (password.length < 6) {
      return {
        success: false,
        error: 'Kata sandi minimal 6 karakter.',
        status: 400,
      };
    }

    const normalizedEmail = email.toLowerCase().trim();

    const emailCheck = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (emailCheck.rows.length > 0) {
      return { success: false, error: 'Email sudah terdaftar untuk pengguna lain.', status: 409 };
    }

    const strCheck = await query('SELECT id FROM doctors WHERE str_number = $1', [str_number.trim()]);
    if (strCheck.rows.length > 0) {
      return { success: false, error: 'Nomor STR sudah terdaftar dalam sistem.', status: 409 };
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await withTransaction(async (client) => {
      const userRes = await client.query(
        `INSERT INTO users (email, password_hash, role, is_active)
         VALUES ($1, $2, 'DOCTOR', true)
         RETURNING id, email, role`,
        [normalizedEmail, passwordHash]
      );
      const newUser = userRes.rows[0];

      const doctorRes = await client.query(
        `INSERT INTO doctors (user_id, poli_id, full_name, str_number, bio, photo_url, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         RETURNING *`,
        [
          newUser.id,
          poli_id,
          full_name.trim(),
          str_number.trim(),
          bio?.trim() || null,
          photo_url?.trim() || null,
        ]
      );
      const newDoctor = doctorRes.rows[0];

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
         VALUES ($1, 'CREATE_DOCTOR', 'doctors', $2, $3)`,
        [
          admin.id,
          newDoctor.id,
          JSON.stringify({
            full_name: newDoctor.full_name,
            str_number: newDoctor.str_number,
            email: newUser.email,
          }),
        ]
      );

      return {
        userId: newUser.id,
        doctorId: newDoctor.id,
        doctor: newDoctor,
      };
    });

    return {
      success: true,
      data: result,
    };
  } catch (err) {
    if (err.code === '23505') {
      return { success: false, error: 'Email atau Nomor STR sudah terdaftar.', status: 409 };
    }
    return toServiceErrorResult('createDoctor', err);
  }
}

export async function updateDoctor(id, input) {
  try {
    const admin = await requireAdmin();
    const raw = normalizeInput(input);

    const { full_name, poli_id, str_number, bio, photo_url } = raw;

    if (!full_name || !poli_id || !str_number) {
      return {
        success: false,
        error: 'Nama lengkap, poli, dan nomor STR wajib diisi.',
        status: 400,
      };
    }

    const res = await query(
      `UPDATE doctors
       SET full_name = $1, poli_id = $2, str_number = $3, bio = $4, photo_url = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        full_name.trim(),
        poli_id,
        str_number.trim(),
        bio?.trim() || null,
        photo_url?.trim() || null,
        id,
      ]
    );

    if (res.rows.length === 0) {
      return { success: false, error: 'Dokter tidak ditemukan.', status: 404 };
    }

    const updated = res.rows[0];

    await query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
       VALUES ($1, 'UPDATE_DOCTOR', 'doctors', $2, $3)`,
      [admin.id, updated.id, JSON.stringify({ full_name: updated.full_name })]
    );

    return {
      success: true,
      data: updated,
    };
  } catch (err) {
    if (err.code === '23505') {
      return { success: false, error: 'Nomor STR sudah terdaftar pada dokter lain.', status: 409 };
    }
    return toServiceErrorResult('updateDoctor', err);
  }
}

export async function toggleDoctorActive(id) {
  try {
    const admin = await requireAdmin();

    const res = await query(
      `UPDATE doctors
       SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1
       RETURNING id, user_id, full_name, is_active`,
      [id]
    );

    if (res.rows.length === 0) {
      return { success: false, error: 'Dokter tidak ditemukan.', status: 404 };
    }

    const updated = res.rows[0];

    await query(
      `UPDATE users
       SET is_active = $1, updated_at = NOW()
       WHERE id = $2`,
      [updated.is_active, updated.user_id]
    );

    await query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
       VALUES ($1, 'TOGGLE_DOCTOR_ACTIVE', 'doctors', $2, $3)`,
      [admin.id, updated.id, JSON.stringify({ full_name: updated.full_name, is_active: updated.is_active })]
    );

    return {
      success: true,
      data: updated,
    };
  } catch (err) {
    return toServiceErrorResult('toggleDoctorActive', err);
  }
}

export async function getMedicines() {
  try {
    await requireAdminOrDoctor();
    await ensurePharmacySchema();

    const res = await query(
      `SELECT
         m.*,
         COALESCE(m.price, 0)::numeric AS price,
         COALESCE(tx.active_transaction_count, 0)::int AS active_transaction_count
       FROM medicines m
       LEFT JOIN (
         SELECT
           pi.medicine_id,
           COUNT(DISTINCT pr.id)::int AS active_transaction_count
         FROM prescription_items pi
         JOIN prescriptions pr ON pi.prescription_id = pr.id
         LEFT JOIN prescription_payments pp ON pr.id = pp.prescription_id
         WHERE pr.status IN ('WAITING', 'PROCESSING', 'READY')
            OR (
              pr.status <> 'CANCELLED'
              AND pp.id IS NOT NULL
              AND pp.status IN ('UNPAID', 'WAITING_CONFIRMATION', 'REJECTED')
            )
         GROUP BY pi.medicine_id
       ) tx ON m.id = tx.medicine_id
       WHERE m.is_active = true
       ORDER BY m.name ASC`
    );
    return {
      success: true,
      data: res.rows.map((row) => ({
        ...row,
        price: Number(row.price) || 0,
      })),
    };
  } catch (err) {
    return toServiceErrorResult('getMedicines', err);
  }
}

export async function createMedicine(input) {
  try {
    const admin = await requireAdmin();
    await ensurePharmacySchema();
    const raw = normalizeInput(input);

    const normalizedType = String(raw.medicine_type || 'BIASA').toUpperCase();
    const parsedRaw = {
      ...raw,
      description: raw.description?.trim() || null,
      medicine_type: normalizedType === 'KERAS' ? 'KERAS' : 'BIASA',
      form: raw.form ?? raw.dosage_form,
      price: raw.price !== undefined && raw.price !== '' ? Number(raw.price) : 0,
      stock: raw.stock !== undefined ? Number(raw.stock) : 0,
      min_stock: raw.min_stock !== undefined ? Number(raw.min_stock) : 0,
    };

    const validation = medicineSchema.safeParse(parsedRaw);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || 'Data obat tidak valid.',
        status: 400,
      };
    }

    const { code, name, description, medicine_type, category, form, unit, price, stock, min_stock } = validation.data;

    const result = await withTransaction(async (client) => {
      const medRes = await client.query(
        `INSERT INTO medicines (code, name, description, medicine_type, category, form, unit, price, stock, min_stock, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
         RETURNING *`,
        [
          code.trim(),
          name.trim(),
          description?.trim() || null,
          medicine_type,
          category || null,
          form || null,
          unit.trim(),
          price || 0,
          stock || 0,
          min_stock || 0,
        ]
      );
      const newMed = medRes.rows[0];

      if (stock > 0) {
        await client.query(
          `INSERT INTO stock_movements (medicine_id, type, quantity, balance_after, created_by)
           VALUES ($1, 'IN', $2, $3, $4)`,
          [newMed.id, stock, stock, admin.id]
        );
      }

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
         VALUES ($1, 'CREATE_MEDICINE', 'medicines', $2, $3)`,
        [
          admin.id,
          newMed.id,
          JSON.stringify({
            name: newMed.name,
            code: newMed.code,
            medicine_type: newMed.medicine_type,
            price: Number(newMed.price) || 0,
            initial_stock: stock,
          }),
        ]
      );

      return newMed;
    });

    return {
      success: true,
      data: result,
    };
  } catch (err) {
    if (err.code === '23505') {
      return { success: false, error: 'Kode obat sudah digunakan oleh obat lain.', status: 409 };
    }
    return toServiceErrorResult('createMedicine', err);
  }
}

export async function updateMedicine(id, input) {
  try {
    const admin = await requireAdmin();
    await ensurePharmacySchema();
    const raw = normalizeInput(input);

    const code = raw.code;
    const name = raw.name;
    const description = raw.description?.trim() || null;
    const medicine_type = String(raw.medicine_type || 'BIASA').toUpperCase() === 'KERAS' ? 'KERAS' : 'BIASA';
    const category = raw.category;
    const form = raw.form ?? raw.dosage_form;
    const unit = raw.unit;
    const hasPriceInput = raw.price !== undefined && raw.price !== '';
    const parsedPrice = hasPriceInput ? Number(raw.price) : undefined;
    const hasStockInput = raw.stock !== undefined && raw.stock !== '';
    const parsedStock = hasStockInput ? Number(raw.stock) : undefined;
    const min_stock = raw.min_stock;

    if (!code || !name || !unit) {
      return {
        success: false,
        error: 'Kode, nama obat, dan satuan wajib diisi.',
        status: 400,
      };
    }

    if (hasPriceInput && (Number.isNaN(parsedPrice) || parsedPrice < 0)) {
      return {
        success: false,
        error: 'Harga obat tidak boleh bernilai negatif.',
        status: 400,
      };
    }

    if (hasStockInput && (Number.isNaN(parsedStock) || parsedStock < 0)) {
      return {
        success: false,
        error: 'Stok tidak boleh bernilai negatif.',
        status: 400,
      };
    }

    const updated = await withTransaction(async (client) => {
      const existingRes = await client.query(
        'SELECT id, stock, price FROM medicines WHERE id = $1 FOR UPDATE',
        [id]
      );
      if (existingRes.rows.length === 0) {
        throw new ServiceError('Obat tidak ditemukan.', 404);
      }

      const previousStock = Number(existingRes.rows[0].stock) || 0;
      const previousPrice = Number(existingRes.rows[0].price) || 0;
      const nextStock = hasStockInput ? Math.floor(parsedStock) : previousStock;
      const nextPrice = hasPriceInput ? parsedPrice : previousPrice;

      const res = await client.query(
        `UPDATE medicines
         SET code = $1,
             name = $2,
             description = $3,
             medicine_type = $4,
             category = $5,
             form = $6,
             unit = $7,
             price = $8,
             stock = $9,
             min_stock = $10,
             updated_at = NOW()
         WHERE id = $11
         RETURNING *`,
        [
          code.trim(),
          name.trim(),
          description,
          medicine_type,
          category?.trim() || null,
          form?.trim() || null,
          unit.trim(),
          nextPrice,
          nextStock,
          Number(min_stock) || 0,
          id,
        ]
      );

      const row = res.rows[0];

      if (hasStockInput && nextStock !== previousStock) {
        await client.query(
          `INSERT INTO stock_movements (medicine_id, type, quantity, balance_after, created_by)
           VALUES ($1, 'ADJUSTMENT', $2, $3, $4)`,
          [id, nextStock - previousStock, nextStock, admin.id]
        );
      }

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
         VALUES ($1, 'UPDATE_MEDICINE', 'medicines', $2, $3)`,
        [
          admin.id,
          row.id,
          JSON.stringify({
            name: row.name,
            code: row.code,
            medicine_type: row.medicine_type,
            price: Number(row.price) || 0,
            stock: nextStock,
          }),
        ]
      );

      return row;
    });

    return {
      success: true,
      data: updated,
    };
  } catch (err) {
    if (err.code === '23505') {
      return { success: false, error: 'Kode obat sudah digunakan oleh obat lain.', status: 409 };
    }
    return toServiceErrorResult('updateMedicine', err);
  }
}

export async function restockMedicine(medicineId, quantity) {
  try {
    const admin = await requireAdmin();
    const restockQty = Number(quantity);

    if (isNaN(restockQty) || restockQty <= 0) {
      return {
        success: false,
        error: 'Jumlah restok harus berupa angka lebih besar dari 0.',
        status: 400,
      };
    }

    const result = await withTransaction(async (client) => {
      const medRes = await client.query(
        'SELECT id, name, stock FROM medicines WHERE id = $1 FOR UPDATE',
        [medicineId]
      );

      if (medRes.rows.length === 0) {
        throw new ServiceError('Obat tidak ditemukan.', 404);
      }

      const medicine = medRes.rows[0];
      const newStock = Number(medicine.stock) + restockQty;

      await client.query(
        'UPDATE medicines SET stock = $1, updated_at = NOW() WHERE id = $2',
        [newStock, medicine.id]
      );

      await client.query(
        `INSERT INTO stock_movements (medicine_id, type, quantity, balance_after, created_by)
         VALUES ($1, 'IN', $2, $3, $4)`,
        [medicine.id, restockQty, newStock, admin.id]
      );

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
         VALUES ($1, 'RESTOCK_MEDICINE', 'medicines', $2, $3)`,
        [
          admin.id,
          medicine.id,
          JSON.stringify({
            medicine_name: medicine.name,
            added: restockQty,
            balance_after: newStock,
          }),
        ]
      );

      return {
        medicineId: medicine.id,
        name: medicine.name,
        previousStock: medicine.stock,
        addedQuantity: restockQty,
        newStock,
      };
    });

    return {
      success: true,
      data: result,
    };
  } catch (err) {
    return toServiceErrorResult('restockMedicine', err);
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function deleteMedicine(medicineId) {
  try {
    const admin = await requireAdmin();
    await ensurePharmacySchema();

    if (!medicineId || !UUID_REGEX.test(medicineId)) {
      return {
        success: false,
        error: 'ID obat tidak valid.',
        status: 400,
      };
    }

    const result = await withTransaction(async (client) => {
      const medRes = await client.query(
        'SELECT id, code, name, stock, unit, is_active FROM medicines WHERE id = $1 FOR UPDATE',
        [medicineId]
      );

      if (medRes.rows.length === 0) {
        throw new ServiceError('Obat tidak ditemukan.', 404);
      }

      const medicine = medRes.rows[0];

      // Block deletion if medicine is currently in any ongoing prescription or unpaid payment transaction
      const activeTxRes = await client.query(
        `SELECT COUNT(DISTINCT pr.id)::int AS count
         FROM prescription_items pi
         JOIN prescriptions pr ON pi.prescription_id = pr.id
         LEFT JOIN prescription_payments pp ON pr.id = pp.prescription_id
         WHERE pi.medicine_id = $1
           AND (
             pr.status IN ('WAITING', 'PROCESSING', 'READY')
             OR (
               pr.status <> 'CANCELLED'
               AND pp.id IS NOT NULL
               AND pp.status IN ('UNPAID', 'WAITING_CONFIRMATION', 'REJECTED')
             )
           )`,
        [medicineId]
      );
      const activeTxCount = activeTxRes.rows[0]?.count || 0;

      if (activeTxCount > 0) {
        throw new ServiceError(
          `Obat "${medicine.name}" tidak dapat dihapus karena sedang dalam proses transaksi (${activeTxCount} resep aktif/menunggu pembayaran). Selesaikan atau batalkan transaksi terkait terlebih dahulu.`,
          409
        );
      }

      const prescUsageRes = await client.query(
        'SELECT COUNT(*)::int AS count FROM prescription_items WHERE medicine_id = $1',
        [medicineId]
      );
      const usageCount = prescUsageRes.rows[0]?.count || 0;

      if (usageCount > 0) {
        // Soft delete: medicine has already been used in prescriptions, preserve medical history
        await client.query(
          'UPDATE medicines SET is_active = false, updated_at = NOW() WHERE id = $1',
          [medicineId]
        );

        await client.query(
          `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
           VALUES ($1, 'DELETE_MEDICINE', 'medicines', $2, $3)`,
          [
            admin.id,
            medicine.id,
            JSON.stringify({
              mode: 'SOFT_DELETE',
              code: medicine.code,
              name: medicine.name,
              prescription_item_count: usageCount,
            }),
          ]
        );

        return {
          id: medicine.id,
          name: medicine.name,
          code: medicine.code,
          mode: 'archived',
        };
      }

      // Hard delete: no prescription history exists, clean up stock movements then delete medicine
      await client.query('DELETE FROM stock_movements WHERE medicine_id = $1', [medicineId]);
      await client.query('DELETE FROM medicines WHERE id = $1', [medicineId]);

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
         VALUES ($1, 'DELETE_MEDICINE', 'medicines', $2, $3)`,
        [
          admin.id,
          medicine.id,
          JSON.stringify({
            mode: 'HARD_DELETE',
            code: medicine.code,
            name: medicine.name,
            previous_stock: medicine.stock,
          }),
        ]
      );

      return {
        id: medicine.id,
        name: medicine.name,
        code: medicine.code,
        mode: 'deleted',
      };
    });

    return {
      success: true,
      data: result,
      message:
        result.mode === 'archived'
          ? `Obat "${result.name}" dinonaktifkan dari inventori karena sudah memiliki riwayat resep.`
          : `Obat "${result.name}" berhasil dihapus permanen.`,
    };
  } catch (err) {
    return toServiceErrorResult('deleteMedicine', err);
  }
}

export async function getAllAppointments(filters = {}) {
  try {
    await requireAdmin();

    let sql = `
      SELECT 
        a.id,
        a.patient_id,
        a.doctor_id,
        a.schedule_id,
        a.appointment_date,
        a.slot_start,
        a.queue_no,
        a.complaint,
        a.status,
        a.rejection_reason,
        a.created_at,
        p.full_name AS patient_name,
        p.medical_record_no,
        p.phone AS patient_phone,
        d.full_name AS doctor_name,
        pol.name AS poli_name,
        f.rating AS feedback_rating
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN doctors d ON a.doctor_id = d.id
      JOIN polis pol ON d.poli_id = pol.id
      LEFT JOIN feedbacks f ON a.id = f.appointment_id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (filters.status) {
      sql += ` AND a.status = $${paramIndex++}`;
      params.push(filters.status);
    }

    if (filters.date) {
      sql += ` AND a.appointment_date = $${paramIndex++}`;
      params.push(filters.date);
    }

    if (filters.doctor_id) {
      sql += ` AND a.doctor_id = $${paramIndex++}`;
      params.push(filters.doctor_id);
    }

    sql += ' ORDER BY a.appointment_date DESC, a.slot_start DESC';

    const res = await query(sql, params);

    return {
      success: true,
      data: res.rows,
    };
  } catch (err) {
    return toServiceErrorResult('getAllAppointments', err);
  }
}

export async function updateAppointmentStatusByAdmin(appointmentId, targetStatus, reason = '') {
  try {
    const admin = await requireAdmin();
    const updated = await transitionAppointmentStatus({
      appointmentId,
      actorUser: admin,
      doctorScopeId: null,
      actorLabel: 'Administrator',
      targetStatus,
      reason,
    });
    return {
      success: true,
      data: updated,
    };
  } catch (err) {
    return toServiceErrorResult('updateAppointmentStatusByAdmin', err);
  }
}

export async function getAuditLogs(limit = 100) {
  try {
    await requireAdmin();

    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);

    const res = await query(
      `SELECT 
         l.id,
         l.user_id,
         l.action,
         l.entity,
         l.entity_id,
         l.metadata,
         l.ip_address,
         l.created_at,
         u.email AS user_email,
         u.role AS user_role
       FROM audit_logs l
       LEFT JOIN users u ON l.user_id = u.id
       ORDER BY l.created_at DESC
       LIMIT $1`,
      [safeLimit]
    );

    return {
      success: true,
      data: res.rows,
    };
  } catch (err) {
    return toServiceErrorResult('getAuditLogs', err);
  }
}
