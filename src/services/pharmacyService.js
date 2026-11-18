import { query, withTransaction } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ServiceError, toServiceErrorResult } from '@/lib/serviceErrors';

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
         COALESCE(
           json_agg(
             json_build_object(
               'id', pi.id,
               'medicine_id', m.id,
               'name', m.name,
               'code', m.code,
               'quantity', pi.quantity,
               'dosage_rule', pi.dosage_rule,
               'duration_days', pi.duration_days,
               'unit', m.unit,
               'current_stock', m.stock
             )
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
         u_proc.email
       ORDER BY pr.created_at ASC`
    );

    return {
      success: true,
      data: res.rows,
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
