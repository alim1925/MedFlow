import { query, withTransaction } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import {
  revenueSchema,
  expenseSchema,
  payrollSchema,
  receivableSchema,
  receivablePaymentSchema,
  maintenanceSchema,
} from '@/lib/validators';
import { ServiceError, toServiceErrorResult } from '@/lib/serviceErrors';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let schemaInitPromise = null;

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    throw new ServiceError('Sesi tidak ditemukan. Silakan masuk terlebih dahulu.', 401);
  }
  if (user.role !== 'ADMIN') {
    throw new ServiceError(
      'Akses ditolak: Hanya administrator yang diizinkan mengakses laporan operasional.',
      403
    );
  }
  return user;
}

function assertValidUuid(id, label = 'ID') {
  if (!id || !UUID_REGEX.test(String(id))) {
    throw new ServiceError(`${label} tidak valid.`, 400);
  }
}

/**
 * Ensures operational & financial tables exist even if schema.sql has not been re-run manually.
 */
export async function ensureOperationalSchema() {
  if (!schemaInitPromise) {
    schemaInitPromise = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS operational_revenues (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          reference_no VARCHAR(50),
          transaction_date DATE NOT NULL,
          category VARCHAR(50) NOT NULL,
          description TEXT NOT NULL,
          amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
          payment_method VARCHAR(30) NOT NULL DEFAULT 'CASH',
          notes TEXT,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS operational_expenses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          reference_no VARCHAR(50),
          transaction_date DATE NOT NULL,
          category VARCHAR(50) NOT NULL,
          description TEXT NOT NULL,
          amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
          vendor VARCHAR(255),
          notes TEXT,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS staff_payrolls (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employee_name VARCHAR(255) NOT NULL,
          doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
          role_title VARCHAR(100) NOT NULL,
          period_month VARCHAR(7) NOT NULL,
          base_salary NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (base_salary >= 0),
          allowance NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (allowance >= 0),
          deduction NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (deduction >= 0),
          status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
          paid_at TIMESTAMP,
          notes TEXT,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS accounts_receivable (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          invoice_number VARCHAR(50) UNIQUE NOT NULL,
          debtor_name VARCHAR(255) NOT NULL,
          debtor_type VARCHAR(30) NOT NULL DEFAULT 'PATIENT',
          patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
          description TEXT,
          total_amount NUMERIC(15, 2) NOT NULL CHECK (total_amount >= 0),
          paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
          due_date DATE NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
          notes TEXT,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS equipment_maintenances (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          equipment_code VARCHAR(50) NOT NULL,
          equipment_name VARCHAR(255) NOT NULL,
          department VARCHAR(100),
          maintenance_type VARCHAR(30) NOT NULL DEFAULT 'PREVENTIVE',
          maintenance_date DATE NOT NULL,
          next_maintenance_date DATE,
          vendor_name VARCHAR(255),
          cost NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
          status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
          notes TEXT,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_operational_revenues_date ON operational_revenues(transaction_date);
        CREATE INDEX IF NOT EXISTS idx_operational_expenses_date ON operational_expenses(transaction_date);
        CREATE INDEX IF NOT EXISTS idx_staff_payrolls_period ON staff_payrolls(period_month);
        CREATE INDEX IF NOT EXISTS idx_accounts_receivable_due_date ON accounts_receivable(due_date);
        CREATE INDEX IF NOT EXISTS idx_equipment_maintenances_date ON equipment_maintenances(maintenance_date);
      `);
    })().catch((err) => {
      schemaInitPromise = null;
      throw err;
    });
  }
  return schemaInitPromise;
}

function getCurrentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function computeReceivableStatus(totalAmount, paidAmount, dueDateStr) {
  const total = Number(totalAmount) || 0;
  const paid = Number(paidAmount) || 0;
  if (paid >= total && total > 0) return 'PAID';

  const todayStr = new Date().toISOString().slice(0, 10);
  if (dueDateStr && dueDateStr < todayStr) return 'OVERDUE';
  if (paid > 0) return 'PARTIAL';
  return 'UNPAID';
}

function buildRecentMonthsList(count = 6) {
  const now = new Date();
  const months = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

export async function getOperationalReport(filters = {}) {
  try {
    await requireAdmin();
    await ensureOperationalSchema();

    const rawPeriod = filters.period ? String(filters.period).trim() : getCurrentYearMonth();
    const isAll = rawPeriod.toUpperCase() === 'ALL';
    const period = !isAll && /^\d{4}-\d{2}$/.test(rawPeriod) ? rawPeriod : isAll ? 'ALL' : getCurrentYearMonth();

    const dateFilter = (column) => (period === 'ALL' ? '' : `WHERE TO_CHAR(${column}, 'YYYY-MM') = $1`);
    const periodParams = period === 'ALL' ? [] : [period];

    const [
      revenuesRes,
      expensesRes,
      payrollsRes,
      receivablesRes,
      maintenancesRes,
      apptCountRes,
      rxCountRes,
      doctorsCountRes,
      inventorySumRes,
      doctorsListRes,
      patientsListRes,
      trendRevRes,
      trendExpRes,
      trendPayRes,
      trendMaintRes,
    ] = await Promise.all([
      query(
        `SELECT * FROM operational_revenues ${dateFilter('transaction_date')} ORDER BY transaction_date DESC, created_at DESC`,
        periodParams
      ),
      query(
        `SELECT * FROM operational_expenses ${dateFilter('transaction_date')} ORDER BY transaction_date DESC, created_at DESC`,
        periodParams
      ),
      query(
        `SELECT p.*, d.full_name AS linked_doctor_name
         FROM staff_payrolls p
         LEFT JOIN doctors d ON p.doctor_id = d.id
         ${period === 'ALL' ? '' : 'WHERE p.period_month = $1'}
         ORDER BY p.period_month DESC, p.created_at DESC`,
        periodParams
      ),
      query(
        `SELECT r.*, pt.medical_record_no
         FROM accounts_receivable r
         LEFT JOIN patients pt ON r.patient_id = pt.id
         ORDER BY
           CASE
             WHEN r.paid_amount < r.total_amount AND r.due_date < CURRENT_DATE THEN 1
             WHEN r.status = 'UNPAID' THEN 2
             WHEN r.status = 'PARTIAL' THEN 3
             ELSE 4
           END ASC,
           r.due_date ASC,
           r.created_at DESC`
      ),
      query(
        `SELECT * FROM equipment_maintenances ${dateFilter('maintenance_date')} ORDER BY maintenance_date DESC, created_at DESC`,
        periodParams
      ),
      query(
        `SELECT COUNT(*)::int AS count FROM appointments
         WHERE status = 'COMPLETED' ${period === 'ALL' ? '' : "AND TO_CHAR(appointment_date, 'YYYY-MM') = $1"}`,
        periodParams
      ),
      query(
        `SELECT COUNT(*)::int AS count FROM prescriptions
         WHERE status = 'PICKED_UP' ${period === 'ALL' ? '' : "AND TO_CHAR(COALESCE(picked_up_at, created_at), 'YYYY-MM') = $1"}`,
        periodParams
      ),
      query('SELECT COUNT(*)::int AS count FROM doctors WHERE is_active = true'),
      query('SELECT COALESCE(SUM(stock), 0)::int AS total_stock FROM medicines WHERE is_active = true'),
      query('SELECT id, full_name FROM doctors WHERE is_active = true ORDER BY full_name ASC'),
      query('SELECT id, full_name, medical_record_no FROM patients ORDER BY full_name ASC LIMIT 200'),
      query(
        `SELECT TO_CHAR(transaction_date, 'YYYY-MM') AS ym, COALESCE(SUM(amount), 0)::numeric AS total
         FROM operational_revenues
         GROUP BY ym`
      ),
      query(
        `SELECT TO_CHAR(transaction_date, 'YYYY-MM') AS ym, COALESCE(SUM(amount), 0)::numeric AS total
         FROM operational_expenses
         GROUP BY ym`
      ),
      query(
        `SELECT period_month AS ym, COALESCE(SUM(GREATEST(base_salary + allowance - deduction, 0)), 0)::numeric AS total
         FROM staff_payrolls
         GROUP BY period_month`
      ),
      query(
        `SELECT TO_CHAR(maintenance_date, 'YYYY-MM') AS ym, COALESCE(SUM(cost), 0)::numeric AS total
         FROM equipment_maintenances
         GROUP BY ym`
      ),
    ]);

    const revenues = revenuesRes.rows.map((r) => ({
      ...r,
      amount: Number(r.amount) || 0,
    }));

    const expenses = expensesRes.rows.map((e) => ({
      ...e,
      amount: Number(e.amount) || 0,
    }));

    const payrolls = payrollsRes.rows.map((p) => {
      const base_salary = Number(p.base_salary) || 0;
      const allowance = Number(p.allowance) || 0;
      const deduction = Number(p.deduction) || 0;
      return {
        ...p,
        base_salary,
        allowance,
        deduction,
        net_salary: Math.max(base_salary + allowance - deduction, 0),
      };
    });

    const todayStr = new Date().toISOString().slice(0, 10);
    const receivables = receivablesRes.rows.map((rec) => {
      const total_amount = Number(rec.total_amount) || 0;
      const paid_amount = Number(rec.paid_amount) || 0;
      const remaining_amount = Math.max(total_amount - paid_amount, 0);
      const dueStr = rec.due_date ? new Date(rec.due_date).toISOString().slice(0, 10) : '';
      const effective_status =
        remaining_amount <= 0
          ? 'PAID'
          : dueStr && dueStr < todayStr
          ? 'OVERDUE'
          : paid_amount > 0
          ? 'PARTIAL'
          : 'UNPAID';

      return {
        ...rec,
        total_amount,
        paid_amount,
        remaining_amount,
        effective_status,
      };
    });

    const maintenances = maintenancesRes.rows.map((m) => ({
      ...m,
      cost: Number(m.cost) || 0,
    }));

    // Core financial aggregations
    const totalRevenue = revenues.reduce((sum, r) => sum + r.amount, 0);
    const generalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const payrollTotal = payrolls.reduce((sum, p) => sum + p.net_salary, 0);
    const payrollPaid = payrolls
      .filter((p) => p.status === 'PAID')
      .reduce((sum, p) => sum + p.net_salary, 0);
    const payrollPending = payrolls
      .filter((p) => p.status !== 'PAID')
      .reduce((sum, p) => sum + p.net_salary, 0);
    const maintenanceCost = maintenances.reduce((sum, m) => sum + m.cost, 0);

    const totalExpenses = generalExpenses + payrollTotal + maintenanceCost;
    const variance = totalRevenue - totalExpenses;
    const grossProfit = totalRevenue - generalExpenses;
    const netProfit = variance;
    const profitMarginPercent =
      totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(1)) : 0;

    // Receivables aggregations (balance-sheet wide)
    const receivablesTotal = receivables.reduce((sum, r) => sum + r.total_amount, 0);
    const receivablesCollected = receivables.reduce((sum, r) => sum + r.paid_amount, 0);
    const receivablesOutstanding = receivables.reduce((sum, r) => sum + r.remaining_amount, 0);
    const overdueReceivables = receivables.filter((r) => r.effective_status === 'OVERDUE');
    const receivablesOverdueCount = overdueReceivables.length;
    const receivablesOverdueAmount = overdueReceivables.reduce((sum, r) => sum + r.remaining_amount, 0);

    // Maintenance summary
    const maintenanceCount = maintenances.length;
    const maintenanceScheduledCount = maintenances.filter((m) => m.status === 'SCHEDULED').length;
    const maintenanceInProgressCount = maintenances.filter((m) => m.status === 'IN_PROGRESS').length;
    const maintenanceCompletedCount = maintenances.filter((m) => m.status === 'COMPLETED').length;

    // Category breakdowns
    const revCatMap = {};
    for (const r of revenues) {
      revCatMap[r.category] = (revCatMap[r.category] || 0) + r.amount;
    }

    const expCatMap = {};
    for (const e of expenses) {
      expCatMap[e.category] = (expCatMap[e.category] || 0) + e.amount;
    }
    if (payrollTotal > 0) {
      expCatMap.PAYROLL = payrollTotal;
    }
    if (maintenanceCost > 0) {
      expCatMap.EQUIPMENT_MAINTENANCE = maintenanceCost;
    }

    // 6-month trend
    const toMap = (rows) => {
      const m = {};
      for (const row of rows) {
        if (row.ym) m[row.ym] = Number(row.total) || 0;
      }
      return m;
    };
    const revMap = toMap(trendRevRes.rows);
    const expMap = toMap(trendExpRes.rows);
    const payMap = toMap(trendPayRes.rows);
    const maintMap = toMap(trendMaintRes.rows);

    const monthlyTrend = buildRecentMonthsList(6).map((ym) => {
      const rev = revMap[ym] || 0;
      const exp = (expMap[ym] || 0) + (payMap[ym] || 0) + (maintMap[ym] || 0);
      return {
        month: ym,
        revenue: rev,
        expense: exp,
        profit: rev - exp,
      };
    });

    const isAllEmpty =
      revenues.length === 0 &&
      expenses.length === 0 &&
      payrolls.length === 0 &&
      receivables.length === 0 &&
      maintenances.length === 0;

    return {
      success: true,
      data: {
        period,
        isAllEmpty,
        summary: {
          totalRevenue,
          generalExpenses,
          payrollTotal,
          payrollPaid,
          payrollPending,
          maintenanceCost,
          totalExpenses,
          variance,
          varianceStatus: variance >= 0 ? 'SURPLUS' : 'DEFICIT',
          grossProfit,
          netProfit,
          profitMarginPercent,
          receivablesTotal,
          receivablesCollected,
          receivablesOutstanding,
          receivablesOverdueCount,
          receivablesOverdueAmount,
          maintenanceCount,
          maintenanceScheduledCount,
          maintenanceInProgressCount,
          maintenanceCompletedCount,
        },
        breakdowns: {
          revenueByCategory: revCatMap,
          expenseByCategory: expCatMap,
        },
        monthlyTrend,
        clinicalContext: {
          completedAppointments: apptCountRes.rows[0]?.count || 0,
          pickedUpPrescriptions: rxCountRes.rows[0]?.count || 0,
          activeDoctorsCount: doctorsCountRes.rows[0]?.count || 0,
          totalInventoryUnits: inventorySumRes.rows[0]?.total_stock || 0,
        },
        lists: {
          revenues,
          expenses,
          payrolls,
          receivables,
          maintenances,
        },
        references: {
          doctors: doctorsListRes.rows,
          patients: patientsListRes.rows,
        },
      },
    };
  } catch (err) {
    return toServiceErrorResult('getOperationalReport', err);
  }
}

// ============================================================================
// REVENUES CRUD
// ============================================================================

export async function createRevenue(input) {
  try {
    const admin = await requireAdmin();
    await ensureOperationalSchema();

    const parsed = revenueSchema.safeParse({
      ...input,
      amount: Number(input?.amount),
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Data pendapatan tidak valid.', status: 400 };
    }

    const d = parsed.data;
    const refNo = d.reference_no?.trim() || `REV-${Date.now().toString().slice(-6)}`;

    const res = await query(
      `INSERT INTO operational_revenues (reference_no, transaction_date, category, description, amount, payment_method, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [refNo, d.transaction_date, d.category, d.description, d.amount, d.payment_method, d.notes || null, admin.id]
    );

    const created = res.rows[0];
    await query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
       VALUES ($1, 'CREATE_REVENUE', 'operational_revenues', $2, $3)`,
      [admin.id, created.id, JSON.stringify({ reference_no: created.reference_no, amount: Number(created.amount) })]
    );

    return { success: true, data: created };
  } catch (err) {
    return toServiceErrorResult('createRevenue', err);
  }
}

export async function updateRevenue(id, input) {
  try {
    const admin = await requireAdmin();
    await ensureOperationalSchema();
    assertValidUuid(id, 'ID pendapatan');

    const parsed = revenueSchema.safeParse({
      ...input,
      amount: Number(input?.amount),
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Data pendapatan tidak valid.', status: 400 };
    }

    const d = parsed.data;
    const res = await query(
      `UPDATE operational_revenues
       SET reference_no = COALESCE(NULLIF($1, ''), reference_no),
           transaction_date = $2,
           category = $3,
           description = $4,
           amount = $5,
           payment_method = $6,
           notes = $7,
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [d.reference_no?.trim() || '', d.transaction_date, d.category, d.description, d.amount, d.payment_method, d.notes || null, id]
    );

    if (res.rows.length === 0) {
      return { success: false, error: 'Catatan pendapatan tidak ditemukan.', status: 404 };
    }

    return { success: true, data: res.rows[0] };
  } catch (err) {
    return toServiceErrorResult('updateRevenue', err);
  }
}

export async function deleteRevenue(id) {
  try {
    const admin = await requireAdmin();
    await ensureOperationalSchema();
    assertValidUuid(id, 'ID pendapatan');

    const res = await query('DELETE FROM operational_revenues WHERE id = $1 RETURNING id, reference_no, amount', [id]);
    if (res.rows.length === 0) {
      return { success: false, error: 'Catatan pendapatan tidak ditemukan.', status: 404 };
    }

    await query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
       VALUES ($1, 'DELETE_REVENUE', 'operational_revenues', $2, $3)`,
      [admin.id, id, JSON.stringify(res.rows[0])]
    );

    return { success: true, data: res.rows[0] };
  } catch (err) {
    return toServiceErrorResult('deleteRevenue', err);
  }
}

// ============================================================================
// EXPENSES CRUD
// ============================================================================

export async function createExpense(input) {
  try {
    const admin = await requireAdmin();
    await ensureOperationalSchema();

    const parsed = expenseSchema.safeParse({
      ...input,
      amount: Number(input?.amount),
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Data pengeluaran tidak valid.', status: 400 };
    }

    const d = parsed.data;
    const refNo = d.reference_no?.trim() || `EXP-${Date.now().toString().slice(-6)}`;

    const res = await query(
      `INSERT INTO operational_expenses (reference_no, transaction_date, category, description, amount, vendor, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [refNo, d.transaction_date, d.category, d.description, d.amount, d.vendor || null, d.notes || null, admin.id]
    );

    const created = res.rows[0];
    await query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
       VALUES ($1, 'CREATE_EXPENSE', 'operational_expenses', $2, $3)`,
      [admin.id, created.id, JSON.stringify({ reference_no: created.reference_no, amount: Number(created.amount) })]
    );

    return { success: true, data: created };
  } catch (err) {
    return toServiceErrorResult('createExpense', err);
  }
}

export async function updateExpense(id, input) {
  try {
    await requireAdmin();
    await ensureOperationalSchema();
    assertValidUuid(id, 'ID pengeluaran');

    const parsed = expenseSchema.safeParse({
      ...input,
      amount: Number(input?.amount),
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Data pengeluaran tidak valid.', status: 400 };
    }

    const d = parsed.data;
    const res = await query(
      `UPDATE operational_expenses
       SET reference_no = COALESCE(NULLIF($1, ''), reference_no),
           transaction_date = $2,
           category = $3,
           description = $4,
           amount = $5,
           vendor = $6,
           notes = $7,
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [d.reference_no?.trim() || '', d.transaction_date, d.category, d.description, d.amount, d.vendor || null, d.notes || null, id]
    );

    if (res.rows.length === 0) {
      return { success: false, error: 'Catatan pengeluaran tidak ditemukan.', status: 404 };
    }

    return { success: true, data: res.rows[0] };
  } catch (err) {
    return toServiceErrorResult('updateExpense', err);
  }
}

export async function deleteExpense(id) {
  try {
    const admin = await requireAdmin();
    await ensureOperationalSchema();
    assertValidUuid(id, 'ID pengeluaran');

    const res = await query('DELETE FROM operational_expenses WHERE id = $1 RETURNING id, reference_no, amount', [id]);
    if (res.rows.length === 0) {
      return { success: false, error: 'Catatan pengeluaran tidak ditemukan.', status: 404 };
    }

    await query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
       VALUES ($1, 'DELETE_EXPENSE', 'operational_expenses', $2, $3)`,
      [admin.id, id, JSON.stringify(res.rows[0])]
    );

    return { success: true, data: res.rows[0] };
  } catch (err) {
    return toServiceErrorResult('deleteExpense', err);
  }
}

// ============================================================================
// PAYROLLS CRUD
// ============================================================================

export async function createPayroll(input) {
  try {
    const admin = await requireAdmin();
    await ensureOperationalSchema();

    const parsed = payrollSchema.safeParse({
      ...input,
      doctor_id: input?.doctor_id || null,
      base_salary: Number(input?.base_salary || 0),
      allowance: Number(input?.allowance || 0),
      deduction: Number(input?.deduction || 0),
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Data gaji tidak valid.', status: 400 };
    }

    const d = parsed.data;
    const paidAt = d.status === 'PAID' ? new Date() : null;

    const res = await query(
      `INSERT INTO staff_payrolls (employee_name, doctor_id, role_title, period_month, base_salary, allowance, deduction, status, paid_at, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [d.employee_name, d.doctor_id || null, d.role_title, d.period_month, d.base_salary, d.allowance, d.deduction, d.status, paidAt, d.notes || null, admin.id]
    );

    const created = res.rows[0];
    await query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
       VALUES ($1, 'CREATE_PAYROLL', 'staff_payrolls', $2, $3)`,
      [admin.id, created.id, JSON.stringify({ employee_name: created.employee_name, period_month: created.period_month })]
    );

    return { success: true, data: created };
  } catch (err) {
    return toServiceErrorResult('createPayroll', err);
  }
}

export async function updatePayroll(id, input) {
  try {
    await requireAdmin();
    await ensureOperationalSchema();
    assertValidUuid(id, 'ID gaji');

    if (input?.action === 'MARK_PAID') {
      const res = await query(
        `UPDATE staff_payrolls
         SET status = 'PAID', paid_at = COALESCE(paid_at, NOW()), updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id]
      );
      if (res.rows.length === 0) {
        return { success: false, error: 'Data gaji tidak ditemukan.', status: 404 };
      }
      return { success: true, data: res.rows[0] };
    }

    const parsed = payrollSchema.safeParse({
      ...input,
      doctor_id: input?.doctor_id || null,
      base_salary: Number(input?.base_salary || 0),
      allowance: Number(input?.allowance || 0),
      deduction: Number(input?.deduction || 0),
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Data gaji tidak valid.', status: 400 };
    }

    const d = parsed.data;
    const res = await query(
      `UPDATE staff_payrolls
       SET employee_name = $1,
           doctor_id = $2,
           role_title = $3,
           period_month = $4,
           base_salary = $5,
           allowance = $6,
           deduction = $7,
           status = $8,
           paid_at = CASE WHEN $8 = 'PAID' THEN COALESCE(paid_at, NOW()) ELSE NULL END,
           notes = $9,
           updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [d.employee_name, d.doctor_id || null, d.role_title, d.period_month, d.base_salary, d.allowance, d.deduction, d.status, d.notes || null, id]
    );

    if (res.rows.length === 0) {
      return { success: false, error: 'Data gaji tidak ditemukan.', status: 404 };
    }

    return { success: true, data: res.rows[0] };
  } catch (err) {
    return toServiceErrorResult('updatePayroll', err);
  }
}

export async function deletePayroll(id) {
  try {
    const admin = await requireAdmin();
    await ensureOperationalSchema();
    assertValidUuid(id, 'ID gaji');

    const res = await query('DELETE FROM staff_payrolls WHERE id = $1 RETURNING id, employee_name, period_month', [id]);
    if (res.rows.length === 0) {
      return { success: false, error: 'Data gaji tidak ditemukan.', status: 404 };
    }

    await query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
       VALUES ($1, 'DELETE_PAYROLL', 'staff_payrolls', $2, $3)`,
      [admin.id, id, JSON.stringify(res.rows[0])]
    );

    return { success: true, data: res.rows[0] };
  } catch (err) {
    return toServiceErrorResult('deletePayroll', err);
  }
}

// ============================================================================
// RECEIVABLES (PIUTANG) CRUD + PAYMENT RECORDING
// ============================================================================

export async function createReceivable(input) {
  try {
    const admin = await requireAdmin();
    await ensureOperationalSchema();

    const parsed = receivableSchema.safeParse({
      ...input,
      patient_id: input?.patient_id || null,
      total_amount: Number(input?.total_amount),
      paid_amount: Number(input?.paid_amount || 0),
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Data piutang tidak valid.', status: 400 };
    }

    const d = parsed.data;
    if (d.paid_amount > d.total_amount) {
      return { success: false, error: 'Jumlah terbayar tidak boleh melebihi total tagihan.', status: 400 };
    }

    const status = d.status || computeReceivableStatus(d.total_amount, d.paid_amount, d.due_date);

    const res = await query(
      `INSERT INTO accounts_receivable (invoice_number, debtor_name, debtor_type, patient_id, description, total_amount, paid_amount, due_date, status, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        d.invoice_number,
        d.debtor_name,
        d.debtor_type,
        d.patient_id || null,
        d.description || null,
        d.total_amount,
        d.paid_amount,
        d.due_date,
        status,
        d.notes || null,
        admin.id,
      ]
    );

    const created = res.rows[0];
    await query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
       VALUES ($1, 'CREATE_RECEIVABLE', 'accounts_receivable', $2, $3)`,
      [admin.id, created.id, JSON.stringify({ invoice_number: created.invoice_number, total_amount: Number(created.total_amount) })]
    );

    return { success: true, data: created };
  } catch (err) {
    if (err.code === '23505') {
      return { success: false, error: 'Nomor invoice piutang sudah terdaftar.', status: 409 };
    }
    return toServiceErrorResult('createReceivable', err);
  }
}

export async function updateReceivable(id, input) {
  try {
    const admin = await requireAdmin();
    await ensureOperationalSchema();
    assertValidUuid(id, 'ID piutang');

    if (input?.action === 'RECORD_PAYMENT') {
      const payParsed = receivablePaymentSchema.safeParse({
        payment_amount: Number(input?.payment_amount),
        payment_method: input?.payment_method || 'TRANSFER',
        record_as_revenue: input?.record_as_revenue !== false && input?.record_as_revenue !== 'false',
        notes: input?.notes,
      });

      if (!payParsed.success) {
        return { success: false, error: payParsed.error.errors[0]?.message || 'Data pembayaran piutang tidak valid.', status: 400 };
      }

      const { payment_amount, payment_method, record_as_revenue, notes } = payParsed.data;

      const updated = await withTransaction(async (client) => {
        const recRes = await client.query('SELECT * FROM accounts_receivable WHERE id = $1 FOR UPDATE', [id]);
        if (recRes.rows.length === 0) {
          throw new ServiceError('Data piutang tidak ditemukan.', 404);
        }

        const rec = recRes.rows[0];
        const total = Number(rec.total_amount) || 0;
        const currentPaid = Number(rec.paid_amount) || 0;
        const remaining = Math.max(total - currentPaid, 0);

        if (remaining <= 0) {
          throw new ServiceError('Piutang ini sudah lunas.', 400);
        }
        if (payment_amount > remaining) {
          throw new ServiceError(`Nominal pembayaran melebihi sisa tagihan (Rp ${remaining.toLocaleString('id-ID')}).`, 400);
        }

        const newPaid = currentPaid + payment_amount;
        const dueStr = rec.due_date ? new Date(rec.due_date).toISOString().slice(0, 10) : '';
        const newStatus = computeReceivableStatus(total, newPaid, dueStr);

        const updRes = await client.query(
          `UPDATE accounts_receivable
           SET paid_amount = $1,
               status = $2,
               notes = COALESCE(NULLIF($3, ''), notes),
               updated_at = NOW()
           WHERE id = $4
           RETURNING *`,
          [newPaid, newStatus, notes || '', id]
        );

        if (record_as_revenue) {
          const todayStr = new Date().toISOString().slice(0, 10);
          const revCategory = rec.debtor_type === 'BPJS' ? 'POLI_SERVICE' : 'OTHER';
          await client.query(
            `INSERT INTO operational_revenues (reference_no, transaction_date, category, description, amount, payment_method, notes, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              `PAY-${rec.invoice_number}`,
              todayStr,
              revCategory,
              `Pelunasan Piutang ${rec.invoice_number} - ${rec.debtor_name}`,
              payment_amount,
              payment_method,
              notes || `Pembayaran piutang (${newStatus})`,
              admin.id,
            ]
          );
        }

        await client.query(
          `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
           VALUES ($1, 'RECORD_RECEIVABLE_PAYMENT', 'accounts_receivable', $2, $3)`,
          [
            admin.id,
            id,
            JSON.stringify({
              invoice_number: rec.invoice_number,
              payment_amount,
              new_paid_amount: newPaid,
              new_status: newStatus,
              recorded_as_revenue: record_as_revenue,
            }),
          ]
        );

        return updRes.rows[0];
      });

      return { success: true, data: updated };
    }

    const parsed = receivableSchema.safeParse({
      ...input,
      patient_id: input?.patient_id || null,
      total_amount: Number(input?.total_amount),
      paid_amount: Number(input?.paid_amount || 0),
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Data piutang tidak valid.', status: 400 };
    }

    const d = parsed.data;
    if (d.paid_amount > d.total_amount) {
      return { success: false, error: 'Jumlah terbayar tidak boleh melebihi total tagihan.', status: 400 };
    }

    const status = computeReceivableStatus(d.total_amount, d.paid_amount, d.due_date);

    const res = await query(
      `UPDATE accounts_receivable
       SET invoice_number = $1,
           debtor_name = $2,
           debtor_type = $3,
           patient_id = $4,
           description = $5,
           total_amount = $6,
           paid_amount = $7,
           due_date = $8,
           status = $9,
           notes = $10,
           updated_at = NOW()
       WHERE id = $11
       RETURNING *`,
      [
        d.invoice_number,
        d.debtor_name,
        d.debtor_type,
        d.patient_id || null,
        d.description || null,
        d.total_amount,
        d.paid_amount,
        d.due_date,
        status,
        d.notes || null,
        id,
      ]
    );

    if (res.rows.length === 0) {
      return { success: false, error: 'Data piutang tidak ditemukan.', status: 404 };
    }

    return { success: true, data: res.rows[0] };
  } catch (err) {
    if (err.code === '23505') {
      return { success: false, error: 'Nomor invoice piutang sudah digunakan.', status: 409 };
    }
    return toServiceErrorResult('updateReceivable', err);
  }
}

export async function deleteReceivable(id) {
  try {
    const admin = await requireAdmin();
    await ensureOperationalSchema();
    assertValidUuid(id, 'ID piutang');

    const res = await query('DELETE FROM accounts_receivable WHERE id = $1 RETURNING id, invoice_number, debtor_name', [id]);
    if (res.rows.length === 0) {
      return { success: false, error: 'Data piutang tidak ditemukan.', status: 404 };
    }

    await query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
       VALUES ($1, 'DELETE_RECEIVABLE', 'accounts_receivable', $2, $3)`,
      [admin.id, id, JSON.stringify(res.rows[0])]
    );

    return { success: true, data: res.rows[0] };
  } catch (err) {
    return toServiceErrorResult('deleteReceivable', err);
  }
}

// ============================================================================
// EQUIPMENT MAINTENANCES CRUD
// ============================================================================

export async function createMaintenance(input) {
  try {
    const admin = await requireAdmin();
    await ensureOperationalSchema();

    const parsed = maintenanceSchema.safeParse({
      ...input,
      cost: Number(input?.cost || 0),
      next_maintenance_date: input?.next_maintenance_date || null,
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Data pemeliharaan alat tidak valid.', status: 400 };
    }

    const d = parsed.data;
    const res = await query(
      `INSERT INTO equipment_maintenances (
         equipment_code, equipment_name, department, maintenance_type,
         maintenance_date, next_maintenance_date, vendor_name, cost, status, notes, created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        d.equipment_code,
        d.equipment_name,
        d.department || null,
        d.maintenance_type,
        d.maintenance_date,
        d.next_maintenance_date || null,
        d.vendor_name || null,
        d.cost,
        d.status,
        d.notes || null,
        admin.id,
      ]
    );

    const created = res.rows[0];
    await query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
       VALUES ($1, 'CREATE_EQUIPMENT_MAINTENANCE', 'equipment_maintenances', $2, $3)`,
      [admin.id, created.id, JSON.stringify({ equipment_code: created.equipment_code, cost: Number(created.cost) })]
    );

    return { success: true, data: created };
  } catch (err) {
    return toServiceErrorResult('createMaintenance', err);
  }
}

export async function updateMaintenance(id, input) {
  try {
    await requireAdmin();
    await ensureOperationalSchema();
    assertValidUuid(id, 'ID pemeliharaan');

    if (input?.action === 'UPDATE_STATUS' && ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'].includes(input?.status)) {
      const res = await query(
        `UPDATE equipment_maintenances
         SET status = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [input.status, id]
      );
      if (res.rows.length === 0) {
        return { success: false, error: 'Catatan pemeliharaan alat tidak ditemukan.', status: 404 };
      }
      return { success: true, data: res.rows[0] };
    }

    const parsed = maintenanceSchema.safeParse({
      ...input,
      cost: Number(input?.cost || 0),
      next_maintenance_date: input?.next_maintenance_date || null,
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Data pemeliharaan alat tidak valid.', status: 400 };
    }

    const d = parsed.data;
    const res = await query(
      `UPDATE equipment_maintenances
       SET equipment_code = $1,
           equipment_name = $2,
           department = $3,
           maintenance_type = $4,
           maintenance_date = $5,
           next_maintenance_date = $6,
           vendor_name = $7,
           cost = $8,
           status = $9,
           notes = $10,
           updated_at = NOW()
       WHERE id = $11
       RETURNING *`,
      [
        d.equipment_code,
        d.equipment_name,
        d.department || null,
        d.maintenance_type,
        d.maintenance_date,
        d.next_maintenance_date || null,
        d.vendor_name || null,
        d.cost,
        d.status,
        d.notes || null,
        id,
      ]
    );

    if (res.rows.length === 0) {
      return { success: false, error: 'Catatan pemeliharaan alat tidak ditemukan.', status: 404 };
    }

    return { success: true, data: res.rows[0] };
  } catch (err) {
    return toServiceErrorResult('updateMaintenance', err);
  }
}

export async function deleteMaintenance(id) {
  try {
    const admin = await requireAdmin();
    await ensureOperationalSchema();
    assertValidUuid(id, 'ID pemeliharaan');

    const res = await query('DELETE FROM equipment_maintenances WHERE id = $1 RETURNING id, equipment_code, equipment_name', [id]);
    if (res.rows.length === 0) {
      return { success: false, error: 'Catatan pemeliharaan alat tidak ditemukan.', status: 404 };
    }

    await query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
       VALUES ($1, 'DELETE_EQUIPMENT_MAINTENANCE', 'equipment_maintenances', $2, $3)`,
      [admin.id, id, JSON.stringify(res.rows[0])]
    );

    return { success: true, data: res.rows[0] };
  } catch (err) {
    return toServiceErrorResult('deleteMaintenance', err);
  }
}

// ============================================================================
// OPTIONAL SAMPLE DATA SEEDER (for existing DBs)
// ============================================================================

export async function seedSampleOperationalData() {
  try {
    const admin = await requireAdmin();
    await ensureOperationalSchema();

    const result = await withTransaction(async (client) => {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const prevDateObj = new Date(now.getFullYear(), now.getMonth() - 1, 15);
      const prevMonth = `${prevDateObj.getFullYear()}-${String(prevDateObj.getMonth() + 1).padStart(2, '0')}`;
      const mkDate = (ym, day) => `${ym}-${String(day).padStart(2, '0')}`;

      const counts = await Promise.all([
        client.query('SELECT COUNT(*)::int AS c FROM operational_revenues'),
        client.query('SELECT COUNT(*)::int AS c FROM operational_expenses'),
        client.query('SELECT COUNT(*)::int AS c FROM staff_payrolls'),
        client.query('SELECT COUNT(*)::int AS c FROM accounts_receivable'),
        client.query('SELECT COUNT(*)::int AS c FROM equipment_maintenances'),
      ]);

      const totalExisting = counts.reduce((s, r) => s + (r.rows[0]?.c || 0), 0);
      if (totalExisting > 0) {
        throw new ServiceError('Data operasional sudah tersedia. Hapus atau kelola langsung melalui tabel.', 409);
      }

      const revenues = [
        ['REV-2026-001', mkDate(currentMonth, 3), 'POLI_SERVICE', 'Pendapatan Jasa Konsultasi Poli Umum & Spesialis', 28500000, 'TRANSFER', 'Rekap minggu 1'],
        ['REV-2026-002', mkDate(currentMonth, 8), 'PHARMACY', 'Penjualan Obat Instalasi Farmasi Rawat Jalan', 19400000, 'QRIS', 'Resep pasien umum & BPJS'],
        ['REV-2026-003', mkDate(currentMonth, 12), 'LABORATORY', 'Layanan Pemeriksaan Laboratorium & Diagnostik', 14250000, 'CASH', 'Paket lab darah & urin'],
        ['REV-2026-004', mkDate(currentMonth, 18), 'POLI_SERVICE', 'Tindakan Medis Poli Gigi & Penyakit Dalam', 22800000, 'BPJS', 'Klaim layanan rawat jalan'],
        ['REV-2026-005', mkDate(prevMonth, 14), 'POLI_SERVICE', 'Pendapatan Layanan Poliklinik Bulan Lalu', 41200000, 'TRANSFER', 'Rekap bulanan'],
        ['REV-2026-006', mkDate(prevMonth, 22), 'PHARMACY', 'Penjualan Resep Obat Farmasi Bulan Lalu', 17600000, 'CASH', 'Rekap farmasi'],
      ];
      for (const r of revenues) {
        await client.query(
          `INSERT INTO operational_revenues (reference_no, transaction_date, category, description, amount, payment_method, notes, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [...r, admin.id]
        );
      }

      const expenses = [
        ['EXP-2026-001', mkDate(currentMonth, 4), 'MEDICINE_PURCHASE', 'Pengadaan Stok Obat & Antibiotik Gudang Farmasi', 12500000, 'PT Kimia Farma Trading', 'Restock rutin bulanan'],
        ['EXP-2026-002', mkDate(currentMonth, 7), 'UTILITIES', 'Tagihan Listrik, Air PDAM & Internet Rumah Sakit', 4850000, 'PLN & PDAM Kota', 'Tagihan operasional gedung'],
        ['EXP-2026-003', mkDate(currentMonth, 11), 'MEDICAL_SUPPLIES', 'Pembelian Bahan Medis Habis Pakai (Spuit, Masker, Sarung Tangan)', 3600000, 'PT Medika Sejahtera', 'Kebutuhan poliklinik'],
        ['EXP-2026-004', mkDate(currentMonth, 16), 'FACILITY', 'Layanan Kebersihan, Laundry Medis & Pengelolaan Limbah B3', 2900000, 'CV Bersih Medika', 'Kontrak bulanan'],
        ['EXP-2026-005', mkDate(prevMonth, 10), 'MEDICINE_PURCHASE', 'Pengadaan Obat Formularium Bulan Lalu', 11200000, 'PT Enseval Putera', 'Faktur lunas'],
      ];
      for (const e of expenses) {
        await client.query(
          `INSERT INTO operational_expenses (reference_no, transaction_date, category, description, amount, vendor, notes, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [...e, admin.id]
        );
      }

      const payrolls = [
        ['Dr. Budi Santoso, Sp.PD', 'Dokter Spesialis Penyakit Dalam', currentMonth, 14000000, 4500000, 500000, 'PAID', 'Gaji & jasa medis'],
        ['Dr. Siti Rahma, Sp.A', 'Dokter Spesialis Anak', currentMonth, 13500000, 3800000, 450000, 'PAID', 'Gaji & jasa medis'],
        ['Drg. Maya Kartika', 'Dokter Gigi', currentMonth, 9500000, 2500000, 300000, 'PENDING', 'Menunggu pencairan akhir bulan'],
        ['Apt. Rina Kusuma, S.Farm', 'Kepala Instalasi Farmasi', currentMonth, 6500000, 1200000, 200000, 'PAID', 'Tunjangan profesi apoteker'],
        ['Ns. Hendri Saputra, S.Kep', 'Koordinator Perawat Poli', currentMonth, 5500000, 1000000, 150000, 'PENDING', 'Jadwal shift rawat jalan'],
        ['Dr. Budi Santoso, Sp.PD', 'Dokter Spesialis Penyakit Dalam', prevMonth, 14000000, 4200000, 500000, 'PAID', 'Periode bulan lalu'],
      ];
      for (const p of payrolls) {
        await client.query(
          `INSERT INTO staff_payrolls (employee_name, role_title, period_month, base_salary, allowance, deduction, status, paid_at, notes, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, ${p[6] === 'PAID' ? 'NOW()' : 'NULL'}, $8, $9)`,
          [p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], admin.id]
        );
      }

      const dueFuture = new Date(now.getTime() + 14 * 86400000).toISOString().slice(0, 10);
      const duePast = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
      const receivables = [
        ['INV-PIU-2026-001', 'BPJS Kesehatan Cabang Makassar', 'BPJS', 'Klaim pelayanan rawat jalan & obat periode berjalan', 18500000, 10000000, dueFuture, 'PARTIAL', 'Termin 1 sudah cair'],
        ['INV-PIU-2026-002', 'PT Asuransi Mandiri Medika', 'INSURANCE', 'Tagihan tindakan medis & laboratorium peserta korporat', 7400000, 0, dueFuture, 'UNPAID', 'Menunggu verifikasi berkas'],
        ['INV-PIU-2026-003', 'Ahmad Fauzi (Pasien Umum)', 'PATIENT', 'Cicilan biaya pemeriksaan diagnostik lanjutan', 2250000, 750000, duePast, 'OVERDUE', 'Perlu pengingat penagihan'],
        ['INV-PIU-2026-004', 'Klinik Mitra Husada', 'CORPORATE', 'Rujukan pemeriksaan laboratorium kerjasama', 4500000, 4500000, duePast, 'PAID', 'Lunas via transfer bank'],
      ];
      for (const rec of receivables) {
        await client.query(
          `INSERT INTO accounts_receivable (invoice_number, debtor_name, debtor_type, description, total_amount, paid_amount, due_date, status, notes, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (invoice_number) DO NOTHING`,
          [...rec, admin.id]
        );
      }

      const nextSixMonths = new Date(now.getFullYear(), now.getMonth() + 6, 15).toISOString().slice(0, 10);
      const maints = [
        ['ALT-RAD-01', 'Mesin USG 4D Mindray DC-70', 'Poli Penyakit Dalam', 'CALIBRATION', mkDate(currentMonth, 6), nextSixMonths, 'PT Global Medika Teknik', 2400000, 'COMPLETED', 'Kalibrasi tahunan sensor & probe'],
        ['ALT-GIG-02', 'Dental Unit Gnatus S300', 'Poli Gigi & Mulut', 'REPAIR', mkDate(currentMonth, 14), nextSixMonths, 'CV Karya Dental Servis', 1850000, 'COMPLETED', 'Penggantian selang suction & handpiece'],
        ['ALT-LAB-03', 'Hematology Analyzer Sysmex XN', 'Laboratorium', 'PREVENTIVE', mkDate(currentMonth, 24), nextSixMonths, 'PT Sysmex Indonesia', 1500000, 'SCHEDULED', 'Pembersihan optik & kontrol reagen'],
        ['ALT-MAT-04', 'Slit Lamp Biomicroscope Topcon', 'Poli Mata', 'CALIBRATION', mkDate(prevMonth, 19), nextSixMonths, 'PT Optik Medis Nusantara', 1200000, 'COMPLETED', 'Kalibrasi lensa okuler'],
      ];
      for (const m of maints) {
        await client.query(
          `INSERT INTO equipment_maintenances (equipment_code, equipment_name, department, maintenance_type, maintenance_date, next_maintenance_date, vendor_name, cost, status, notes, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [...m, admin.id]
        );
      }

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity, metadata)
         VALUES ($1, 'SEED_OPERATIONAL_REPORTS', 'operational_reports', $2)`,
        [admin.id, JSON.stringify({ period: currentMonth })]
      );

      return { seeded: true };
    });

    return { success: true, data: result, message: 'Data sampel laporan operasional berhasil dimuat.' };
  } catch (err) {
    return toServiceErrorResult('seedSampleOperationalData', err);
  }
}
