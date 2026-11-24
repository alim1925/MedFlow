import { query, withTransaction } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ServiceError, toServiceErrorResult } from '@/lib/serviceErrors';
import { ensurePharmacySchema } from '@/lib/pharmacySchema';
import { ensureOperationalSchema } from '@/services/operationalReportService';
import { formatRupiah, buildPrescriptionInvoiceNumber } from '@/lib/currency';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Helper to ensure the caller has the ADMIN role (Pharmacy operator).
 * @returns {Promise<{id: string, email: string, role: string}>}
 */
async function requirePharmacyAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    throw new ServiceError('Sesi tidak ditemukan. Silakan masuk terlebih dahulu.', 401);
  }
  if (user.role !== 'ADMIN') {
    throw new ServiceError(
      'Akses ditolak: Hanya petugas farmasi atau administrator yang diizinkan.',
      403
    );
  }
  return user;
}

export async function getPharmacyQueue() {
  try {
    await requirePharmacyAdmin();
    await ensurePharmacySchema();

    const res = await query(
      `SELECT 
         pr.id,
         pr.medical_record_id,
         pr.status,
         pr.processed_by,
         pr.ready_at,
         pr.picked_up_at,
         pr.notes,
         pr.created_at,
         p.full_name AS patient_name,
         p.medical_record_no,
         p.birth_date,
         p.gender,
         d.full_name AS doctor_name,
         pol.name AS poli_name,
         a.appointment_date,
         u_proc.email AS processed_by_email,
         pp.id AS payment_id,
         pp.invoice_number,
         COALESCE(pp.status, 'UNPAID') AS payment_status,
         pp.payment_method,
         pp.payer_name,
         pp.payment_reference,
         pp.payment_notes,
         pp.paid_at,
         pp.confirmed_at,
         pp.rejection_reason AS payment_rejection_reason,
         u_conf.email AS confirmed_by_email,
         COALESCE(
           pp.total_amount,
           SUM(pi.quantity * COALESCE(pi.unit_price, m.price, 0)),
           0
         )::numeric AS total_amount,
         COALESCE(
           json_agg(
             json_build_object(
               'id', pi.id,
               'medicine_id', m.id,
               'name', m.name,
               'code', m.code,
               'quantity', pi.quantity,
               'unit_price', COALESCE(pi.unit_price, m.price, 0),
               'subtotal', (pi.quantity * COALESCE(pi.unit_price, m.price, 0)),
               'dosage_rule', pi.dosage_rule,
               'duration_days', pi.duration_days,
               'unit', m.unit,
               'current_stock', m.stock
             )
             ORDER BY pi.created_at ASC
           ) FILTER (WHERE pi.id IS NOT NULL),
           '[]'::json
         ) AS items
       FROM prescriptions pr
       JOIN medical_records mr ON pr.medical_record_id = mr.id
       JOIN appointments a ON mr.appointment_id = a.id
       JOIN patients p ON a.patient_id = p.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN polis pol ON d.poli_id = pol.id
       LEFT JOIN users u_proc ON pr.processed_by = u_proc.id
       LEFT JOIN prescription_payments pp ON pr.id = pp.prescription_id
       LEFT JOIN users u_conf ON pp.confirmed_by = u_conf.id
       LEFT JOIN prescription_items pi ON pr.id = pi.prescription_id
       LEFT JOIN medicines m ON pi.medicine_id = m.id
       WHERE pr.status IN ('WAITING', 'PROCESSING', 'READY', 'PICKED_UP')
       GROUP BY 
         pr.id, 
         p.full_name, 
         p.medical_record_no, 
         p.birth_date, 
         p.gender, 
         d.full_name, 
         pol.name, 
         a.appointment_date,
         u_proc.email,
         pp.id,
         u_conf.email
       ORDER BY pr.created_at ASC`
    );

    return {
      success: true,
      data: res.rows.map((row) => ({
        ...row,
        invoice_number: row.invoice_number || buildPrescriptionInvoiceNumber(row.id, row.created_at),
        total_amount: Number(row.total_amount) || 0,
      })),
    };
  } catch (err) {
    return toServiceErrorResult('getPharmacyQueue', err);
  }
}

export async function startProcessing(prescriptionId) {
  try {
    const user = await requirePharmacyAdmin();

    const res = await query(
      `UPDATE prescriptions
       SET status = 'PROCESSING', processed_by = $1, updated_at = NOW()
       WHERE id = $2 AND status = 'WAITING'
       RETURNING *`,
      [user.id, prescriptionId]
    );

    if (res.rows.length === 0) {
      return {
        success: false,
        error: 'Resep tidak ditemukan atau sudah tidak dalam status MENUNGGU.',
        status: 404,
      };
    }

    const updated = res.rows[0];

    await query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
       VALUES ($1, 'START_PROCESSING_PRESCRIPTION', 'prescriptions', $2, $3)`,
      [user.id, updated.id, JSON.stringify({ prescription_id: updated.id })]
    );

    return {
      success: true,
      data: updated,
    };
  } catch (err) {
    return toServiceErrorResult('startProcessing', err);
  }
}

export async function markReady(prescriptionId) {
  try {
    const user = await requirePharmacyAdmin();

    const result = await withTransaction(async (client) => {
      const prescRes = await client.query(
        `SELECT pr.*, p.user_id AS patient_user_id, p.full_name AS patient_name
         FROM prescriptions pr
         JOIN medical_records mr ON pr.medical_record_id = mr.id
         JOIN patients p ON mr.patient_id = p.id
         WHERE pr.id = $1
         FOR UPDATE`,
        [prescriptionId]
      );

      if (prescRes.rows.length === 0) {
        throw new ServiceError('Resep obat tidak ditemukan.', 404);
      }

      const prescription = prescRes.rows[0];

      if (prescription.status === 'READY' || prescription.status === 'PICKED_UP') {
        throw new ServiceError(
          'Resep ini sudah pernah diproses dan ditandai siap diambil sebelumnya.',
          409
        );
      }

      if (prescription.status === 'CANCELLED') {
        throw new ServiceError('Resep ini telah dibatalkan.', 400);
      }

      const itemsRes = await client.query(
        `SELECT id, medicine_id, quantity, dosage_rule 
         FROM prescription_items 
         WHERE prescription_id = $1`,
        [prescriptionId]
      );

      const items = itemsRes.rows;

      if (items.length === 0) {
        throw new ServiceError('Resep tidak memiliki item obat untuk diproses.', 400);
      }

      for (const item of items) {
        const medRes = await client.query(
          'SELECT id, name, stock FROM medicines WHERE id = $1 FOR UPDATE',
          [item.medicine_id]
        );

        if (medRes.rows.length === 0) {
          throw new ServiceError(
            `Obat dengan ID ${item.medicine_id} tidak ditemukan dalam basis data.`,
            404
          );
        }

        const medicine = medRes.rows[0];

        if (Number(medicine.stock) < Number(item.quantity)) {
          throw new ServiceError(
            `Stok obat '${medicine.name}' tidak mencukupi. Stok tersedia: ${medicine.stock}, dibutuhkan: ${item.quantity}`,
            400
          );
        }

        const newStock = Number(medicine.stock) - Number(item.quantity);

        await client.query(
          'UPDATE medicines SET stock = $1, updated_at = NOW() WHERE id = $2',
          [newStock, medicine.id]
        );

        await client.query(
          `INSERT INTO stock_movements (
             medicine_id, prescription_id, type, quantity, balance_after, created_by
           )
           VALUES ($1, $2, 'OUT', $3, $4, $5)`,
          [medicine.id, prescriptionId, item.quantity, newStock, user.id]
        );
      }

      const updatePresc = await client.query(
        `UPDATE prescriptions
         SET status = 'READY', ready_at = NOW(), processed_by = COALESCE(processed_by, $1), updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [user.id, prescriptionId]
      );
      const readyPrescription = updatePresc.rows[0];

      if (prescription.patient_user_id) {
        await client.query(
          `INSERT INTO notifications (user_id, title, message, type)
           VALUES ($1, $2, $3, 'PRESCRIPTION')`,
          [
            prescription.patient_user_id,
            'Resep Obat Siap Diambil',
            'Obat Anda telah selesai disiapkan oleh petugas farmasi dan dapat segera diambil di loket farmasi RS MedFlow.',
          ]
        );
      }

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
         VALUES ($1, 'PRESCRIPTION_READY', 'prescriptions', $2, $3)`,
        [
          user.id,
          prescriptionId,
          JSON.stringify({
            prescription_id: prescriptionId,
            item_count: items.length,
            patient_name: prescription.patient_name,
          }),
        ]
      );

      return readyPrescription;
    });

    return {
      success: true,
      data: result,
    };
  } catch (err) {
    return toServiceErrorResult(
      'markReady',
      err,
      'Gagal mengubah status resep menjadi Siap Diambil.'
    );
  }
}

export async function markPickedUp(prescriptionId) {
  try {
    const user = await requirePharmacyAdmin();
    await ensurePharmacySchema();

    const result = await withTransaction(async (client) => {
      const prescRes = await client.query(
        `SELECT pr.*, p.user_id AS patient_user_id
         FROM prescriptions pr
         JOIN medical_records mr ON pr.medical_record_id = mr.id
         JOIN patients p ON mr.patient_id = p.id
         WHERE pr.id = $1 AND pr.status = 'READY'
         FOR UPDATE`,
        [prescriptionId]
      );

      if (prescRes.rows.length === 0) {
        throw new ServiceError('Resep tidak ditemukan atau belum berstatus Siap Diambil.', 404);
      }

      const prescription = prescRes.rows[0];

      const billRes = await client.query(
        `SELECT
           pp.status AS payment_status,
           COALESCE(
             pp.total_amount,
             (
               SELECT COALESCE(SUM(pi.quantity * COALESCE(pi.unit_price, m.price, 0)), 0)
               FROM prescription_items pi
               LEFT JOIN medicines m ON pi.medicine_id = m.id
               WHERE pi.prescription_id = $1
             ),
             0
           )::numeric AS total_amount
         FROM prescriptions pr
         LEFT JOIN prescription_payments pp ON pr.id = pp.prescription_id
         WHERE pr.id = $1`,
        [prescriptionId]
      );

      const totalAmount = Number(billRes.rows[0]?.total_amount) || 0;
      const paymentStatus = billRes.rows[0]?.payment_status || 'UNPAID';

      if (totalAmount > 0 && paymentStatus !== 'PAID') {
        throw new ServiceError(
          'Pembayaran obat belum dikonfirmasi lunas oleh admin. Konfirmasi pembayaran terlebih dahulu sebelum menyerahkan obat.',
          400
        );
      }

      const updateRes = await client.query(
        `UPDATE prescriptions
         SET status = 'PICKED_UP', picked_up_at = NOW(), updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [prescriptionId]
      );
      const pickedUp = updateRes.rows[0];

      if (prescription.patient_user_id) {
        await client.query(
          `INSERT INTO notifications (user_id, title, message, type)
           VALUES ($1, $2, $3, 'PRESCRIPTION')`,
          [
            prescription.patient_user_id,
            'Obat Telah Diambil',
            'Terima kasih telah mengambil resep obat Anda di RS MedFlow. Semoga lekas sembuh!',
          ]
        );
      }

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
         VALUES ($1, 'PRESCRIPTION_PICKED_UP', 'prescriptions', $2, $3)`,
        [user.id, prescriptionId, JSON.stringify({ prescription_id: prescriptionId })]
      );

      return pickedUp;
    });

    return {
      success: true,
      data: result,
    };
  } catch (err) {
    return toServiceErrorResult('markPickedUp', err);
  }
}

export async function cancelPrescription(prescriptionId, reason) {
  try {
    const user = await requirePharmacyAdmin();

    const res = await query(
      `UPDATE prescriptions
       SET status = 'CANCELLED', notes = $1, updated_at = NOW()
       WHERE id = $2 AND status IN ('WAITING', 'PROCESSING')
       RETURNING *`,
      [reason?.trim() || 'Dibatalkan oleh petugas farmasi', prescriptionId]
    );

    if (res.rows.length === 0) {
      return {
        success: false,
        error: 'Resep tidak ditemukan atau sudah tidak dapat dibatalkan (sudah siap/diambil).',
        status: 404,
      };
    }

    const cancelled = res.rows[0];

    await query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
       VALUES ($1, 'CANCEL_PRESCRIPTION', 'prescriptions', $2, $3)`,
      [
        user.id,
        prescriptionId,
        JSON.stringify({ reason: reason || 'Dibatalkan oleh petugas farmasi' }),
      ]
    );

    return {
      success: true,
      data: cancelled,
    };
  } catch (err) {
    return toServiceErrorResult('cancelPrescription', err);
  }
}

export async function getPrescriptionPayments(statusFilter = '') {
  try {
    await requirePharmacyAdmin();
    await ensurePharmacySchema();

    const normalizedFilter = String(statusFilter || '').trim().toUpperCase();
    const params = [];
    let filterClause = '';
    if (['UNPAID', 'WAITING_CONFIRMATION', 'PAID', 'REJECTED'].includes(normalizedFilter)) {
      filterClause = ` AND COALESCE(pp.status, 'UNPAID') = $1`;
      params.push(normalizedFilter);
    }

    const res = await query(
      `SELECT
         pr.id AS prescription_id,
         pr.status AS prescription_status,
         pr.created_at AS prescription_created_at,
         pr.ready_at,
         pr.picked_up_at,
         p.id AS patient_id,
         p.full_name AS patient_name,
         p.medical_record_no,
         p.phone AS patient_phone,
         d.full_name AS doctor_name,
         pol.name AS poli_name,
         mr.diagnosis,
         pp.id AS payment_id,
         pp.invoice_number,
         COALESCE(pp.status, 'UNPAID') AS payment_status,
         pp.payment_method,
         pp.payer_name,
         pp.payment_reference,
         pp.payment_notes,
         pp.paid_at,
         pp.confirmed_at,
         pp.rejection_reason,
         u_conf.email AS confirmed_by_email,
         COALESCE(
           pp.total_amount,
           SUM(pi.quantity * COALESCE(pi.unit_price, m.price, 0)),
           0
         )::numeric AS total_amount,
         COALESCE(
           json_agg(
             json_build_object(
               'id', pi.id,
               'medicine_id', m.id,
               'medicine_name', m.name,
               'medicine_code', m.code,
               'quantity', pi.quantity,
               'unit_price', COALESCE(pi.unit_price, m.price, 0),
               'subtotal', (pi.quantity * COALESCE(pi.unit_price, m.price, 0)),
               'unit', m.unit,
               'dosage_rule', pi.dosage_rule
             )
             ORDER BY pi.created_at ASC
           ) FILTER (WHERE pi.id IS NOT NULL),
           '[]'::json
         ) AS items
       FROM prescriptions pr
       JOIN medical_records mr ON pr.medical_record_id = mr.id
       JOIN patients p ON mr.patient_id = p.id
       JOIN doctors d ON mr.doctor_id = d.id
       JOIN polis pol ON d.poli_id = pol.id
       LEFT JOIN prescription_payments pp ON pr.id = pp.prescription_id
       LEFT JOIN users u_conf ON pp.confirmed_by = u_conf.id
       LEFT JOIN prescription_items pi ON pr.id = pi.prescription_id
       LEFT JOIN medicines m ON pi.medicine_id = m.id
       WHERE pr.status <> 'CANCELLED'${filterClause}
       GROUP BY pr.id, p.id, d.full_name, pol.name, mr.diagnosis, pp.id, u_conf.email
       ORDER BY
         CASE COALESCE(pp.status, 'UNPAID')
           WHEN 'WAITING_CONFIRMATION' THEN 1
           WHEN 'REJECTED' THEN 2
           WHEN 'UNPAID' THEN 3
           ELSE 4
         END ASC,
         COALESCE(pp.paid_at, pr.created_at) DESC`,
      params
    );

    return {
      success: true,
      data: res.rows.map((row) => ({
        ...row,
        invoice_number:
          row.invoice_number ||
          buildPrescriptionInvoiceNumber(row.prescription_id, row.prescription_created_at),
        total_amount: Number(row.total_amount) || 0,
      })),
    };
  } catch (err) {
    return toServiceErrorResult('getPrescriptionPayments', err);
  }
}

export async function confirmPrescriptionPayment(prescriptionId, input = {}) {
  try {
    const admin = await requirePharmacyAdmin();
    await ensurePharmacySchema();
    await ensureOperationalSchema();

    if (!prescriptionId || !UUID_REGEX.test(prescriptionId)) {
      return { success: false, error: 'ID resep tidak valid.', status: 400 };
    }

    const result = await withTransaction(async (client) => {
      const prescRes = await client.query(
        `SELECT
           pr.id,
           pr.status,
           pr.created_at,
           mr.patient_id,
           p.user_id AS patient_user_id,
           p.full_name AS patient_name
         FROM prescriptions pr
         JOIN medical_records mr ON pr.medical_record_id = mr.id
         JOIN patients p ON mr.patient_id = p.id
         WHERE pr.id = $1
         FOR UPDATE`,
        [prescriptionId]
      );

      if (prescRes.rows.length === 0) {
        throw new ServiceError('Resep obat tidak ditemukan.', 404);
      }

      const prescription = prescRes.rows[0];
      if (prescription.status === 'CANCELLED') {
        throw new ServiceError('Resep ini sudah dibatalkan dan tidak dapat dikonfirmasi.', 400);
      }

      const totalRes = await client.query(
        `SELECT COALESCE(SUM(pi.quantity * COALESCE(pi.unit_price, m.price, 0)), 0)::numeric AS total_amount
         FROM prescription_items pi
         LEFT JOIN medicines m ON pi.medicine_id = m.id
         WHERE pi.prescription_id = $1`,
        [prescriptionId]
      );
      const totalAmount = Number(totalRes.rows[0]?.total_amount) || 0;

      const existingPayRes = await client.query(
        'SELECT * FROM prescription_payments WHERE prescription_id = $1 FOR UPDATE',
        [prescriptionId]
      );
      const existingPayment = existingPayRes.rows[0] || null;

      if (existingPayment?.status === 'PAID') {
        throw new ServiceError('Pembayaran untuk resep ini sudah dikonfirmasi lunas sebelumnya.', 409);
      }

      const invoiceNumber =
        existingPayment?.invoice_number ||
        buildPrescriptionInvoiceNumber(prescriptionId, prescription.created_at);

      const requestedMethod = input?.payment_method
        ? String(input.payment_method).toUpperCase()
        : null;
      const effectiveMethod = ['CASH', 'TRANSFER', 'QRIS', 'BPJS'].includes(requestedMethod)
        ? requestedMethod
        : existingPayment?.payment_method || 'CASH';

      const effectiveNotes =
        input?.notes?.trim() || existingPayment?.payment_notes || null;
      const effectivePayer =
        existingPayment?.payer_name || prescription.patient_name;
      const effectiveRef =
        existingPayment?.payment_reference ||
        (effectiveMethod === 'CASH' ? 'Dikonfirmasi Tunai oleh Admin' : 'Dikonfirmasi oleh Admin');

      const upsertRes = await client.query(
        `INSERT INTO prescription_payments (
           prescription_id, patient_id, invoice_number, total_amount,
           payment_method, status, payer_name, payment_reference, payment_notes,
           paid_at, confirmed_by, confirmed_at, rejection_reason
         )
         VALUES ($1, $2, $3, $4, $5, 'PAID', $6, $7, $8, NOW(), $9, NOW(), NULL)
         ON CONFLICT (prescription_id) DO UPDATE SET
           total_amount = EXCLUDED.total_amount,
           payment_method = EXCLUDED.payment_method,
           status = 'PAID',
           payer_name = COALESCE(prescription_payments.payer_name, EXCLUDED.payer_name),
           payment_reference = COALESCE(prescription_payments.payment_reference, EXCLUDED.payment_reference),
           payment_notes = COALESCE(EXCLUDED.payment_notes, prescription_payments.payment_notes),
           paid_at = COALESCE(prescription_payments.paid_at, NOW()),
           confirmed_by = $9,
           confirmed_at = NOW(),
           rejection_reason = NULL,
           updated_at = NOW()
         RETURNING *`,
        [
          prescriptionId,
          prescription.patient_id,
          invoiceNumber,
          totalAmount,
          effectiveMethod,
          effectivePayer,
          effectiveRef,
          effectiveNotes,
          admin.id,
        ]
      );

      const confirmedPayment = upsertRes.rows[0];

      // Automatically record confirmed pharmacy payment into operational revenues
      if (totalAmount > 0) {
        await client.query(
          `INSERT INTO operational_revenues (
             reference_no, transaction_date, category, description, amount, payment_method, notes, created_by
           )
           VALUES ($1, CURRENT_DATE, 'PHARMACY', $2, $3, $4, $5, $6)`,
          [
            invoiceNumber,
            `Pembayaran Obat Resep #${prescriptionId.slice(0, 8).toUpperCase()} - ${prescription.patient_name}`,
            totalAmount,
            effectiveMethod,
            effectiveNotes || 'Tercatat otomatis dari konfirmasi pembayaran farmasi',
            admin.id,
          ]
        );
      }

      if (prescription.patient_user_id) {
        await client.query(
          `INSERT INTO notifications (user_id, title, message, type)
           VALUES ($1, $2, $3, 'PAYMENT')`,
          [
            prescription.patient_user_id,
            'Pembayaran Obat Dikonfirmasi',
            `Pembayaran resep #${prescriptionId
              .slice(0, 8)
              .toUpperCase()} (${invoiceNumber}) sebesar ${formatRupiah(
              totalAmount
            )} telah dikonfirmasi oleh admin.`,
          ]
        );
      }

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
         VALUES ($1, 'CONFIRM_PRESCRIPTION_PAYMENT', 'prescription_payments', $2, $3)`,
        [
          admin.id,
          confirmedPayment.id,
          JSON.stringify({
            prescription_id: prescriptionId,
            invoice_number: invoiceNumber,
            total_amount: totalAmount,
            payment_method: effectiveMethod,
          }),
        ]
      );

      return confirmedPayment;
    });

    return {
      success: true,
      data: {
        ...result,
        total_amount: Number(result.total_amount) || 0,
      },
      message: 'Pembayaran resep berhasil dikonfirmasi lunas.',
    };
  } catch (err) {
    return toServiceErrorResult('confirmPrescriptionPayment', err);
  }
}

export async function rejectPrescriptionPayment(prescriptionId, reason = '') {
  try {
    const admin = await requirePharmacyAdmin();
    await ensurePharmacySchema();

    if (!prescriptionId || !UUID_REGEX.test(prescriptionId)) {
      return { success: false, error: 'ID resep tidak valid.', status: 400 };
    }

    const trimmedReason = String(reason || '').trim();
    if (trimmedReason.length < 3) {
      return {
        success: false,
        error: 'Alasan penolakan pembayaran wajib diisi minimal 3 karakter.',
        status: 400,
      };
    }

    const result = await withTransaction(async (client) => {
      const payRes = await client.query(
        `SELECT pp.*, p.user_id AS patient_user_id, p.full_name AS patient_name
         FROM prescription_payments pp
         JOIN patients p ON pp.patient_id = p.id
         WHERE pp.prescription_id = $1
         FOR UPDATE`,
        [prescriptionId]
      );

      if (payRes.rows.length === 0) {
        throw new ServiceError('Data pengajuan pembayaran tidak ditemukan.', 404);
      }

      const payment = payRes.rows[0];
      if (payment.status === 'PAID') {
        throw new ServiceError('Pembayaran yang sudah lunas tidak dapat ditolak.', 409);
      }
      if (payment.status !== 'WAITING_CONFIRMATION') {
        throw new ServiceError(
          'Hanya pembayaran yang berstatus Menunggu Konfirmasi yang dapat ditolak.',
          400
        );
      }

      const updateRes = await client.query(
        `UPDATE prescription_payments
         SET status = 'REJECTED',
             rejection_reason = $1,
             confirmed_by = $2,
             confirmed_at = NOW(),
             updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [trimmedReason, admin.id, payment.id]
      );
      const rejected = updateRes.rows[0];

      if (payment.patient_user_id) {
        await client.query(
          `INSERT INTO notifications (user_id, title, message, type)
           VALUES ($1, $2, $3, 'PAYMENT')`,
          [
            payment.patient_user_id,
            'Pembayaran Obat Ditolak',
            `Pembayaran resep #${prescriptionId
              .slice(0, 8)
              .toUpperCase()} (${payment.invoice_number}) ditolak oleh admin. Alasan: ${trimmedReason}. Silakan kirim ulang pembayaran Anda.`,
          ]
        );
      }

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
         VALUES ($1, 'REJECT_PRESCRIPTION_PAYMENT', 'prescription_payments', $2, $3)`,
        [
          admin.id,
          payment.id,
          JSON.stringify({
            prescription_id: prescriptionId,
            invoice_number: payment.invoice_number,
            reason: trimmedReason,
          }),
        ]
      );

      return rejected;
    });

    return {
      success: true,
      data: {
        ...result,
        total_amount: Number(result.total_amount) || 0,
      },
      message: 'Pengajuan pembayaran ditolak dan pasien telah diberi notifikasi.',
    };
  } catch (err) {
    return toServiceErrorResult('rejectPrescriptionPayment', err);
  }
}
