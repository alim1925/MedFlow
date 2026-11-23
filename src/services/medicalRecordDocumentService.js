import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ServiceError, toServiceErrorResult } from '@/lib/serviceErrors';
import { normalizeRecordForDocument } from '@/lib/medicalRecordPdf';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve a complete medical record with patient details, doctor info,
 * addenda, and prescription items for PDF generation / printing.
 * Enforces ownership RBAC for PATIENT and DOCTOR roles.
 *
 * @param {string} medicalRecordId
 * @returns {Promise<{success: boolean, data?: Object, error?: string, status?: number}>}
 */
export async function getMedicalRecordDocument(medicalRecordId) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: 'Sesi tidak ditemukan. Silakan masuk terlebih dahulu.',
        status: 401,
      };
    }

    if (!medicalRecordId || !UUID_REGEX.test(String(medicalRecordId))) {
      return {
        success: false,
        error: 'ID rekam medis tidak valid.',
        status: 400,
      };
    }

    const recordRes = await query(
      `SELECT
         mr.*,
         a.appointment_date,
         a.slot_start,
         a.queue_no,
         a.complaint AS appointment_complaint,
         p.user_id AS patient_user_id,
         p.full_name AS patient_name,
         p.medical_record_no,
         p.birth_date AS patient_birth_date,
         p.gender AS patient_gender,
         p.blood_type AS patient_blood_type,
         p.phone AS patient_phone,
         p.allergies AS patient_allergies,
         d.user_id AS doctor_user_id,
         d.full_name AS doctor_name,
         d.str_number AS doctor_str_number,
         pol.name AS poli_name
       FROM medical_records mr
       JOIN appointments a ON mr.appointment_id = a.id
       JOIN patients p ON mr.patient_id = p.id
       JOIN doctors d ON mr.doctor_id = d.id
       LEFT JOIN polis pol ON d.poli_id = pol.id
       WHERE mr.id = $1`,
      [medicalRecordId]
    );

    if (recordRes.rows.length === 0) {
      return {
        success: false,
        error: 'Dokumen rekam medis tidak ditemukan.',
        status: 404,
      };
    }

    const row = recordRes.rows[0];

    const isOwnerPatient = user.role === 'PATIENT' && row.patient_user_id === user.id;
    const isOwnerDoctor = user.role === 'DOCTOR' && row.doctor_user_id === user.id;
    const isAdmin = user.role === 'ADMIN';

    if (!isOwnerPatient && !isOwnerDoctor && !isAdmin) {
      throw new ServiceError(
        'Akses ditolak: Anda tidak berhak mengakses dokumen rekam medis ini.',
        403
      );
    }

    const [addendaRes, prescRes] = await Promise.all([
      query(
        `SELECT mra.*, d.full_name AS doctor_name
         FROM medical_record_addenda mra
         JOIN doctors d ON mra.doctor_id = d.id
         WHERE mra.medical_record_id = $1
         ORDER BY mra.created_at ASC`,
        [row.id]
      ),
      query(
        `SELECT
           pr.id,
           pr.status,
           pr.notes,
           pr.ready_at,
           pr.picked_up_at,
           pr.created_at,
           COALESCE(
             json_agg(
               json_build_object(
                 'id', pi.id,
                 'medicine_id', pi.medicine_id,
                 'medicine_name', m.name,
                 'medicine_code', m.code,
                 'form', m.form,
                 'unit', m.unit,
                 'quantity', pi.quantity,
                 'dosage_rule', pi.dosage_rule,
                 'duration_days', pi.duration_days
               )
               ORDER BY pi.created_at ASC
             ) FILTER (WHERE pi.id IS NOT NULL),
             '[]'::json
           ) AS items
         FROM prescriptions pr
         LEFT JOIN prescription_items pi ON pr.id = pi.prescription_id
         LEFT JOIN medicines m ON pi.medicine_id = m.id
         WHERE pr.medical_record_id = $1
         GROUP BY pr.id
         ORDER BY pr.created_at DESC
         LIMIT 1`,
        [row.id]
      ),
    ]);

    const fullDocument = normalizeRecordForDocument({
      ...row,
      addenda: addendaRes.rows || [],
      prescription: prescRes.rows[0] || null,
    });

    return {
      success: true,
      data: fullDocument,
    };
  } catch (err) {
    return toServiceErrorResult('getMedicalRecordDocument', err);
  }
}
