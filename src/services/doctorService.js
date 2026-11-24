import { query, withTransaction } from '@/lib/db';
import { getCurrentUser, createSession } from '@/lib/auth';
import { scheduleSchema, doctorProfileUpdateSchema } from '@/lib/validators';
import { ServiceError, toServiceErrorResult } from '@/lib/serviceErrors';
import { ensurePharmacySchema } from '@/lib/pharmacySchema';
import { buildPrescriptionInvoiceNumber } from '@/lib/currency';
import { transitionAppointmentStatus } from '@/services/appointmentStatusService';

let doctorColumnsPromise = null;

async function ensureDoctorColumns() {
  if (!doctorColumnsPromise) {
    doctorColumnsPromise = query(`
      ALTER TABLE doctors ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
    `).catch((err) => {
      doctorColumnsPromise = null;
      throw err;
    });
  }
  return doctorColumnsPromise;
}

async function requireDoctor() {
  const user = await getCurrentUser();
  if (!user) {
    throw new ServiceError('Sesi tidak ditemukan. Silakan masuk terlebih dahulu.', 401);
  }
  if (user.role !== 'DOCTOR') {
    throw new ServiceError(
      'Akses ditolak: Hanya dokter yang diizinkan mengakses fitur ini.',
      403
    );
  }

  const res = await query(
    'SELECT * FROM doctors WHERE user_id = $1 AND is_active = true',
    [user.id]
  );

  if (res.rows.length === 0) {
    throw new ServiceError(
      'Data profil dokter tidak ditemukan atau status akun nonaktif.',
      404
    );
  }

  return { user, doctor: res.rows[0] };
}

function normalizeInput(input) {
  if (typeof FormData !== 'undefined' && input instanceof FormData) {
    return Object.fromEntries(input.entries());
  }
  return input || {};
}

export async function getDoctorProfile() {
  try {
    await ensureDoctorColumns();
    const { doctor } = await requireDoctor();

    const res = await query(
      `SELECT 
         d.*,
         p.name AS poli_name,
         p.description AS poli_description,
         u.email
       FROM doctors d
       LEFT JOIN polis p ON d.poli_id = p.id
       JOIN users u ON d.user_id = u.id
       WHERE d.id = $1`,
      [doctor.id]
    );

    return {
      success: true,
      data: res.rows[0] || null,
    };
  } catch (err) {
    return toServiceErrorResult('getDoctorProfile', err);
  }
}

export async function updateDoctorProfile(input) {
  try {
    await ensureDoctorColumns();
    const { user, doctor } = await requireDoctor();
    const raw = normalizeInput(input);

    const validation = doctorProfileUpdateSchema.safeParse({
      full_name: raw.full_name,
      str_number: raw.str_number,
      phone: raw.phone?.trim() || '',
      bio: raw.bio?.trim() || '',
      photo_url: raw.photo_url?.trim() || '',
    });

    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || 'Data profil dokter tidak valid.',
        status: 400,
      };
    }

    const d = validation.data;

    await query(
      `UPDATE doctors
       SET full_name = $1,
           str_number = $2,
           phone = $3,
           bio = $4,
           photo_url = $5,
           updated_at = NOW()
       WHERE id = $6`,
      [
        d.full_name.trim(),
        d.str_number.trim(),
        d.phone ? d.phone.trim() : null,
        d.bio ? d.bio.trim() : null,
        d.photo_url ? d.photo_url.trim() : null,
        doctor.id,
      ]
    );

    const refreshed = await query(
      `SELECT d.*, p.name AS poli_name, p.description AS poli_description, u.email
       FROM doctors d
       LEFT JOIN polis p ON d.poli_id = p.id
       JOIN users u ON d.user_id = u.id
       WHERE d.id = $1`,
      [doctor.id]
    );
    const updated = refreshed.rows[0];

    await query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
       VALUES ($1, 'UPDATE_DOCTOR_PROFILE', 'doctors', $2, $3)`,
      [
        user.id,
        doctor.id,
        JSON.stringify({
          full_name: updated.full_name,
          str_number: updated.str_number,
        }),
      ]
    );

    if (updated.full_name !== user.name) {
      await createSession({
        id: user.id,
        email: user.email,
        role: user.role,
        name: updated.full_name,
        patientId: user.patientId || null,
        doctorId: user.doctorId || doctor.id,
      }).catch(() => {});
    }

    return {
      success: true,
      data: updated,
    };
  } catch (err) {
    if (err.code === '23505') {
      return { success: false, error: 'Nomor STR sudah terdaftar pada dokter lain.', status: 409 };
    }
    return toServiceErrorResult('updateDoctorProfile', err);
  }
}

export async function getMySchedules() {
  try {
    const { doctor } = await requireDoctor();

    const res = await query(
      `SELECT * FROM doctor_schedules 
       WHERE doctor_id = $1 AND is_active = true 
       ORDER BY day_of_week ASC, start_time ASC`,
      [doctor.id]
    );

    return {
      success: true,
      data: res.rows,
    };
  } catch (err) {
    return toServiceErrorResult('getMySchedules', err);
  }
}

export async function createSchedule(input) {
  try {
    const { doctor } = await requireDoctor();
    const raw = normalizeInput(input);

    const parsedRaw = {
      ...raw,
      doctor_id: doctor.id,
      day_of_week: Number(raw.day_of_week),
      slot_minutes: raw.slot_minutes !== undefined ? Number(raw.slot_minutes) : 15,
    };

    const validation = scheduleSchema.safeParse(parsedRaw);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || 'Data jadwal tidak valid.',
        status: 400,
      };
    }

    const { day_of_week, start_time, end_time, slot_minutes } = validation.data;

    if (start_time >= end_time) {
      return {
        success: false,
        error: 'Jam mulai harus lebih awal dari jam selesai.',
        status: 400,
      };
    }

    const res = await query(
      `INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_minutes, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING *`,
      [doctor.id, day_of_week, start_time, end_time, slot_minutes || 15]
    );

    return {
      success: true,
      data: res.rows[0],
    };
  } catch (err) {
    return toServiceErrorResult('createSchedule', err);
  }
}

export async function updateSchedule(id, input) {
  try {
    const { doctor } = await requireDoctor();
    const raw = normalizeInput(input);

    const parsedRaw = {
      ...raw,
      doctor_id: doctor.id,
      day_of_week: Number(raw.day_of_week),
      slot_minutes: raw.slot_minutes !== undefined ? Number(raw.slot_minutes) : 15,
    };

    const validation = scheduleSchema.safeParse(parsedRaw);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || 'Data jadwal tidak valid.',
        status: 400,
      };
    }

    const { day_of_week, start_time, end_time, slot_minutes } = validation.data;

    if (start_time >= end_time) {
      return {
        success: false,
        error: 'Jam mulai harus lebih awal dari jam selesai.',
        status: 400,
      };
    }

    const res = await query(
      `UPDATE doctor_schedules
       SET day_of_week = $1, start_time = $2, end_time = $3, slot_minutes = $4, updated_at = NOW()
       WHERE id = $5 AND doctor_id = $6
       RETURNING *`,
      [day_of_week, start_time, end_time, slot_minutes || 15, id, doctor.id]
    );

    if (res.rows.length === 0) {
      return {
        success: false,
        error: 'Jadwal tidak ditemukan atau tidak memiliki akses.',
        status: 404,
      };
    }

    return {
      success: true,
      data: res.rows[0],
    };
  } catch (err) {
    return toServiceErrorResult('updateSchedule', err);
  }
}

export async function deleteSchedule(id) {
  try {
    const { doctor } = await requireDoctor();

    const res = await query(
      `UPDATE doctor_schedules
       SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND doctor_id = $2
       RETURNING *`,
      [id, doctor.id]
    );

    if (res.rows.length === 0) {
      return {
        success: false,
        error: 'Jadwal tidak ditemukan atau tidak memiliki akses.',
        status: 404,
      };
    }

    return {
      success: true,
      data: res.rows[0],
    };
  } catch (err) {
    return toServiceErrorResult('deleteSchedule', err);
  }
}

export async function getTodaysAppointments() {
  try {
    const { doctor } = await requireDoctor();

    const res = await query(
      `SELECT 
         a.*,
         p.full_name AS patient_name,
         p.medical_record_no,
         p.birth_date,
         p.gender,
         p.blood_type,
         p.phone AS patient_phone,
         p.allergies
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       WHERE a.doctor_id = $1 
         AND a.appointment_date = CURRENT_DATE 
         AND a.status IN ('PENDING', 'CONFIRMED')
       ORDER BY a.queue_no ASC NULLS LAST, a.slot_start ASC`,
      [doctor.id]
    );

    return {
      success: true,
      data: res.rows,
    };
  } catch (err) {
    return toServiceErrorResult('getTodaysAppointments', err);
  }
}

export async function getMyExaminations() {
  try {
    const { doctor } = await requireDoctor();
    const res = await query(
      `SELECT
         mr.id,
         mr.appointment_id,
         mr.diagnosis,
         mr.icd10_code,
         mr.created_at,
         p.full_name AS patient_name,
         p.medical_record_no,
         a.appointment_date,
         a.slot_start
       FROM medical_records mr
       JOIN appointments a ON a.id = mr.appointment_id
       JOIN patients p ON p.id = mr.patient_id
       WHERE mr.doctor_id = $1
       ORDER BY mr.created_at DESC`,
      [doctor.id]
    );

    return { success: true, data: res.rows };
  } catch (err) {
    return toServiceErrorResult('getMyExaminations', err);
  }
}

export async function getPendingAppointments() {
  try {
    const { doctor } = await requireDoctor();

    const res = await query(
      `SELECT 
         a.*,
         p.full_name AS patient_name,
         p.birth_date,
         p.medical_record_no,
         p.gender,
         p.blood_type,
         p.phone AS patient_phone,
         p.allergies
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       WHERE a.doctor_id = $1 AND a.status = 'PENDING'
       ORDER BY a.appointment_date ASC, a.slot_start ASC, a.created_at ASC`,
      [doctor.id]
    );

    return {
      success: true,
      data: res.rows,
    };
  } catch (err) {
    return toServiceErrorResult('getPendingAppointments', err);
  }
}

export async function getDoctorAppointments(statusFilter = '') {
  try {
    const { doctor } = await requireDoctor();

    const params = [doctor.id];
    let statusClause = '';
    if (statusFilter) {
      statusClause = ' AND a.status = $2';
      params.push(statusFilter);
    }

    const res = await query(
      `SELECT 
         a.*,
         p.full_name AS patient_name,
         p.birth_date,
         p.medical_record_no,
         p.gender,
         p.blood_type,
         p.phone AS patient_phone,
         p.allergies
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       WHERE a.doctor_id = $1${statusClause}
       ORDER BY a.appointment_date DESC, a.slot_start ASC, a.created_at DESC`,
      params
    );

    return {
      success: true,
      data: res.rows,
    };
  } catch (err) {
    return toServiceErrorResult('getDoctorAppointments', err);
  }
}

export async function confirmAppointment(appointmentId) {
  try {
    const { user, doctor } = await requireDoctor();

    const result = await transitionAppointmentStatus({
      appointmentId,
      actorUser: user,
      doctorScopeId: doctor.id,
      actorLabel: doctor.full_name,
      targetStatus: 'CONFIRMED',
    });

    return {
      success: true,
      data: result,
    };
  } catch (err) {
    return toServiceErrorResult('confirmAppointment', err);
  }
}

export async function rejectAppointment(appointmentId, reason) {
  try {
    const { user, doctor } = await requireDoctor();

    const result = await transitionAppointmentStatus({
      appointmentId,
      actorUser: user,
      doctorScopeId: doctor.id,
      actorLabel: doctor.full_name,
      targetStatus: 'REJECTED',
      reason,
    });

    return {
      success: true,
      data: result,
    };
  } catch (err) {
    return toServiceErrorResult('rejectAppointment', err);
  }
}

export async function updateAppointmentStatusByDoctor(appointmentId, targetStatus, reason = '') {
  try {
    const { user, doctor } = await requireDoctor();

    const result = await transitionAppointmentStatus({
      appointmentId,
      actorUser: user,
      doctorScopeId: doctor.id,
      actorLabel: doctor.full_name,
      targetStatus,
      reason,
    });

    return {
      success: true,
      data: result,
    };
  } catch (err) {
    return toServiceErrorResult('updateAppointmentStatusByDoctor', err);
  }
}

export async function getAppointmentWithPatient(appointmentId) {
  try {
    await ensurePharmacySchema();
    const { doctor } = await requireDoctor();

    const apptRes = await query(
      `SELECT 
         a.*,
         p.id AS patient_id,
         p.user_id AS patient_user_id,
         p.full_name AS patient_name,
         p.medical_record_no,
         p.nik,
         p.birth_date,
         p.gender,
         p.blood_type,
         p.phone AS patient_phone,
         p.address AS patient_address,
         p.emergency_contact,
         p.allergies,
         d.full_name AS doctor_name,
         d.str_number AS doctor_str_number,
         pol.name AS poli_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN doctors d ON a.doctor_id = d.id
       LEFT JOIN polis pol ON d.poli_id = pol.id
       WHERE a.id = $1 AND a.doctor_id = $2`,
      [appointmentId, doctor.id]
    );

    if (apptRes.rows.length === 0) {
      return {
        success: false,
        error: 'Janji temu tidak ditemukan atau Anda tidak memiliki akses.',
        status: 404,
      };
    }

    const appt = apptRes.rows[0];

    const medRecRes = await query(
      `SELECT * FROM medical_records WHERE appointment_id = $1`,
      [appointmentId]
    );

    const medicalRecord = medRecRes.rows[0] || null;
    let addenda = [];
    let prescription = null;

    if (medicalRecord) {
      const addendaRes = await query(
        `SELECT mra.*, d.full_name AS doctor_name
         FROM medical_record_addenda mra
         JOIN doctors d ON mra.doctor_id = d.id
         WHERE mra.medical_record_id = $1
         ORDER BY mra.created_at ASC`,
        [medicalRecord.id]
      );
      addenda = addendaRes.rows;

      const prescRes = await query(
        `SELECT 
           pr.*,
           pp.invoice_number,
           COALESCE(pp.status, 'UNPAID') AS payment_status,
           COALESCE(
             pp.total_amount,
             SUM(pi.quantity * COALESCE(pi.unit_price, m.price, 0)),
             0
           )::numeric AS total_amount,
           COALESCE(
             json_agg(
               json_build_object(
                 'id', pi.id,
                 'medicine_id', pi.medicine_id,
                 'medicine_name', m.name,
                 'medicine_code', m.code,
                 'quantity', pi.quantity,
                 'unit_price', COALESCE(pi.unit_price, m.price, 0),
                 'subtotal', (pi.quantity * COALESCE(pi.unit_price, m.price, 0)),
                 'dosage_rule', pi.dosage_rule,
                 'duration_days', pi.duration_days,
                 'unit', m.unit
               )
             ) FILTER (WHERE pi.id IS NOT NULL),
             '[]'::json
           ) AS items
         FROM prescriptions pr
         LEFT JOIN prescription_payments pp ON pr.id = pp.prescription_id
         LEFT JOIN prescription_items pi ON pr.id = pi.prescription_id
         LEFT JOIN medicines m ON pi.medicine_id = m.id
         WHERE pr.medical_record_id = $1
         GROUP BY pr.id, pp.id`,
        [medicalRecord.id]
      );
      prescription = prescRes.rows[0] || null;
    }

    return {
      success: true,
      data: {
        ...appt,
        medical_record: medicalRecord,
        addenda,
        prescription,
      },
    };
  } catch (err) {
    return toServiceErrorResult('getAppointmentWithPatient', err);
  }
}

export async function saveMedicalRecord(appointmentId, recordData, prescriptionItems = []) {
  try {
    await ensurePharmacySchema();
    const { user, doctor } = await requireDoctor();

    if (!recordData?.diagnosis || !recordData.diagnosis.trim()) {
      return { success: false, error: 'Diagnosis wajib diisi.', status: 400 };
    }

    const result = await withTransaction(async (client) => {
      const apptRes = await client.query(
        `SELECT a.*, p.user_id AS patient_user_id
         FROM appointments a
         JOIN patients p ON a.patient_id = p.id
         WHERE a.id = $1 AND a.doctor_id = $2
         FOR UPDATE`,
        [appointmentId, doctor.id]
      );

      if (apptRes.rows.length === 0) {
        throw new ServiceError('Janji temu tidak ditemukan atau bukan milik Anda.', 404);
      }

      const appt = apptRes.rows[0];

      if (appt.status !== 'CONFIRMED') {
        throw new ServiceError(
          `Rekam medis hanya dapat dibuat untuk janji temu dengan status DIKONFIRMASI. Status saat ini: ${appt.status}`,
          400
        );
      }

      const existingRecord = await client.query(
        'SELECT id FROM medical_records WHERE appointment_id = $1',
        [appointmentId]
      );

      if (existingRecord.rows.length > 0) {
        throw new ServiceError(
          'Rekam medis untuk janji temu ini sudah pernah disimpan dan bersifat permanen. Gunakan fitur Addendum untuk catatan tambahan.',
          409
        );
      }

      const vitalSigns = recordData.vital_signs
        ? typeof recordData.vital_signs === 'string'
          ? recordData.vital_signs
          : JSON.stringify(recordData.vital_signs)
        : null;

      const medRecRes = await client.query(
        `INSERT INTO medical_records (
           appointment_id, patient_id, doctor_id, complaint,
           vital_signs, diagnosis, icd10_code, treatment, notes, locked_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
         RETURNING id`,
        [
          appt.id,
          appt.patient_id,
          doctor.id,
          recordData.complaint?.trim() || appt.complaint,
          vitalSigns,
          recordData.diagnosis.trim(),
          recordData.icd10_code?.trim() || null,
          recordData.treatment?.trim() || null,
          recordData.notes?.trim() || null,
        ]
      );
      const newMedicalRecord = medRecRes.rows[0];

      let prescriptionId = null;

      if (Array.isArray(prescriptionItems) && prescriptionItems.length > 0) {
        const prescRes = await client.query(
          `INSERT INTO prescriptions (medical_record_id, status)
           VALUES ($1, 'WAITING')
           RETURNING id, created_at`,
          [newMedicalRecord.id]
        );
        prescriptionId = prescRes.rows[0].id;

        let totalPrescriptionAmount = 0;

        for (const item of prescriptionItems) {
          if (!item.medicine_id || !item.quantity || Number(item.quantity) <= 0 || !item.dosage_rule) {
            throw new ServiceError(
              'Item resep tidak lengkap. Pastikan obat, jumlah, dan aturan pakai terisi dengan benar.',
              400
            );
          }

          const medLookup = await client.query(
            'SELECT id, name, COALESCE(price, 0)::numeric AS price, is_active FROM medicines WHERE id = $1',
            [item.medicine_id]
          );

          if (medLookup.rows.length === 0 || !medLookup.rows[0].is_active) {
            throw new ServiceError('Salah satu obat yang diresepkan tidak tersedia atau tidak aktif.', 400);
          }

          const qty = Number(item.quantity);
          const unitPrice = Number(medLookup.rows[0].price) || 0;
          totalPrescriptionAmount += qty * unitPrice;

          await client.query(
            `INSERT INTO prescription_items (prescription_id, medicine_id, quantity, unit_price, dosage_rule, duration_days)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              prescriptionId,
              item.medicine_id,
              qty,
              unitPrice,
              item.dosage_rule.trim(),
              item.duration_days ? Number(item.duration_days) : null,
            ]
          );
        }

        const invoiceNumber = buildPrescriptionInvoiceNumber(prescriptionId, prescRes.rows[0].created_at);
        await client.query(
          `INSERT INTO prescription_payments (
             prescription_id, patient_id, invoice_number, total_amount, payment_method, status
           )
           VALUES ($1, $2, $3, $4, 'TRANSFER', 'UNPAID')`,
          [prescriptionId, appt.patient_id, invoiceNumber, totalPrescriptionAmount]
        );
      }

      await client.query(
        `UPDATE appointments
         SET status = 'COMPLETED', updated_at = NOW()
         WHERE id = $1`,
        [appt.id]
      );

      await client.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, $2, $3, 'MEDICAL_RECORD')`,
        [
          appt.patient_user_id,
          'Pemeriksaan Selesai',
          `Pemeriksaan oleh dr. ${doctor.full_name} telah selesai. Hasil diagnosis dan resep obat dapat Anda lihat di aplikasi MedFlow.`,
        ]
      );

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
         VALUES ($1, 'SAVE_MEDICAL_RECORD', 'medical_records', $2, $3)`,
        [
          user.id,
          newMedicalRecord.id,
          JSON.stringify({
            appointment_id: appt.id,
            diagnosis: recordData.diagnosis.trim(),
            has_prescription: !!prescriptionId,
          }),
        ]
      );

      return {
        recordId: newMedicalRecord.id,
        prescriptionId,
      };
    });

    return {
      success: true,
      data: result,
      recordId: result.recordId,
    };
  } catch (err) {
    return toServiceErrorResult('saveMedicalRecord', err);
  }
}

export async function addAddendum(medicalRecordId, note) {
  try {
    const { user, doctor } = await requireDoctor();

    if (!note || !note.trim()) {
      return { success: false, error: 'Catatan addendum wajib diisi.', status: 400 };
    }

    const medRecRes = await query(
      'SELECT id, appointment_id FROM medical_records WHERE id = $1',
      [medicalRecordId]
    );

    if (medRecRes.rows.length === 0) {
      return { success: false, error: 'Rekam medis tidak ditemukan.', status: 404 };
    }

    const res = await query(
      `INSERT INTO medical_record_addenda (medical_record_id, doctor_id, note)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [medicalRecordId, doctor.id, note.trim()]
    );

    const newAddendum = res.rows[0];

    await query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
       VALUES ($1, 'ADD_ADDENDUM', 'medical_record_addenda', $2, $3)`,
      [user.id, newAddendum.id, JSON.stringify({ medical_record_id: medicalRecordId })]
    );

    return {
      success: true,
      data: newAddendum,
    };
  } catch (err) {
    return toServiceErrorResult('addAddendum', err);
  }
}
