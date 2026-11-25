# MedFlow HMIS

**MedFlow HMIS** (*Hospital Management Information System*) — *"One System, Seamless Healthcare."* — adalah aplikasi web manajemen layanan rumah sakit/klinik rawat jalan terintegrasi berbasis **Next.js (App Router)** dan **PostgreSQL**.

Aplikasi ini menghubungkan **Pasien**, **Dokter**, **Farmasi**, dan **Administrator** dalam satu platform mulai dari reservasi jadwal dokter online, pemeriksaan & rekam medis elektronik, peresepan & pembayaran obat, hingga laporan operasional dan keuangan rumah sakit.

---

## Daftar Isi

- [Teknologi yang Digunakan](#teknologi-yang-digunakan)
- [Fitur Utama](#fitur-utama)
- [Struktur Proyek](#struktur-proyek)
- [Prasyarat](#prasyarat)
- [Cara Instalasi & Menjalankan](#cara-instalasi--menjalankan)
- [Akun Demo (Hasil Seed)](#akun-demo-hasil-seed)
- [Panduan Penggunaan](#panduan-penggunaan)
- [Skrip NPM](#skrip-npm)

---

## Teknologi yang Digunakan

- **Framework**: Next.js 16 (App Router, Route Handlers, `src/proxy.js` RBAC)
- **UI & Styling**: React 19, Tailwind CSS 4, Lucide React
- **Database**: PostgreSQL (`pg`)
- **Keamanan & Autentikasi**:
  - Cookie sesi HTTP-only bertanda tangan JWT (`jose`)
  - Hashing kata sandi menggunakan `bcryptjs`
  - Validasi skema input menggunakan `zod`

---

## Fitur Utama

### 1. Akses Publik / Tamu (Tanpa Login)
- **Beranda MedFlow (`/`)**: Informasi layanan rumah sakit, daftar poliklinik, dan dokter.
- **Direktori Poliklinik (`/polis`)**: Menjelajahi layanan poliklinik aktif beserta deskripsinya.
- **Direktori Dokter (`/doctors`)**: Melihat daftar dokter spesialis, nomor STR, poliklinik, dan jadwal praktik.
- **Mode Tamu**: Pengunjung dapat menjelajahi layanan klinik dan jadwal dokter tanpa login melalui tombol *Lanjutkan sebagai Tamu*.
- **Panel Aksesibilitas**: Tombol aksesibilitas mengambang di pojok kanan bawah untuk mengaktifkan mode **Teks Besar** dan **Kontras Tinggi** (tersimpan di `localStorage`).

### 2. Autentikasi & Pemulihan Akun
- **Masuk Multi-Peran (`/login`)**: Pengalihan otomatis ke dashboard sesuai peran (`PATIENT`, `DOCTOR`, `ADMIN`).
- **Registrasi Pasien Baru (`/register`)**: Formulir 2 langkah (Informasi Akun & Data Diri KTP) dengan validasi NIK 16 digit dan pembuatan **Nomor Rekam Medis (No. RM)** otomatis (`MRYYYYXXXXXX`).
  - Pengguna memasukkan **alamat email terdaftar** dan **tanggal lahir pemilik akun**.

### 3. Portal Pasien (`/patient/*`)
- **Dashboard (`/patient/dashboard`)**: Ringkasan janji temu mendatang, statistik kunjungan, dan pintasan layanan.
- **Dokter & Jadwal (`/patient/doctors`)**: Melihat profil dokter dan jadwal praktik yang tersedia.
- **Booking Janji Temu 4 Langkah (`/patient/booking`)**:
  1. Pilih Poliklinik
  2. Pilih Dokter
  3. Pilih Tanggal & Slot Waktu (mencegah bentrok jadwal / *double-booking*)
  4. Isi Keluhan Utama & Konfirmasi
- **Janji Temu (`/patient/appointments`)**: Pantau status janji (`PENDING`, `CONFIRMED`, `COMPLETED`, dll.), batalkan janji, dan berikan **rating & ulasan** (1–5 bintang) setelah pemeriksaan selesai.
- **Rekam Medis Digital (`/patient/records`)**: Melihat riwayat diagnosis, tanda vital, tindakan, addendum dokter, serta **cetak / unduh PDF Bukti Konsultasi** (`/medical-records/[id]/print`).
- **Resep Obat & Pembayaran (`/patient/prescriptions`)**: Melihat daftar resep, rincian harga obat, status penyiapan farmasi, serta mengajukan pembayaran (`TRANSFER`, `QRIS`, `CASH`, `BPJS`).
- **Pesan & Notifikasi (`/patient/messages`)**: Kotak masuk notifikasi status janji temu, farmasi, dan pembayaran dengan penanda belum dibaca.
- **Profil Saya (`/patient/profile`)**: Mengelola data pribadi, NIK, tanggal lahir, golongan darah, alergi, alamat, dan kontak darurat.

### 4. Portal Dokter (`/doctor/*`)
- **Dashboard (`/doctor/dashboard`)**: Ringkasan antrean pemeriksaan hari ini dan permintaan janji temu baru.
- **Jadwal Praktik (`/doctor/schedules`)**: Menambah, melihat, dan menghapus jadwal praktik mingguan beserta durasi slot konsultasi.
- **Validasi Janji Temu (`/doctor/appointments`)**: Mengonfirmasi atau menolak janji temu pasien (beserta alasan penolakan).
- **Pemeriksaan & Rekam Medis (`/doctor/examinations`, `/doctor/exam/[appointmentId]`)**:
  - Mengisi keluhan, tanda vital, diagnosis, kode ICD-10, tindakan, dan catatan medis.
  - Rekam medis bersifat terkunci (*immutable*) setelah disimpan; koreksi atau tambahan dicatat melalui **Addendum**.
  - Membuat **Resep Obat** langsung dari daftar obat rumah sakit (termasuk label obat `BIASA` / `KERAS`).
- **Laporan Kerusakan Alat Medis (`/doctor/equipment-reports`)**: Melaporkan kerusakan alat medis di poliklinik dan memantau status penanganannya.
- **Profil Dokter (`/doctor/profile`)**: Mengelola nama & gelar, nomor STR, tanggal lahir, nomor telepon, URL foto profil, dan biografi.

### 5. Portal Administrator (`/admin/*`)
- **Dashboard (`/admin/dashboard`)**: Statistik pasien, dokter aktif, janji temu hari ini, antrean resep, obat stok menipis, dan pembayaran menunggu konfirmasi.
- **Manajemen Pengguna (`/admin/users`)**: Mencari pengguna, memfilter peran, dan mengaktifkan/menonaktifkan akun.
- **Manajemen Poliklinik (`/admin/polis`)**: Menambah, mengubah, dan mengatur status aktif poliklinik.
- **Direktori Dokter (`/admin/doctors`)**: Mendaftarkan akun dokter baru (termasuk penempatan poli, nomor STR, dan tanggal lahir), mengedit profil, dan mengaktifkan/menonaktifkan dokter.
- **Obat & Stok (`/admin/medicines`)**: Mengelola katalog obat (`BIASA`/`KERAS`), harga, batas stok minimum, dan *restock* dengan pencatatan riwayat `stock_movements`.
- **Antrean Farmasi (`/admin/pharmacy`)**: Memproses status resep secara bertahap (`WAITING` → `PROCESSING` → `READY` → `PICKED_UP` atau `CANCELLED`).
- **Pembayaran Obat (`/admin/payments`)**: Memverifikasi, mengonfirmasi (`PAID`), atau menolak (`REJECTED`) bukti pembayaran resep pasien.
- **Semua Janji Temu (`/admin/appointments`)**: Memantau dan mengelola seluruh jadwal kunjungan pasien.
- **Laporan Operasional & Keuangan (`/admin/reports`)**:
  - Ringkasan **Laba Rugi**
  - Pencatatan **Pendapatan Operasional** & **Pengeluaran Operasional**
  - Manajemen **Gaji Dokter & Staf (*Payroll*)**
  - Manajemen **Piutang (*Accounts Receivable*)**
  - Jadwal & riwayat **Pemeliharaan Alat Medis**
- **Audit Log (`/admin/audit-logs`)**: Memantau log aktivitas sistem (login, registrasi, reset sandi, perubahan data medis/farmasi, dll.) lengkap dengan filter dan inspeksi metadata `JSONB`.

---

## Struktur Proyek

```text
medflow/
├── database/
│   ├── schema.sql          # Skema lengkap tabel PostgreSQL, enum, indeks, dan trigger
│   └── seed.js             # Skrip inisialisasi skema & data awal (admin, dokter, pasien, obat, laporan)
├── public/                 # Aset publik statis
├── src/
│   ├── proxy.js            # Proteksi rute berbasis peran (RBAC) & manajemen sesi JWT
│   ├── app/
│   │   ├── (public)/       # Halaman publik (/polis, /doctors)
│   │   ├── (auth)/         # Login, Register, Lupa Sandi, Reset Sandi
│   │   ├── (patient)/      # Halaman portal pasien
│   │   ├── (doctor)/       # Halaman portal dokter
│   │   ├── (admin)/        # Halaman portal admin & farmasi
│   │   ├── medical-records/# Halaman cetak bukti konsultasi
│   │   └── api/            # Next.js API Route Handlers (auth, public, patient, doctor, pharmacy, admin)
│   ├── components/         # Komponen UI bersama (Sidebar, Navbar, StatusBadge, dll.)
│   ├── lib/                # Utilitas DB, auth JWT, validator Zod, PDF generator, helper
│   └── services/           # Layer logika bisnis & query database
├── next.config.mjs
└── package.json
```

---

## Prasyarat

Pastikan perangkat Anda sudah terpasang:
- **Node.js** versi 18 atau lebih baru (disarankan Node.js 20+)
- **npm** (bawaan Node.js)
- **PostgreSQL** (disarankan versi 14+) yang sedang berjalan di komputer lokal/server

---

## Cara Instalasi & Menjalankan

### 1. Clone Repository
```bash
git clone <url-repository-anda>
cd medflow
```

### 2. Install Dependensi
```bash
npm install
```

### 3. Siapkan Database PostgreSQL
Buat database baru di PostgreSQL dengan nama `db_medflow`:
```sql
CREATE DATABASE db_medflow;
```

> **Catatan Koneksi Database**:  
> Secara bawaan pada `src/lib/db.js` dan `database/seed.js`, aplikasi terhubung ke:
> `postgresql://postgres:sandi_anda@localhost:5432/db_medflow`  
> Jika username, password, host, atau port PostgreSQL lokal Anda berbeda, sesuaikan `connectionString` pada `src/lib/db.js` dan `database/seed.js` sebelum menjalankan seed.

### 4. Konfigurasi Environment Variable
Buat atau periksa file `.env.local` di root proyek:
```env
AUTH_SECRET=ganti-dengan-kunci-rahasia-minimal-32-karakter
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
*(Jika belum diisi, aplikasi tetap memiliki nilai fallback untuk pengembangan lokal.)*

### 5. Jalankan Skema & Seed Data Awal
Perintah ini akan mengeksekusi `database/schema.sql` dan mengisi data awal (Admin, 5 Poliklinik, 5 Dokter + Jadwal, 1 Pasien, 15 Obat, serta data contoh laporan operasional):
```bash
npm run db:seed
```

### 6. Jalankan Server Pengembangan
```bash
npm run dev
```
Buka browser dan akses **[http://localhost:3000](http://localhost:3000)**.

### 7. Build & Jalankan Mode Produksi (Opsional)
```bash
npm run build
npm run start
```

---

## Akun Demo (Hasil Seed)

Setelah menjalankan `npm run db:seed`, Anda dapat langsung masuk menggunakan akun berikut:

| Peran | Email | Kata Sandi | Tanggal Lahir (Untuk Lupa Sandi) |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@medflow.com` | `Admin123!` | `1985-01-15` |
| **Dokter** | `dr.budi@medflow.com` | `Doctor123!` | `1978-05-12` |
| **Dokter** | `dr.siti@medflow.com` | `Doctor123!` | `1984-08-17` |
| **Dokter** | `dr.andi@medflow.com` | `Doctor123!` | `1981-11-03` |
| **Dokter** | `drg.maya@medflow.com` | `Doctor123!` | `1989-02-28` |
| **Dokter** | `dr.hendra@medflow.com` | `Doctor123!` | `1992-07-19` |
| **Pasien** | `patient@medflow.com` | `Patient123!` | `1990-04-23` |

---

## Panduan Penggunaan

### Alur Pasien
1. **Daftar / Masuk**: Buka `/register` untuk membuat akun pasien baru (wajib mengisi NIK 16 digit dan tanggal lahir) atau masuk melalui `/login`.
2. **Booking Jadwal**: Masuk ke menu **Booking Janji**, pilih poliklinik, pilih dokter, tentukan tanggal serta slot jam yang tersedia, lalu tuliskan keluhan.
3. **Menunggu Konfirmasi**: Pantau status di menu **Janji Temu** atau notifikasi di menu **Pesan**.
4. **Setelah Pemeriksaan**: Buka **Rekam Medis** untuk melihat hasil diagnosis dan mencetak/mengunduh PDF bukti konsultasi.
5. **Tebus & Bayar Obat**: Buka **Resep Obat**, cek rincian biaya obat, lalu kirim informasi pembayaran agar dapat diverifikasi admin dan diproses oleh farmasi.
6. **Beri Ulasan**: Setelah janji temu berstatus selesai (`COMPLETED`), Anda dapat memberikan rating dan ulasan dokter.

### Alur Dokter
1. **Atur Jadwal**: Masuk ke menu **Jadwal Saya** untuk memastikan hari dan jam praktik aktif.
2. **Validasi Antrean**: Buka **Validasi Janji** untuk mengonfirmasi atau menolak permintaan janji temu pasien.
3. **Lakukan Pemeriksaan**: Pada menu **Pemeriksaan**, pilih janji temu terkonfirmasi, isi tanda vital, diagnosis, ICD-10, tindakan, dan tambahkan resep obat bila diperlukan.
4. **Addendum & Alat Medis**: Tambahkan addendum jika ada catatan susulan pada rekam medis yang sudah terkunci, atau laporkan kendala alat medis di menu **Lapor Alat Rusak**.

### Alur Admin & Farmasi
1. **Kelola Master Data**: Atur data poliklinik (`/admin/polis`), daftarkan dokter beserta tanggal lahirnya (`/admin/doctors`), dan kelola stok serta harga obat (`/admin/medicines`).
2. **Konfirmasi Pembayaran**: Periksa pembayaran resep yang masuk di menu **Pembayaran Obat** (`/admin/payments`).
3. **Proses Resep Farmasi**: Ubah status antrean resep di menu **Farmasi** (`/admin/pharmacy`) mulai dari *Menunggu* hingga *Sudah Diambil*.
4. **Monitoring & Keuangan**: Pantau ringkasan pendapatan, pengeluaran, gaji, piutang, pemeliharaan alat di **Laporan Operasional**, serta jejak aktivitas sistem di **Audit Log**.



## Skrip NPM

| Perintah | Deskripsi |
| :--- | :--- |
| `npm run dev` | Menjalankan server pengembangan Next.js |
| `npm run build` | Membuild aplikasi untuk produksi |
| `npm run start` | Menjalankan hasil build produksi |
| `npm run lint` | Menjalankan pemeriksaan ESLint |
| `npm run db:seed` | Menjalankan `database/schema.sql` dan mengisi data awal (`database/seed.js`) |
