import { withTransaction } from '@/lib/db';
import { ServiceError } from '@/lib/serviceErrors';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizeTargetAppointmentStatus(inputStatus) {
  const normalized = String(inputStatus || '').trim().toUpperCase();
  if (normalized === 'APPROVED' || normalized === 'CONFIRMED') {
    return 'CONFIRMED';
  }
  if (normalized === 'REJECTED') {
    return 'REJECTED';
  }
  return null;
}

/**
 * Shared atomic transition for approving (CONFIRMED) or rejecting (REJECTED) an appointment.
 * Can be called by Admin (any appointment) or the assigned Doctor (doctorScopeId must match).
 */
export async function transitionAppointmentStatus({
  appointmentId,
  actorUser,
  doctorScopeId = null,
  actorLabel = 'Administrator',
  targetStatus,
  reason = '',
}) {
  if (!appointmentId || !UUID_REGEX.test(String(appointmentId))) {
    throw new ServiceError('ID janji temu tidak valid.', 400);
  }

  const dbStatus = normalizeTargetAppointmentStatus(targetStatus);
  if (!dbStatus) {
    throw new ServiceError('Status tujuan harus berupa Approved atau Rejected.', 400);
  }

  const trimmedReason = String(reason || '').trim();
  if (dbStatus === 'REJECTED' && !trimmedReason) {
    throw new ServiceError('Alasan penolakan wajib diisi.', 400);
  }

  try {
    return await withTransaction(async (client) => {
      const apptRes = await client.query(
        `SELECT a.*,
                p.user_id AS patient_user_id,
                p.full_name AS patient_name,
                d.full_name AS doctor_name
         FROM appointments a
         JOIN patients p ON a.patient_id = p.id
         JOIN doctors d ON a.doctor_id = d.id
         WHERE a.id = $1
         FOR UPDATE OF a`,
        [appointmentId]
      );

      if (apptRes.rows.length === 0) {
        throw new ServiceError('Janji temu tidak ditemukan.', 404);
      }

      const appt = apptRes.rows[0];

      if (doctorScopeId && String(appt.doctor_id) !== String(doctorScopeId)) {
        throw new ServiceError(
          'Akses ditolak: Hanya dokter yang bersangkutan atau admin yang dapat mengubah status janji temu ini.',
          403
        );
      }

      if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appt.status)) {
        throw new ServiceError(
          'Janji temu yang sudah selesai, dibatalkan pasien, atau tidak hadir tidak dapat diubah statusnya.',
          409
        );
      }

      if (appt.status === 'CONFIRMED' && dbStatus === 'CONFIRMED') {
        throw new ServiceError('Janji temu ini sudah berstatus Approved.', 409);
      }

      const dateStr = new Date(appt.appointment_date).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      const slotStr = String(appt.slot_start || '').slice(0, 5);

      if (dbStatus === 'CONFIRMED') {
        const queueRes = await client.query(
          `SELECT COALESCE(MAX(queue_no), 0) + 1 AS next_queue
           FROM appointments
           WHERE doctor_id = $1 AND appointment_date = $2 AND status = 'CONFIRMED'`,
          [appt.doctor_id, appt.appointment_date]
        );
        const nextQueueNo = queueRes.rows[0].next_queue;

        const updateRes = await client.query(
          `UPDATE appointments
           SET status = 'CONFIRMED',
               queue_no = $1,
               rejection_reason = NULL,
               updated_at = NOW()
           WHERE id = $2
           RETURNING *`,
          [nextQueueNo, appt.id]
        );
        const updatedAppt = updateRes.rows[0];

        if (appt.patient_user_id) {
          await client.query(
            `INSERT INTO notifications (user_id, title, message, type)
             VALUES ($1, $2, $3, 'APPOINTMENT')`,
            [
              appt.patient_user_id,
              'Janji Temu Disetujui (Approved)',
              `Janji temu Anda bersama ${appt.doctor_name} pada ${dateStr} pukul ${slotStr} WIB telah berstatus Approved oleh ${actorLabel}. Nomor antrean Anda: ${nextQueueNo}.`,
            ]
          );
        }

        await client.query(
          `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
           VALUES ($1, 'APPROVE_APPOINTMENT', 'appointments', $2, $3)`,
          [
            actorUser.id,
            appt.id,
            JSON.stringify({
              actor_role: actorUser.role,
              previous_status: appt.status,
              new_status: 'CONFIRMED',
              display_status: 'Approved',
              queue_no: nextQueueNo,
              appointment_date: appt.appointment_date,
              patient_name: appt.patient_name,
              doctor_name: appt.doctor_name,
            }),
          ]
        );

        return updatedAppt;
      }

      // Transition to REJECTED
      const updateRes = await client.query(
        `UPDATE appointments
         SET status = 'REJECTED',
             rejection_reason = $1,
             queue_no = NULL,
             updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [trimmedReason, appt.id]
      );
      const rejectedAppt = updateRes.rows[0];

      if (appt.patient_user_id) {
        await client.query(
          `INSERT INTO notifications (user_id, title, message, type)
           VALUES ($1, $2, $3, 'APPOINTMENT')`,
          [
            appt.patient_user_id,
            'Janji Temu Ditolak (Rejected)',
            `Permohonan janji temu Anda bersama ${appt.doctor_name} pada ${dateStr} pukul ${slotStr} WIB diubah menjadi Rejected oleh ${actorLabel} dengan alasan: "${trimmedReason}". Silakan pilih jadwal lain.`,
          ]
        );
      }

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
         VALUES ($1, 'REJECT_APPOINTMENT', 'appointments', $2, $3)`,
        [
          actorUser.id,
          appt.id,
          JSON.stringify({
            actor_role: actorUser.role,
            previous_status: appt.status,
            new_status: 'REJECTED',
            display_status: 'Rejected',
            reason: trimmedReason,
            patient_name: appt.patient_name,
            doctor_name: appt.doctor_name,
          }),
        ]
      );

      return rejectedAppt;
    });
  } catch (err) {
    if (err?.code === '23505') {
      throw new ServiceError(
        'Slot waktu pada tanggal tersebut sudah terisi oleh janji temu aktif lain.',
        409
      );
    }
    throw err;
  }
}
