import { query, withTransaction } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { equipmentDamageReportSchema } from '@/lib/validators';
import { ensureOperationalSchema } from '@/services/operationalReportService';
import { ServiceError, toServiceErrorResult } from '@/lib/serviceErrors';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let reportSchemaPromise = null;

async function ensureEquipmentReportSchema() {
  await ensureOperationalSchema();
  if (!reportSchemaPromise) {
    reportSchemaPromise = query(`
      CREATE TABLE IF NOT EXISTS equipment_damage_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
        maintenance_id UUID REFERENCES equipment_maintenances(id) ON DELETE SET NULL,
        equipment_code VARCHAR(50) NOT NULL,
        equipment_name VARCHAR(255) NOT NULL,
        department VARCHAR(100),
        severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
        reported_date DATE NOT NULL DEFAULT CURRENT_DATE,
        description TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'REPORTED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_equipment_damage_reports_doctor ON equipment_damage_reports(doctor_id);
    `).catch((err) => {
      reportSchemaPromise = null;
      throw err;
    });
  }
  return reportSchemaPromise;
}

async function requireDoctorWithPoli() {
  const user = await getCurrentUser();
  if (!user) {
    throw new ServiceError('Sesi tidak ditemukan. Silakan masuk terlebih dahulu.', 401);
  }
  if (user.role !== 'DOCTOR') {
    throw new ServiceError(
      'Akses ditolak: Hanya dokter yang diizinkan mengakses fitur laporan alat.',
      403
    );
  }

  const res = await query(
    `SELECT d.*, p.name AS poli_name
     FROM doctors d
     LEFT JOIN polis p ON d.poli_id = p.id
     WHERE d.user_id = $1 AND d.is_active = true`,
    [user.id]
  );

  if (res.rows.length === 0) {
    throw new ServiceError('Data profil dokter tidak ditemukan atau nonaktif.', 404);
  }

  return { user, doctor: res.rows[0] };
}

export async function getMyEquipmentReports() {
  try {
    const { doctor } = await requireDoctorWithPoli();
    await ensureEquipmentReportSchema();

    const res = await query(
      `SELECT r.*,
              em.status AS maintenance_status,
              em.vendor_name,
              em.cost AS maintenance_cost,
              em.maintenance_date,
              em.notes AS maintenance_notes
       FROM equipment_damage_reports r
       LEFT JOIN equipment_maintenances em ON r.maintenance_id = em.id
       WHERE r.doctor_id = $1
       ORDER BY r.reported_date DESC, r.created_at DESC`,
      [doctor.id]
    );

    const reports = res.rows.map((row) => {
      let effectiveStatus = row.status || 'REPORTED';
      if (row.maintenance_status === 'COMPLETED') {
        effectiveStatus = 'RESOLVED';
      } else if (row.maintenance_status === 'IN_PROGRESS') {
        effectiveStatus = 'IN_PROGRESS';
      }
      return {
        ...row,
        effective_status: effectiveStatus,
      };
    });

    return {
      success: true,
      data: reports,
    };
  } catch (err) {
    return toServiceErrorResult('getMyEquipmentReports', err);
  }
}

export async function createEquipmentDamageReport(input) {
  try {
    const { user, doctor } = await requireDoctorWithPoli();
    await ensureEquipmentReportSchema();

    const parsed = equipmentDamageReportSchema.safeParse({
      ...input,
      reported_date: input?.reported_date || new Date().toISOString().slice(0, 10),
    });

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message || 'Data laporan alat rusak tidak valid.',
        status: 400,
      };
    }

    const d = parsed.data;
    const dept = d.department?.trim() || doctor.poli_name || 'Poliklinik';

    const created = await withTransaction(async (client) => {
      const maintRes = await client.query(
        `INSERT INTO equipment_maintenances (
           equipment_code, equipment_name, department, maintenance_type,
           maintenance_date, vendor_name, cost, status, notes, created_by
         )
         VALUES ($1, $2, $3, 'REPAIR', $4, NULL, 0, 'SCHEDULED', $5, $6)
         RETURNING id`,
        [
          d.equipment_code,
          d.equipment_name,
          dept,
          d.reported_date,
          `[Laporan Dokter: ${doctor.full_name} | Urgensi: ${d.severity}] ${d.description}`,
          user.id,
        ]
      );
      const maintenanceId = maintRes.rows[0].id;

      const repRes = await client.query(
        `INSERT INTO equipment_damage_reports (
           doctor_id, maintenance_id, equipment_code, equipment_name,
           department, severity, reported_date, description, status
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'REPORTED')
         RETURNING *`,
        [
          doctor.id,
          maintenanceId,
          d.equipment_code,
          d.equipment_name,
          dept,
          d.severity,
          d.reported_date,
          d.description,
        ]
      );
      const report = repRes.rows[0];

      // Notify active administrators
      const adminsRes = await client.query(
        "SELECT id FROM users WHERE role = 'ADMIN' AND is_active = true"
      );
      for (const adminRow of adminsRes.rows) {
        await client.query(
          `INSERT INTO notifications (user_id, title, message, type)
           VALUES ($1, $2, $3, 'EQUIPMENT')`,
          [
            adminRow.id,
            'Laporan Kerusakan Alat Medis',
            `${doctor.full_name} melaporkan kerusakan pada ${d.equipment_name} (${d.equipment_code}) di ${dept}. Tingkat urgensi: ${d.severity}.`,
          ]
        );
      }

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
         VALUES ($1, 'REPORT_DAMAGED_EQUIPMENT', 'equipment_damage_reports', $2, $3)`,
        [
          user.id,
          report.id,
          JSON.stringify({
            equipment_code: report.equipment_code,
            equipment_name: report.equipment_name,
            severity: report.severity,
            maintenance_id: maintenanceId,
          }),
        ]
      );

      return {
        ...report,
        maintenance_status: 'SCHEDULED',
        effective_status: 'REPORTED',
      };
    });

    return {
      success: true,
      data: created,
    };
  } catch (err) {
    return toServiceErrorResult('createEquipmentDamageReport', err);
  }
}

export async function deleteMyEquipmentReport(reportId) {
  try {
    const { user, doctor } = await requireDoctorWithPoli();
    await ensureEquipmentReportSchema();

    if (!reportId || !UUID_REGEX.test(String(reportId))) {
      return { success: false, error: 'ID laporan alat tidak valid.', status: 400 };
    }

    const removed = await withTransaction(async (client) => {
      const repRes = await client.query(
        `SELECT r.*, em.status AS maintenance_status
         FROM equipment_damage_reports r
         LEFT JOIN equipment_maintenances em ON r.maintenance_id = em.id
         WHERE r.id = $1 AND r.doctor_id = $2
         FOR UPDATE OF r`,
        [reportId, doctor.id]
      );

      if (repRes.rows.length === 0) {
        throw new ServiceError('Laporan alat rusak tidak ditemukan.', 404);
      }

      const rep = repRes.rows[0];
      if (rep.maintenance_status && rep.maintenance_status !== 'SCHEDULED') {
        throw new ServiceError(
          'Laporan yang sedang dikerjakan atau sudah selesai tidak dapat dibatalkan.',
          409
        );
      }

      await client.query('DELETE FROM equipment_damage_reports WHERE id = $1', [reportId]);
      if (rep.maintenance_id) {
        await client.query(
          "DELETE FROM equipment_maintenances WHERE id = $1 AND status = 'SCHEDULED'",
          [rep.maintenance_id]
        );
      }

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
         VALUES ($1, 'DELETE_EQUIPMENT_DAMAGE_REPORT', 'equipment_damage_reports', $2, $3)`,
        [
          user.id,
          reportId,
          JSON.stringify({ equipment_code: rep.equipment_code, equipment_name: rep.equipment_name }),
        ]
      );

      return rep;
    });

    return {
      success: true,
      data: removed,
    };
  } catch (err) {
    return toServiceErrorResult('deleteMyEquipmentReport', err);
  }
}
