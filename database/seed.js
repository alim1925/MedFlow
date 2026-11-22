'use strict';


const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://postgres:alim123@localhost:5432/db_medflow',
});

async function seed() {
  const client = await pool.connect();
  console.log('🚀 Connecting to PostgreSQL and starting MedFlow HMIS database seed...');

  try {
    // 1. Run schema.sql to ensure all types and tables exist
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log('📜 Executing schema.sql DDL...');
    await client.query(schemaSql);
    console.log('✅ Schema DDL applied successfully.');

    // 2. BEGIN Transaction
    await client.query('BEGIN');

    // 3. Seed Admin User
    console.log('👤 Seeding Admin user...');
    const adminPasswordHash = bcrypt.hashSync('Admin123!', 10);
    const adminUserRes = await client.query(
      `INSERT INTO users (email, password_hash, role, is_active)
       VALUES ($1, $2, 'ADMIN', true)
       ON CONFLICT (email) DO UPDATE
       SET password_hash = $2, role = 'ADMIN', is_active = true
       RETURNING id, email, role;`,
      ['admin@medflow.com', adminPasswordHash]
    );
    const adminUserId = adminUserRes.rows[0].id;
    console.log(`✅ Admin user seeded: ${adminUserRes.rows[0].email} (ID: ${adminUserId})`);

    // 4. Seed 5 Polis
    console.log('🏥 Seeding 5 Polis...');
    const polisData = [
      {
        name: 'Poli Umum',
        description: 'Pelayanan kesehatan umum untuk berbagai keluhan medis dan konsultasi preventif menyeluruh.',
        icon: 'Stethoscope',
      },
      {
        name: 'Poli Gigi & Mulut',
        description: 'Pemeriksaan kesehatan gigi, scaling pembersihan karang, penambalan, dan perawatan estetik.',
        icon: 'Smile',
      },
      {
        name: 'Poli Anak',
        description: 'Layanan kesehatan spesialis anak (pediatrik), pemantauan tumbuh kembang, dan imunisasi berkala.',
        icon: 'Baby',
      },
      {
        name: 'Poli Penyakit Dalam',
        description: 'Penanganan penyakit organ dalam komprehensif: diabetes melitus, hipertensi, metabolik, dan ginjal.',
        icon: 'HeartPulse',
      },
      {
        name: 'Poli Mata',
        description: 'Pemeriksaan ketajaman penglihatan, screening refraksi dan katarak, serta terapi kesehatan mata.',
        icon: 'Eye',
      },
    ];

    const poliMap = {};
    for (const p of polisData) {
      const res = await client.query(
        `INSERT INTO polis (name, description, icon, is_active)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (name) DO UPDATE SET description = $2, icon = $3, is_active = true
         RETURNING id, name;`,
        [p.name, p.description, p.icon]
      );
      poliMap[p.name] = res.rows[0].id;
    }
    console.log('✅ 5 Polis seeded successfully.');

    // 5. Seed 5 Doctors (Users + Profiles + Practice Schedules)
    console.log('👨‍⚕️ Seeding 5 Doctors & Schedules...');
    const doctorPasswordHash = bcrypt.hashSync('Doctor123!', 10);
    const doctorsData = [
      {
        email: 'dr.budi@medflow.com',
        fullName: 'Dr. Budi Santoso, Sp.PD',
        str: 'STR-PD-0019283',
        poliName: 'Poli Penyakit Dalam',
        bio: 'Spesialis Penyakit Dalam senior dengan pengalaman klinis lebih dari 12 tahun dalam manajemen diabetes, hipertensi, dan penyakit ginjal.',
        photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=drbudi',
      },
      {
        email: 'dr.siti@medflow.com',
        fullName: 'Dr. Siti Rahma, Sp.A',
        str: 'STR-AN-0028471',
        poliName: 'Poli Anak',
        bio: 'Spesialis Anak berdedikasi tinggi, berfokus pada nutrisi anak, imunisasi, dan penanganan gangguan tumbuh kembang pediatrik.',
        photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=drsiti',
      },
      {
        email: 'dr.andi@medflow.com',
        fullName: 'Dr. Andi Wijaya, Sp.M',
        str: 'STR-MT-0039182',
        poliName: 'Poli Mata',
        bio: 'Spesialis Mata terkemuka dengan keahlian dalam bedah refraksi, screening retina diabetik, dan manajemen glaukoma.',
        photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=drandi',
      },
      {
        email: 'drg.maya@medflow.com',
        fullName: 'Drg. Maya Kartika',
        str: 'STR-GG-0048192',
        poliName: 'Poli Gigi & Mulut',
        bio: 'Dokter Gigi ramah dengan spesialisasi perawatan konservasi gigi, estetik dental, dan bedah minor mulut.',
        photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=drgmaya',
      },
      {
        email: 'dr.hendra@medflow.com',
        fullName: 'Dr. Hendra Pratama',
        str: 'STR-UM-0059281',
        poliName: 'Poli Umum',
        bio: 'Dokter Umum berkompetensi tinggi yang berfokus pada pencegahan penyakit, diagnosis cepat, dan penanganan primer komprehensif.',
        photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=drhendra',
      },
    ];

    for (const doc of doctorsData) {
      // Create user account
      const userRes = await client.query(
        `INSERT INTO users (email, password_hash, role, is_active)
         VALUES ($1, $2, 'DOCTOR', true)
         ON CONFLICT (email) DO UPDATE SET password_hash = $2, is_active = true
         RETURNING id;`,
        [doc.email, doctorPasswordHash]
      );
      const doctorUserId = userRes.rows[0].id;
      const poliId = poliMap[doc.poliName];

      // Create doctor profile
      const docRes = await client.query(
        `INSERT INTO doctors (user_id, poli_id, full_name, str_number, bio, photo_url, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         ON CONFLICT (str_number) DO UPDATE SET
            user_id = $1, poli_id = $2, full_name = $3, bio = $5, photo_url = $6, is_active = true
         RETURNING id;`,
        [doctorUserId, poliId, doc.fullName, doc.str, doc.bio, doc.photoUrl]
      );
      const doctorId = docRes.rows[0].id;

      // Seed standard schedules: Monday to Friday (1 to 5)
      // Morning shift: 08:00 - 12:00, Afternoon shift: 13:00 - 16:00
      for (let day = 1; day <= 5; day++) {
        // Morning
        await client.query(
          `INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_minutes, is_active)
           SELECT $1, $2, '08:00:00', '12:00:00', 20, true
           WHERE NOT EXISTS (
             SELECT 1 FROM doctor_schedules 
             WHERE doctor_id = $1 AND day_of_week = $2 AND start_time = '08:00:00'
           );`,
          [doctorId, day]
        );
        // Afternoon
        await client.query(
          `INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_minutes, is_active)
           SELECT $1, $2, '13:00:00', '16:00:00', 20, true
           WHERE NOT EXISTS (
             SELECT 1 FROM doctor_schedules 
             WHERE doctor_id = $1 AND day_of_week = $2 AND start_time = '13:00:00'
           );`,
          [doctorId, day]
        );
      }
    }
    console.log('✅ 5 Doctors and practice schedules seeded.');

    // 6. Seed 1 Patient User
    console.log('🧑 Seeding Patient user & medical profile...');
    const patientPasswordHash = bcrypt.hashSync('Patient123!', 10);
    const patientUserRes = await client.query(
      `INSERT INTO users (email, password_hash, role, is_active)
       VALUES ($1, $2, 'PATIENT', true)
       ON CONFLICT (email) DO UPDATE SET password_hash = $2, is_active = true
       RETURNING id;`,
      ['patient@medflow.com', patientPasswordHash]
    );
    const patientUserId = patientUserRes.rows[0].id;

    await client.query(
      `INSERT INTO patients (
         user_id, medical_record_no, full_name, nik, birth_date,
         gender, blood_type, phone, address, emergency_contact, allergies
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (user_id) DO UPDATE SET
         medical_record_no = $2, full_name = $3, nik = $4, birth_date = $5,
         gender = $6, blood_type = $7, phone = $8, address = $9, emergency_contact = $10, allergies = $11;`,
      [
        patientUserId,
        'RM-2026-0001',
        'Ahmad Fauzi',
        '3171012304900001',
        '1990-04-23',
        'L',
        'O',
        '081234567890',
        'Jl. Senopati No. 42, Kebayoran Baru, Jakarta Selatan',
        'Nurul (Istri) - 081298765432',
        'Penicillin',
      ]
    );
    console.log('✅ Patient user (patient@medflow.com / Patient123!) seeded.');

    // 7. Seed 15 Medicines & Initial Stock Movements
    console.log('💊 Seeding 15 Medicines & Initial Stock...');
    const medicinesData = [
      {
        code: 'MED-001',
        name: 'Paracetamol 500mg',
        description: 'Pereda demam dan nyeri ringan hingga sedang (sakit kepala, nyeri otot).',
        medicineType: 'BIASA',
        category: 'Analgesik & Antipiretik',
        form: 'Tablet',
        unit: 'Tablet',
        stock: 500,
        minStock: 50,
      },
      {
        code: 'MED-002',
        name: 'Amoxicillin 500mg',
        description: 'Antibiotik spektrum luas golongan penisilin untuk infeksi bakteri; wajib resep dokter.',
        medicineType: 'KERAS',
        category: 'Antibiotik',
        form: 'Kapsul',
        unit: 'Kapsul',
        stock: 250,
        minStock: 30,
      },
      {
        code: 'MED-003',
        name: 'Ibuprofen 400mg',
        description: 'Obat antiinflamasi non-steroid untuk meredakan nyeri dan peradangan.',
        medicineType: 'BIASA',
        category: 'Anti-inflamasi Non-Steroid',
        form: 'Tablet',
        unit: 'Tablet',
        stock: 300,
        minStock: 40,
      },
      {
        code: 'MED-004',
        name: 'Omeprazole 20mg',
        description: 'Penghambat pompa proton untuk terapi tukak lambung dan GERD.',
        medicineType: 'KERAS',
        category: 'Antasida & PPI',
        form: 'Kapsul',
        unit: 'Kapsul',
        stock: 200,
        minStock: 25,
      },
      {
        code: 'MED-005',
        name: 'Cetirizine 10mg',
        description: 'Antihistamin untuk meredakan gejala alergi seperti rinitis dan urtikaria.',
        medicineType: 'BIASA',
        category: 'Antihistamin',
        form: 'Tablet',
        unit: 'Tablet',
        stock: 350,
        minStock: 30,
      },
      {
        code: 'MED-006',
        name: 'Metformin 500mg',
        description: 'Obat antidiabetes oral lini pertama untuk pengendalian gula darah diabetes tipe 2.',
        medicineType: 'KERAS',
        category: 'Antidiabetes Oral',
        form: 'Tablet',
        unit: 'Tablet',
        stock: 400,
        minStock: 50,
      },
      {
        code: 'MED-007',
        name: 'Amlodipine 10mg',
        description: 'Antihipertensi golongan Calcium Channel Blocker untuk tekanan darah tinggi.',
        medicineType: 'KERAS',
        category: 'Antihipertensi CCB',
        form: 'Tablet',
        unit: 'Tablet',
        stock: 300,
        minStock: 40,
      },
      {
        code: 'MED-008',
        name: 'Captopril 25mg',
        description: 'ACE inhibitor untuk terapi hipertensi dan gagal jantung; wajib pengawasan dokter.',
        medicineType: 'KERAS',
        category: 'Antihipertensi ACE-I',
        form: 'Tablet',
        unit: 'Tablet',
        stock: 180,
        minStock: 30,
      },
      {
        code: 'MED-009',
        name: 'Salbutamol 2mg',
        description: 'Bronkodilator untuk meredakan sesak napas akibat asma atau bronkospasme.',
        medicineType: 'KERAS',
        category: 'Bronkodilator',
        form: 'Tablet',
        unit: 'Tablet',
        stock: 150,
        minStock: 20,
      },
      {
        code: 'MED-010',
        name: 'Dexamethasone 0.5mg',
        description: 'Kortikosteroid sistemik untuk reaksi inflamasi berat dan alergi.',
        medicineType: 'KERAS',
        category: 'Kortikosteroid',
        form: 'Tablet',
        unit: 'Tablet',
        stock: 220,
        minStock: 25,
      },
      {
        code: 'MED-011',
        name: 'Antasida Doen Sirup 60ml',
        description: 'Menetralkan asam lambung untuk mengatasi maag, mual, dan nyeri ulu hati.',
        medicineType: 'BIASA',
        category: 'Antasida Lambung',
        form: 'Sirup',
        unit: 'Botol',
        stock: 90,
        minStock: 15,
      },
      {
        code: 'MED-012',
        name: 'Oralit 200ml',
        description: 'Larutan rehidrasi oral untuk mengganti cairan dan elektrolit saat diare.',
        medicineType: 'BIASA',
        category: 'Rehidrasi Elektrolit',
        form: 'Serbuk',
        unit: 'Sachet',
        stock: 450,
        minStock: 50,
      },
      {
        code: 'MED-013',
        name: 'Vitamin C 500mg',
        description: 'Suplemen asam askorbat untuk membantu menjaga daya tahan tubuh.',
        medicineType: 'BIASA',
        category: 'Suplemen & Vitamin',
        form: 'Tablet',
        unit: 'Tablet',
        stock: 600,
        minStock: 60,
      },
      {
        code: 'MED-014',
        name: 'Ciprofloxacin 500mg',
        description: 'Antibiotik kuinolon untuk infeksi saluran kemih, pernapasan, dan pencernaan.',
        medicineType: 'KERAS',
        category: 'Antibiotik Kuinolon',
        form: 'Tablet',
        unit: 'Tablet',
        stock: 120,
        minStock: 20,
      },
      {
        code: 'MED-015',
        name: 'Simvastatin 20mg',
        description: 'Obat penurun kadar kolesterol LDL dan trigliserida dalam darah.',
        medicineType: 'KERAS',
        category: 'Hipolipidemik / Kolesterol',
        form: 'Tablet',
        unit: 'Tablet',
        stock: 250,
        minStock: 30,
      },
    ];

    for (const med of medicinesData) {
      const medRes = await client.query(
        `INSERT INTO medicines (code, name, description, medicine_type, category, form, unit, stock, min_stock, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
         ON CONFLICT (code) DO UPDATE SET
           name = $2, description = $3, medicine_type = $4, category = $5, form = $6, unit = $7, stock = $8, min_stock = $9, is_active = true
         RETURNING id, stock;`,
        [med.code, med.name, med.description, med.medicineType, med.category, med.form, med.unit, med.stock, med.minStock]
      );
      const medicineId = medRes.rows[0].id;

      // Seed initial stock movement if none exists
      await client.query(
        `INSERT INTO stock_movements (medicine_id, type, quantity, balance_after, created_by)
         SELECT $1, 'IN', $2, $2, $3
         WHERE NOT EXISTS (
           SELECT 1 FROM stock_movements WHERE medicine_id = $1
         );`,
        [medicineId, med.stock, adminUserId]
      );
    }
    console.log('✅ 15 Medicines seeded with initial stock movements.');

    // 7b. Seed Operational & Financial Sample Data (if tables are empty)
    console.log('📊 Seeding sample operational & financial records...');
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevDateObj = new Date(now.getFullYear(), now.getMonth() - 1, 15);
    const prevMonth = `${prevDateObj.getFullYear()}-${String(prevDateObj.getMonth() + 1).padStart(2, '0')}`;
    const mkDate = (ym, day) => `${ym}-${String(day).padStart(2, '0')}`;

    const revCount = await client.query('SELECT COUNT(*)::int AS count FROM operational_revenues');
    if ((revCount.rows[0]?.count || 0) === 0) {
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
          [...r, adminUserId]
        );
      }
    }

    const expCount = await client.query('SELECT COUNT(*)::int AS count FROM operational_expenses');
    if ((expCount.rows[0]?.count || 0) === 0) {
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
          [...e, adminUserId]
        );
      }
    }

    const payCount = await client.query('SELECT COUNT(*)::int AS count FROM staff_payrolls');
    if ((payCount.rows[0]?.count || 0) === 0) {
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
          [p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], adminUserId]
        );
      }
    }

    const recCount = await client.query('SELECT COUNT(*)::int AS count FROM accounts_receivable');
    if ((recCount.rows[0]?.count || 0) === 0) {
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
          [...rec, adminUserId]
        );
      }
    }

    const maintCount = await client.query('SELECT COUNT(*)::int AS count FROM equipment_maintenances');
    if ((maintCount.rows[0]?.count || 0) === 0) {
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
          [...m, adminUserId]
        );
      }
    }
    console.log('✅ Operational & financial sample records seeded.');

    // 8. COMMIT Transaction
    await client.query('COMMIT');
    console.log('\n✨ Database seeding completed successfully!');
    console.log('📋 Default Credentials Summary:');
    console.log('   - Admin:   admin@medflow.com   / Admin123!');
    console.log('   - Doctor:  dr.budi@medflow.com / Doctor123!');
    console.log('   - Patient: patient@medflow.com / Patient123!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error during seeding, transaction rolled back:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
