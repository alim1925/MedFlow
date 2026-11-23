import { query, withTransaction } from '@/lib/db';
import { getCurrentUser, createSession } from '@/lib/auth';
import { bookingSchema, feedbackSchema, patientProfileUpdateSchema } from '@/lib/validators';
import { ServiceError, toServiceErrorResult } from '@/lib/serviceErrors';

/**
 * Helper to ensure user is logged in as PATIENT and fetch patient record.
 * @returns {Promise<{user: Object, patient: Object}>}
 */
async function requirePatient() {
  const user = await getCurrentUser();
  if (!user) {
    throw new ServiceError('Sesi tidak ditemukan. Silakan masuk terlebih dahulu.', 401);
  }
  if (user.role !== 'PATIENT') {
    throw new ServiceError(
      'Akses ditolak: Hanya pasien terdaftar yang diizinkan melakukan tindakan ini.',
      403
    );
  }

  const res = await query('SELECT * FROM patients WHERE user_id = $1', [user.id]);

  if (res.rows.length === 0) {
    throw new ServiceError('Data profil pasien tidak ditemukan.', 404);
  }

  return { user, patient: res.rows[0] };
}

function normalizeInput(input) {
  if (typeof FormData !== 'undefined' && input instanceof FormData) {
    return Object.fromEntries(input.entries());
  }
  return input || {};
}

export async function getPatientProfile() {
  try {
    const { patient } = await requirePatient();
    return {
      success: true,
      data: patient,
    };
  } catch (err) {
    return toServiceErrorResult('getPatientProfile', err);
  }
}

export async function updatePatientProfile(input) {
  try {
    const { user, patient } = await requirePatient();
    const raw = normalizeInput(input);

    const validation = patientProfileUpdateSchema.safeParse({
      full_name: raw.full_name,
      nik: raw.nik?.trim() || '',
      birth_date: raw.birth_date,
      gender: raw.gender,
      blood_type: raw.blood_type?.trim() || '',
      phone: raw.phone?.trim() || '',
      address: raw.address?.trim() || '',
      emergency_contact: raw.emergency_contact?.trim() || '',
      allergies: raw.allergies?.trim() || '',
    });

    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || 'Data profil pasien tidak valid.',
        status: 400,
      };
    }

    const d = validation.data;

    const res = await query(
      `UPDATE patients
       SET full_name = $1,
           nik = $2,
           birth_date = $3,
           gender = $4,
           blood_type = $5,
           phone = $6,
           address = $7,
           emergency_contact = $8,
           allergies = $9,
           updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        d.full_name.trim(),
        d.nik ? d.nik.trim() : null,
        d.birth_date,
        d.gender,
        d.blood_type ? d.blood_type.trim() : null,
        d.phone ? d.phone.trim() : null,
        d.address ? d.address.trim() : null,
        d.emergency_contact ? d.emergency_contact.trim() : null,
        d.allergies ? d.allergies.trim() : null,
        patient.id,
      ]
    );

    const updated = res.rows[0];

    await query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
       VALUES ($1, 'UPDATE_PATIENT_PROFILE', 'patients', $2, $3)`,
      [
        user.id,
        patient.id,
        JSON.stringify({
          full_name: updated.full_name,
          phone: updated.phone,
        }),
      ]
    );

    if (updated.full_name !== user.name) {
      await createSession({
        id: user.id,
        email: user.email,
        role: user.role,
        name: updated.full_name,
        patientId: user.patientId || patient.id,
        doctorId: user.doctorId || null,
      }).catch(() => {});
    }

    return {
      success: true,
      data: updated,
    };
  } catch (err) {
    if (err.code === '23505') {
      return { success: false, error: 'NIK sudah terdaftar pada akun pasien lain.', status: 409 };
    }
    return toServiceErrorResult('updatePatientProfile', err);
  }
}

export async function getPublicPolis() {
  try {
    const res = await query(
      'SELECT id, name, description, icon, is_active FROM polis WHERE is_active = true ORDER BY name ASC'
    );
    return {
      success: true,
      data: res.rows,
    };
  } catch (err) {
    return { ...toServiceErrorResult('getPublicPolis', err), data: [] };
  }
}

export async function getPublicDoctors(poliId = null) {
  try {
    let sql = `
      SELECT 
        d.id,
        d.user_id,
        d.poli_id,
        d.full_name,
        d.str_number,
        d.bio,
        d.photo_url,
        d.is_active,
        p.name AS poli_name,
        p.icon AS poli_icon
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN polis p ON d.poli_id = p.id
      WHERE d.is_active = true AND u.is_active = true
    `;

    const params = [];
    if (poliId) {
      sql += ' AND d.poli_id = $1';
      params.push(poliId);
    }

    sql += ' ORDER BY d.full_name ASC';

    const doctorsRes = await query(sql, params);
    const doctors = doctorsRes.rows;

    if (doctors.length === 0) {
      return { success: true, data: [] };
    }

    const doctorIds = doctors.map((d) => d.id);
    const schedulesRes = await query(
      `SELECT * FROM doctor_schedules 
       WHERE doctor_id = ANY($1) AND is_active = true 
       ORDER BY day_of_week ASC, start_time ASC`,
      [doctorIds]
    );

    const schedulesByDoctor = {};
    for (const sch of schedulesRes.rows) {
      if (!schedulesByDoctor[sch.doctor_id]) {
        schedulesByDoctor[sch.doctor_id] = [];
      }
      schedulesByDoctor[sch.doctor_id].push(sch);
    }

    const doctorsWithSchedules = doctors.map((doc) => ({
      ...doc,
      schedules: schedulesByDoctor[doc.id] || [],
    }));

    return {
      success: true,
      data: doctorsWithSchedules,
    };
  } catch (err) {
    return { ...toServiceErrorResult('getPublicDoctors', err), data: [] };
  }
}

export async function getAvailableSlots(doctorId, dateStr) {
  try {
    if (!doctorId || !dateStr) {
      return { success: false, data: [], error: 'Dokter dan tanggal wajib dipilih.', status: 400 };
    }

    const targetDate = new Date(`${dateStr}T00:00:00`);
    if (isNaN(targetDate.getTime())) {
      return { success: false, data: [], error: 'Format tanggal tidak valid.', status: 400 };
    }

    const dayOfWeek = targetDate.getDay();

    const schedRes = await query(
      `SELECT * FROM doctor_schedules 
       WHERE doctor_id = $1 AND day_of_week = $2 AND is_active = true 
       ORDER BY start_time ASC`,
      [doctorId, dayOfWeek]
    );

    if (schedRes.rows.length === 0) {
      return { success: true, data: [] };
    }

    const bookedRes = await query(
      `SELECT slot_start 
       FROM appointments 
       WHERE doctor_id = $1 
         AND appointment_date = $2 
         AND status IN ('PENDING', 'CONFIRMED')`,
      [doctorId, dateStr]
    );

    const bookedSlotsSet = new Set(
      bookedRes.rows.map((r) => r.slot_start.slice(0, 5))
    );

    const allSlots = [];

    for (const schedule of schedRes.rows) {
      const [startHour, startMin] = schedule.start_time.split(':').map(Number);
      const [endHour, endMin] = schedule.end_time.split(':').map(Number);
      const slotMinutes = schedule.slot_minutes || 15;

      const startTotal = startHour * 60 + startMin;
      const endTotal = endHour * 60 + endMin;

      for (let time = startTotal; time + slotMinutes <= endTotal; time += slotMinutes) {
        const h = Math.floor(time / 60);
        const m = time % 60;
        const timeFormatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

        allSlots.push({
          slot_start: timeFormatted,
          schedule_id: schedule.id,
          available: !bookedSlotsSet.has(timeFormatted),
        });
      }
    }

    return {
      success: true,
      data: allSlots,
    };
  } catch (err) {
    return { ...toServiceErrorResult('getAvailableSlots', err), data: [] };
  }
}

export async function bookAppointment(input) {
  try {
    const { user, patient } = await requirePatient();
    const raw = normalizeInput(input);

    let slotStart = raw.slot_start;
    if (slotStart && slotStart.length === 5) {
      slotStart += ':00';
    }

    const payloadToValidate = {
      ...raw,
      slot_start: slotStart,
    };

    const validation = bookingSchema.safeParse(payloadToValidate);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || 'Data pendaftaran janji temu tidak valid.',
        status: 400,
      };
    }

    const { doctor_id, schedule_id, appointment_date, complaint } = validation.data;

    const result = await withTransaction(async (client) => {
      const apptRes = await client.query(
        `INSERT INTO appointments (
           patient_id, doctor_id, schedule_id, appointment_date,
           slot_start, complaint, status
         )
         VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
         RETURNING *`,
        [
          patient.id,
          doctor_id,
          schedule_id || null,
          appointment_date,
          slotStart,
          complaint.trim(),
        ]
      );
      const newAppt = apptRes.rows[0];

      const docRes = await client.query(
        'SELECT user_id, full_name FROM doctors WHERE id = $1',
        [doctor_id]
      );
      const doc = docRes.rows[0];

      if (doc?.user_id) {
        await client.query(
          `INSERT INTO notifications (user_id, title, message, type)
           VALUES ($1, $2, $3, 'APPOINTMENT')`,
          [
            doc.user_id,
            'Permohonan Janji Temu Baru',
            `Pasien ${patient.full_name} mengajukan janji temu pada ${appointment_date} pukul ${slotStart.slice(0, 5)} WIB.`,
          ]
        );
      }

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
         VALUES ($1, 'BOOK_APPOINTMENT', 'appointments', $2, $3)`,
        [
          user.id,
          newAppt.id,
          JSON.stringify({
            doctor_id,
            appointment_date,
            slot_start: slotStart,
            patient_name: patient.full_name,
          }),
        ]
      );

      return newAppt;
    });

    return {
      success: true,
      appointmentId: result.id,
      data: result,
    };
  } catch (err) {
    if (err.code === '23505') {
      return {
        success: false,
        error: 'Slot waktu ini baru saja dipilih pasien lain. Silakan pilih slot lain.',
        status: 409,
      };
    }
    return toServiceErrorResult(
      'bookAppointment',
      err,
      'Gagal membuat janji temu. Silakan coba kembali.'
    );
  }
}

export async function getMyAppointments() {
  try {
    const { patient } = await requirePatient();

    const res = await query(
      `SELECT 
         a.*,
         d.full_name AS doctor_name,
         d.photo_url AS doctor_photo,
         pol.name AS poli_name,
         pol.icon AS poli_icon,
         f.id AS feedback_id,
         f.rating AS feedback_rating,
         f.comment AS feedback_comment
       FROM appointments a
       JOIN doctors d ON a.doctor_id = d.id
       JOIN polis pol ON d.poli_id = pol.id
       LEFT JOIN feedbacks f ON a.id = f.appointment_id
       WHERE a.patient_id = $1
       ORDER BY a.appointment_date DESC, a.slot_start DESC`,
      [patient.id]
    );

    return {
      success: true,
      data: res.rows,
    };
  } catch (err) {
    return toServiceErrorResult('getMyAppointments', err);
  }
}

export async function getDashboardData() {
  try {
    const { user, patient } = await requirePatient();

    const nextApptRes = await query(
      `SELECT 
         a.*,
         d.full_name AS doctor_name,
         pol.name AS poli_name,
         pol.icon AS poli_icon
       FROM appointments a
       JOIN doctors d ON a.doctor_id = d.id
       JOIN polis pol ON d.poli_id = pol.id
       WHERE a.patient_id = $1 
         AND a.appointment_date >= CURRENT_DATE 
         AND a.status IN ('PENDING', 'CONFIRMED')
       ORDER BY a.appointment_date ASC, a.slot_start ASC
       LIMIT 1`,
      [patient.id]
    );

    const latestPrescRes = await query(
      `SELECT 
         pr.id,
         pr.status,
         pr.ready_at,
         pr.picked_up_at,
         pr.created_at,
         mr.diagnosis,
         d.full_name AS doctor_name,
         COALESCE(
           json_agg(
             json_build_object(
               'id', pi.id,
               'medicine_name', m.name,
               'quantity', pi.quantity,
               'dosage_rule', pi.dosage_rule,
               'unit', m.unit
             )
           ) FILTER (WHERE pi.id IS NOT NULL),
           '[]'::json
         ) AS items
       FROM prescriptions pr
       JOIN medical_records mr ON pr.medical_record_id = mr.id
       JOIN doctors d ON mr.doctor_id = d.id
       LEFT JOIN prescription_items pi ON pr.id = pi.prescription_id
       LEFT JOIN medicines m ON pi.medicine_id = m.id
       WHERE mr.patient_id = $1
       GROUP BY pr.id, mr.diagnosis, d.full_name
       ORDER BY pr.created_at DESC
       LIMIT 1`,
      [patient.id]
    );

    const [notifsRes, unreadCountRes] = await Promise.all([
      query(
        `SELECT * FROM notifications 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT 5`,
        [user.id]
      ),
      query(
        `SELECT COUNT(*)::int AS count FROM notifications 
         WHERE user_id = $1 AND is_read = false`,
        [user.id]
      ),
    ]);

    const statsRes = await query(
      `SELECT 
         COUNT(*)::int AS total_appointments,
         COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed_appointments,
         COUNT(*) FILTER (WHERE status IN ('PENDING', 'CONFIRMED'))::int AS active_appointments
       FROM appointments
       WHERE patient_id = $1`,
      [patient.id]
    );

    return {
      success: true,
      data: {
        patient,
        nextAppointment: nextApptRes.rows[0] || null,
        latestPrescription: latestPrescRes.rows[0] || null,
        notifications: notifsRes.rows || [],
        unreadNotificationCount: unreadCountRes.rows[0]?.count || 0,
        stats: statsRes.rows[0] || {
          total_appointments: 0,
          completed_appointments: 0,
          active_appointments: 0,
        },
      },
    };
  } catch (err) {
    return toServiceErrorResult('getDashboardData', err);
  }
}

export async function cancelAppointment(appointmentId) {
  try {
    const { user, patient } = await requirePatient();

    const res = await query(
      `UPDATE appointments
       SET status = 'CANCELLED', updated_at = NOW()
       WHERE id = $1 
         AND patient_id = $2 
         AND status IN ('PENDING', 'CONFIRMED')
       RETURNING *`,
      [appointmentId, patient.id]
    );

    if (res.rows.length === 0) {
      return {
        success: false,
        error: 'Janji temu tidak ditemukan atau sudah tidak dapat dibatalkan.',
        status: 404,
      };
    }

    const cancelledAppt = res.rows[0];

    await query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
       VALUES ($1, 'CANCEL_APPOINTMENT', 'appointments', $2, $3)`,
      [user.id, cancelledAppt.id, JSON.stringify({ appointment_id: cancelledAppt.id })]
    );

    return {
      success: true,
      data: cancelledAppt,
    };
  } catch (err) {
    return toServiceErrorResult('cancelAppointment', err);
  }
}

export async function getMyMedicalRecords() {
  try {
    const { patient } = await requirePatient();

    const recordsRes = await query(
      `SELECT 
         mr.*,
         d.full_name AS doctor_name,
         d.str_number AS doctor_str_number,
         pol.name AS poli_name,
         a.appointment_date,
         a.slot_start,
         a.queue_no
       FROM medical_records mr
       JOIN doctors d ON mr.doctor_id = d.id
       JOIN polis pol ON d.poli_id = pol.id
       JOIN appointments a ON mr.appointment_id = a.id
       WHERE mr.patient_id = $1
       ORDER BY mr.created_at DESC`,
      [patient.id]
    );

    const records = recordsRes.rows;

    if (records.length === 0) {
      return { success: true, data: [] };
    }

    const recordIds = records.map((r) => r.id);
    const [addendaRes, prescRes] = await Promise.all([
      query(
        `SELECT mra.*, d.full_name AS doctor_name
         FROM medical_record_addenda mra
         JOIN doctors d ON mra.doctor_id = d.id
         WHERE mra.medical_record_id = ANY($1)
         ORDER BY mra.created_at ASC`,
        [recordIds]
      ),
      query(
        `SELECT
           pr.id,
           pr.medical_record_id,
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
         WHERE pr.medical_record_id = ANY($1)
         GROUP BY pr.id
         ORDER BY pr.created_at DESC`,
        [recordIds]
      ),
    ]);

    const addendaByRecord = {};
    for (const addendum of addendaRes.rows) {
      if (!addendaByRecord[addendum.medical_record_id]) {
        addendaByRecord[addendum.medical_record_id] = [];
      }
      addendaByRecord[addendum.medical_record_id].push(addendum);
    }

    const prescriptionByRecord = {};
    for (const presc of prescRes.rows) {
      if (!prescriptionByRecord[presc.medical_record_id]) {
        prescriptionByRecord[presc.medical_record_id] = presc;
      }
    }

    const fullRecords = records.map((rec) => ({
      ...rec,
      patient_name: patient.full_name,
      medical_record_no: patient.medical_record_no,
      patient_birth_date: patient.birth_date,
      patient_gender: patient.gender,
      patient_blood_type: patient.blood_type,
      patient_phone: patient.phone,
      patient_allergies: patient.allergies,
      addenda: addendaByRecord[rec.id] || [],
      prescription: prescriptionByRecord[rec.id] || null,
    }));

    return {
      success: true,
      data: fullRecords,
    };
  } catch (err) {
    return toServiceErrorResult('getMyMedicalRecords', err);
  }
}

export async function getMyPrescriptions() {
  try {
    const { patient } = await requirePatient();

    const res = await query(
      `SELECT 
         pr.id,
         pr.medical_record_id,
         pr.status,
         pr.ready_at,
         pr.picked_up_at,
         pr.notes,
         pr.created_at,
         mr.diagnosis,
         d.full_name AS doctor_name,
         pol.name AS poli_name,
         COALESCE(
           json_agg(
             json_build_object(
               'id', pi.id,
               'medicine_name', m.name,
               'quantity', pi.quantity,
               'dosage_rule', pi.dosage_rule,
               'duration_days', pi.duration_days,
               'unit', m.unit
             )
           ) FILTER (WHERE pi.id IS NOT NULL),
           '[]'::json
         ) AS items
       FROM prescriptions pr
       JOIN medical_records mr ON pr.medical_record_id = mr.id
       JOIN doctors d ON mr.doctor_id = d.id
       JOIN polis pol ON d.poli_id = pol.id
       LEFT JOIN prescription_items pi ON pr.id = pi.prescription_id
       LEFT JOIN medicines m ON pi.medicine_id = m.id
       WHERE mr.patient_id = $1
       GROUP BY pr.id, mr.id, mr.diagnosis, d.full_name, pol.name
       ORDER BY pr.created_at DESC`,
      [patient.id]
    );

    return {
      success: true,
      data: res.rows,
    };
  } catch (err) {
    return toServiceErrorResult('getMyPrescriptions', err);
  }
}

export async function submitFeedback(appointmentId, input) {
  try {
    const { user, patient } = await requirePatient();
    const raw = normalizeInput(input);

    const parsedRaw = {
      ...raw,
      appointment_id: appointmentId,
      rating: Number(raw.rating),
    };

    const validation = feedbackSchema.safeParse(parsedRaw);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || 'Data ulasan tidak valid.',
        status: 400,
      };
    }

    const { rating, comment } = validation.data;

    const apptRes = await query(
      'SELECT id, status, doctor_id FROM appointments WHERE id = $1 AND patient_id = $2',
      [appointmentId, patient.id]
    );

    if (apptRes.rows.length === 0) {
      return { success: false, error: 'Janji temu tidak ditemukan.', status: 404 };
    }

    if (apptRes.rows[0].status !== 'COMPLETED') {
      return {
        success: false,
        error: 'Ulasan hanya dapat diberikan untuk konsultasi yang telah selesai.',
        status: 400,
      };
    }

    const existingFeedback = await query(
      'SELECT id FROM feedbacks WHERE appointment_id = $1',
      [appointmentId]
    );

    if (existingFeedback.rows.length > 0) {
      return {
        success: false,
        error: 'Anda sudah pernah memberikan ulasan untuk konsultasi ini.',
        status: 409,
      };
    }

    const res = await query(
      `INSERT INTO feedbacks (appointment_id, rating, comment)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [appointmentId, rating, comment?.trim() || null]
    );

    const feedback = res.rows[0];

    await query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
       VALUES ($1, 'SUBMIT_FEEDBACK', 'feedbacks', $2, $3)`,
      [
        user.id,
        feedback.id,
        JSON.stringify({ appointment_id: appointmentId, rating }),
      ]
    );

    return {
      success: true,
      data: feedback,
    };
  } catch (err) {
    if (err.code === '23505') {
      return { success: false, error: 'Ulasan untuk konsultasi ini sudah ada.', status: 409 };
    }
    return toServiceErrorResult('submitFeedback', err);
  }
}

export async function getMyNotifications() {
  try {
    const { user } = await requirePatient();

    const res = await query(
      `SELECT id, title, message, type, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [user.id]
    );

    const rows = res.rows || [];
    const unreadCount = rows.filter((item) => !item.is_read).length;

    return {
      success: true,
      data: rows,
      unreadCount,
    };
  } catch (err) {
    return {
      ...toServiceErrorResult('getMyNotifications', err),
      data: [],
      unreadCount: 0,
    };
  }
}

export async function markNotificationAsRead(notificationId) {
  try {
    const { user } = await requirePatient();

    if (!notificationId) {
      return { success: false, error: 'ID pesan tidak valid.', status: 400 };
    }

    const res = await query(
      `UPDATE notifications
       SET is_read = true
       WHERE id = $1 AND user_id = $2
       RETURNING id, title, message, type, is_read, created_at`,
      [notificationId, user.id]
    );

    if (res.rows.length === 0) {
      return { success: false, error: 'Pesan tidak ditemukan.', status: 404 };
    }

    return {
      success: true,
      data: res.rows[0],
    };
  } catch (err) {
    return toServiceErrorResult('markNotificationAsRead', err);
  }
}

export async function markAllNotificationsAsRead() {
  try {
    const { user } = await requirePatient();

    await query(
      `UPDATE notifications
       SET is_read = true
       WHERE user_id = $1 AND is_read = false`,
      [user.id]
    );

    return { success: true };
  } catch (err) {
    return toServiceErrorResult('markAllNotificationsAsRead', err);
  }
}
