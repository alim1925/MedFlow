import { z } from 'zod';

// ============================================================================
// 1. Auth Schemas
// ============================================================================

export const loginSchema = z.object({
  email: z.string().trim().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Format email tidak valid'),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(1, 'Token reset kata sandi tidak valid'),
    password: z.string().min(8, 'Kata sandi baru minimal 8 karakter'),
    confirmPassword: z.string().min(1, 'Konfirmasi kata sandi wajib diisi'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Konfirmasi kata sandi tidak cocok',
    path: ['confirmPassword'],
  });

export const registerSchema = z.object({
  email: z.string().trim().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  full_name: z.string().trim().min(2, 'Nama lengkap minimal 2 karakter'),
  nik: z.string().trim().regex(/^\d{16}$/, 'NIK harus tepat 16 digit angka'),
  birth_date: z.string().min(1, 'Tanggal lahir wajib diisi'),
  gender: z.enum(['L', 'P'], { required_error: 'Pilih jenis kelamin (L/P)' }),
  phone: z.string().trim().min(10, 'Nomor telepon minimal 10 digit'),
  address: z.string().trim().optional(),
  blood_type: z.string().trim().optional(),
  emergency_contact: z.string().trim().optional(),
  allergies: z.string().trim().optional(),
});

// ============================================================================
// 2. Appointment Booking Schema (4-Step Wizard)
// ============================================================================

export const bookingSchema = z.object({
  poli_id: z.string().uuid('Poli tidak valid'),
  doctor_id: z.string().uuid('Dokter tidak valid'),
  schedule_id: z.string().uuid('Jadwal dokter tidak valid'),
  appointment_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  slot_start: z.string().min(1, 'Waktu slot wajib dipilih'),
  complaint: z.string().trim().min(5, 'Keluhan utama minimal 5 karakter'),
});

// ============================================================================
// 3. Medical Record & Addendum Schemas (Locked records per BR-04, BR-05)
// ============================================================================

export const vitalSignsSchema = z.object({
  systolic: z.union([z.number(), z.string()]).optional(),
  diastolic: z.union([z.number(), z.string()]).optional(),
  heart_rate: z.union([z.number(), z.string()]).optional(),
  temperature: z.union([z.number(), z.string()]).optional(),
  respiratory_rate: z.union([z.number(), z.string()]).optional(),
  weight: z.union([z.number(), z.string()]).optional(),
  height: z.union([z.number(), z.string()]).optional(),
}).optional();

export const medicalRecordSchema = z.object({
  appointment_id: z.string().uuid('ID janji temu tidak valid'),
  patient_id: z.string().uuid('ID pasien tidak valid'),
  doctor_id: z.string().uuid('ID dokter tidak valid'),
  complaint: z.string().trim().optional(),
  vital_signs: vitalSignsSchema,
  diagnosis: z.string().trim().min(3, 'Diagnosis wajib diisi minimal 3 karakter'),
  icd10_code: z.string().trim().optional(),
  treatment: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export const addendumSchema = z.object({
  medical_record_id: z.string().uuid('ID rekam medis tidak valid'),
  doctor_id: z.string().uuid('ID dokter tidak valid'),
  note: z.string().trim().min(3, 'Catatan addendum minimal 3 karakter'),
});

// ============================================================================
// 4. Prescription & Item Schemas
// ============================================================================

export const prescriptionItemSchema = z.object({
  medicine_id: z.string().uuid('Obat tidak valid'),
  quantity: z.number().int().positive('Jumlah obat harus lebih dari 0'),
  dosage_rule: z.string().trim().min(1, 'Aturan pakai wajib diisi (misal: 3x1 setelah makan)'),
  duration_days: z.number().int().positive('Durasi hari harus berupa bilangan positif').optional(),
});

// ============================================================================
// 5. Practice Schedule Schema
// ============================================================================

export const scheduleSchema = z.object({
  doctor_id: z.string().uuid('ID dokter tidak valid'),
  day_of_week: z.number().int().min(0).max(6, 'Hari harus antara 0 (Minggu) - 6 (Sabtu)'),
  start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Format waktu mulai tidak valid (HH:MM)'),
  end_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Format waktu selesai tidak valid (HH:MM)'),
  slot_minutes: z.number().int().min(5).max(120).default(15),
  is_active: z.boolean().default(true),
});

// ============================================================================
// 6. Master Data Schemas: Medicines, Polis, Doctors
// ============================================================================

export const medicineSchema = z.object({
  code: z.string().trim().min(2, 'Kode obat minimal 2 karakter'),
  name: z.string().trim().min(2, 'Nama obat minimal 2 karakter'),
  description: z.string().trim().optional().nullable(),
  medicine_type: z.enum(['BIASA', 'KERAS']).default('BIASA'),
  category: z.string().trim().min(1, 'Kategori obat wajib diisi'),
  form: z.string().trim().min(1, 'Bentuk obat wajib diisi'),
  unit: z.string().trim().min(1, 'Satuan obat wajib diisi'),
  stock: z.number().int().min(0, 'Stok tidak boleh bernilai negatif'),
  min_stock: z.number().int().min(0, 'Batas minimum stok tidak boleh negatif').default(0),
  is_active: z.boolean().default(true),
});

export const poliSchema = z.object({
  name: z.string().trim().min(2, 'Nama poli minimal 2 karakter'),
  description: z.string().trim().optional(),
  icon: z.string().trim().optional(),
  is_active: z.boolean().default(true),
});

export const doctorSchema = z.object({
  user_id: z.string().uuid('User ID tidak valid').optional(),
  poli_id: z.string().uuid('Poli tidak valid'),
  full_name: z.string().trim().min(2, 'Nama dokter minimal 2 karakter'),
  str_number: z.string().trim().min(5, 'Nomor STR minimal 5 karakter'),
  bio: z.string().trim().optional(),
  photo_url: z.string().trim().optional(),
  is_active: z.boolean().default(true),
});

// ============================================================================
// 7. Feedback Schema
// ============================================================================

export const feedbackSchema = z.object({
  appointment_id: z.string().uuid('ID janji temu tidak valid'),
  rating: z.number().int().min(1).max(5, 'Rating harus bernilai 1 sampai 5'),
  comment: z.string().trim().optional(),
});

// ============================================================================
// 8. Operational & Financial Reports Schemas
// ============================================================================

export const revenueSchema = z.object({
  reference_no: z.string().trim().optional(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  category: z.enum(['POLI_SERVICE', 'PHARMACY', 'LABORATORY', 'ADMINISTRATION', 'OTHER'], {
    errorMap: () => ({ message: 'Kategori pendapatan tidak valid' }),
  }),
  description: z.string().trim().min(3, 'Deskripsi pendapatan minimal 3 karakter'),
  amount: z.number().min(0, 'Nominal pendapatan tidak boleh negatif'),
  payment_method: z.enum(['CASH', 'TRANSFER', 'QRIS', 'BPJS', 'INSURANCE']).default('CASH'),
  notes: z.string().trim().optional(),
});

export const expenseSchema = z.object({
  reference_no: z.string().trim().optional(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  category: z.enum(['MEDICINE_PURCHASE', 'UTILITIES', 'MEDICAL_SUPPLIES', 'FACILITY', 'ADMINISTRATION', 'OTHER'], {
    errorMap: () => ({ message: 'Kategori pengeluaran tidak valid' }),
  }),
  description: z.string().trim().min(3, 'Deskripsi pengeluaran minimal 3 karakter'),
  amount: z.number().min(0, 'Nominal pengeluaran tidak boleh negatif'),
  vendor: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export const payrollSchema = z.object({
  employee_name: z.string().trim().min(2, 'Nama pegawai/dokter wajib diisi'),
  doctor_id: z.string().uuid().optional().nullable(),
  role_title: z.string().trim().min(2, 'Jabatan/profesi wajib diisi'),
  period_month: z.string().regex(/^\d{4}-\d{2}$/, 'Format periode gaji harus YYYY-MM'),
  base_salary: z.number().min(0, 'Gaji pokok tidak boleh negatif'),
  allowance: z.number().min(0, 'Tunjangan tidak boleh negatif').default(0),
  deduction: z.number().min(0, 'Potongan tidak boleh negatif').default(0),
  status: z.enum(['PENDING', 'PAID']).default('PENDING'),
  notes: z.string().trim().optional(),
});

export const receivableSchema = z.object({
  invoice_number: z.string().trim().min(3, 'Nomor tagihan minimal 3 karakter'),
  debtor_name: z.string().trim().min(2, 'Nama debitur/penjamin wajib diisi'),
  debtor_type: z.enum(['PATIENT', 'BPJS', 'INSURANCE', 'CORPORATE']).default('PATIENT'),
  patient_id: z.string().uuid().optional().nullable(),
  description: z.string().trim().optional(),
  total_amount: z.number().positive('Total tagihan harus lebih besar dari 0'),
  paid_amount: z.number().min(0, 'Jumlah terbayar tidak boleh negatif').default(0),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format jatuh tempo harus YYYY-MM-DD'),
  status: z.enum(['UNPAID', 'PARTIAL', 'PAID', 'OVERDUE']).optional(),
  notes: z.string().trim().optional(),
});

export const receivablePaymentSchema = z.object({
  payment_amount: z.number().positive('Nominal pembayaran harus lebih besar dari 0'),
  payment_method: z.enum(['CASH', 'TRANSFER', 'QRIS', 'BPJS', 'INSURANCE']).default('TRANSFER'),
  record_as_revenue: z.boolean().default(true),
  notes: z.string().trim().optional(),
});

export const maintenanceSchema = z.object({
  equipment_code: z.string().trim().min(2, 'Kode alat medis wajib diisi'),
  equipment_name: z.string().trim().min(2, 'Nama alat medis wajib diisi'),
  department: z.string().trim().optional(),
  maintenance_type: z.enum(['PREVENTIVE', 'CALIBRATION', 'REPAIR']).default('PREVENTIVE'),
  maintenance_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal pemeliharaan harus YYYY-MM-DD'),
  next_maintenance_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')).nullable(),
  vendor_name: z.string().trim().optional(),
  cost: z.number().min(0, 'Biaya pemeliharaan tidak boleh negatif').default(0),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED']).default('SCHEDULED'),
  notes: z.string().trim().optional(),
});

// ============================================================================
// 9. Self-Service Profile Update Schemas (Patient & Doctor)
// ============================================================================

export const patientProfileUpdateSchema = z.object({
  full_name: z.string().trim().min(2, 'Nama lengkap minimal 2 karakter'),
  nik: z
    .string()
    .trim()
    .regex(/^\d{16}$/, 'NIK harus tepat 16 digit angka')
    .optional()
    .or(z.literal(''))
    .nullable(),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal lahir harus YYYY-MM-DD'),
  gender: z.enum(['L', 'P'], { required_error: 'Pilih jenis kelamin (L/P)' }),
  blood_type: z.string().trim().max(5, 'Golongan darah maksimal 5 karakter').optional().nullable(),
  phone: z.string().trim().min(8, 'Nomor telepon minimal 8 digit').optional().or(z.literal('')).nullable(),
  address: z.string().trim().optional().nullable(),
  emergency_contact: z.string().trim().optional().nullable(),
  allergies: z.string().trim().optional().nullable(),
});

export const doctorProfileUpdateSchema = z.object({
  full_name: z.string().trim().min(2, 'Nama lengkap minimal 2 karakter'),
  str_number: z.string().trim().min(5, 'Nomor STR minimal 5 karakter'),
  phone: z.string().trim().max(30, 'Nomor telepon maksimal 30 karakter').optional().nullable(),
  bio: z.string().trim().optional().nullable(),
  photo_url: z.string().trim().optional().nullable(),
});

// ============================================================================
// 10. Equipment Damage Report Schema (Doctor)
// ============================================================================

export const equipmentDamageReportSchema = z.object({
  equipment_code: z.string().trim().min(2, 'Kode alat medis minimal 2 karakter'),
  equipment_name: z.string().trim().min(2, 'Nama alat medis minimal 2 karakter'),
  department: z.string().trim().optional().nullable(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  reported_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  description: z.string().trim().min(5, 'Deskripsi kerusakan minimal 5 karakter'),
});
