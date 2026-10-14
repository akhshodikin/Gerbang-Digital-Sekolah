# GDS : Gerbang Digital Sekolah
## Sistem Absensi & Keamanan Gerbang Sekolah SDN Kandangan I Tosari
### Header Aplikasi: ABSENSI QR CODE SDN KANDANGAN I TOSARI

Aplikasi sistem informasi absensi dan kedisiplinan sekolah terpadu berbasis **Next.js App Router**, **TypeScript**, **Tailwind CSS**, **PostgreSQL**, dan **Drizzle ORM**.

---

### A. Identitas Sekolah
* **Nama Sekolah**: SDN Kandangan I Tosari
* **NPSN**: 20519101
* **Wilayah**: Kecamatan Tosari, Kabupaten Pasuruan, Jawa Timur, Indonesia
* **Zona Waktu**: Asia/Jakarta (WIB)
* **Kepala Sekolah**: Drs. Sutrisno, M.Pd (NIP. 196805121992031004)
* **Tema Visual**: Biru Tua (`#0F2744`), Biru Royal (`#1E3A8A`), Aksen Biru Muda (`#2563EB` & `#38BDF8`), Putih

---

### B. Arsitektur & Fitur Utama

1. **Autentikasi & Otorisasi Berbasis Sesi (4 Peran Pengguna)**:
   - **Admin**: Akses penuh manajemen sekolah, data induk, aturan kehadiran, terbit/cabut QR, audit log, WhatsApp gateway.
   - **Guru Piket**: Pemindaian QR di gerbang via kamera HP Android, pencatatan manual, monitoring siswa terlambat, laporan harian piket.
   - **Wali Kelas**: Pemantauan kelas binaan, persetujuan izin, catatan pembinaan edukatif, rekap kelas bertanda tangan.
   - **Wali Murid**: Akses eksklusif anak terverifikasi resmi (Anti-IDOR), riwayat kehadiran real-time, pengajuan izin & unggah surat dokter.

2. **Absensi QR Code Berkeamanan Tinggi**:
   - Token kriptografis acak (`crypto.randomBytes`) unik yang tidak membocorkan NIK/NIS siswa.
   - Waktu kehadiran divalidasi langsung di server Jakarta (WIB).
   - Pencegahan pemindaian ganda (*double-scan*) pada sesi yang sama.
   - Kamera belakang ponsel Android didukung penuh (*html5-qrcode*).
   - Pencarian alternatif berdasarkan NIS/Nama jika kartu rusak/tertinggal.
   - Pencetakan kartu fisik siswa & guru standar kartu identitas lengkap dengan barcode/QR.

3. **Workflow Perizinan Otomatis**:
   - Pengajuan oleh wali murid dengan lampiran berkas privat.
   - Persetujuan oleh wali kelas / admin.
   - Sinkronisasi otomatis ke tabel absensi (`IZIN` / `SAKIT`) sehingga siswa **tidak pernah keliru direkap sebagai ALPA**.

4. **Kedisiplinan & Bimbingan Konseling (Rahasia)**:
   - Pencatatan kejadian faktual dan bermartabat tanpa label merendahkan anak.
   - Riwayat tindak lanjut pembinaan dan catatan komunikasi orang tua.
   - Modul konseling khusus terenkripsi dan terlindungi hak akses admin.

5. **Pelaporan Resmi Bertanda Tangan (PDF & CSV)**:
   - Ekspor PDF menggunakan Kop Surat Resmi Pemerintah Kabupaten Pasuruan & Dinas Pendidikan.
   - Lembar tanda tangan Kepala Sekolah dan wali kelas.
   - Ekspor CSV dengan dukungan enkoding UTF-8 BOM untuk Microsoft Excel.

6. **Notifikasi WhatsApp & Chat Internal**:
   - Modul antrian notifikasi WhatsApp untuk kehadiran, keterlambatan, dan status perizinan.
   - Kanal chat internal terlindungi hak akses anggota.

7. **Audit Log & Non-Repudiation**:
   - Pencatatan otomatis setiap aksi perubahan data, koreksi absensi, pelaku, waktu, dan IP address.

---

### C. Akun Pengujian Default (4 Peran)

| Peran | Nama Pengguna (*Username*) | Kata Sandi (*Password*) | Nama Lengkap |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Administrator SDN Kandangan I |
| **Guru Piket** | `piket` | `piket123` | Budi Santoso, S.Pd (Guru Piket) |
| **Wali Kelas 1** | `walikelas1` | `guru123` | Siti Rahmawati, S.Pd |
| **Wali Kelas 4** | `walikelas4` | `guru123` | Ahmad Fauzi, S.Pd.SD |
| **Wali Murid** | `walimurid` | `wali123` | Bambang Supriyanto |

---

### D. Panduan Instalasi & Menjalankan Aplikasi

#### 1. Menjalankan Langsung (Node.js)
Aplikasi telah dilengkapi mesin database PostgreSQL embedded (`@electric-sql/pglite`) sehingga dapat langsung dijalankan tanpa perlu instalasi server database terpisah:

```powershell
# 1. Pastikan dependensi terpasang
npm install

# 2. Inisialisasi struktur tabel dan data sekolah
npm run db:seed

# 3. Jalankan server pengembangan
npm run dev
```

Buka peramban di `http://localhost:5000`.

#### 2. Menjalankan Pengujian Otomatis
```powershell
npm test
```
Seluruh 12 skenario pengujian wajib (*Login, Role Guard, Anti-IDOR, Isolasi Kelas, Validasi QR, Anti-Double Scan, Waktu Server, Integrasi Izin, Audit Log, File Privat, Akurasi Laporan, Isolasi Multi-Sekolah*) akan dieksekusi secara otomatis.

#### 3. Menjalankan via Docker Compose
Jika ingin menjalankan pada container Docker dengan server PostgreSQL 16 terpisah:
```bash
docker compose up --build -d
```

---

### E. Konfigurasi WhatsApp Business (Opsional)
Jika ingin mengaktifkan pengiriman pesan WhatsApp otomatis ke orang tua, buka file `.env` dan isi:
```env
WA_GATEWAY_URL="https://api.gateway-wa.com/send"
WA_API_TOKEN="token_rahasia_anda"
```
Jika dibiarkan kosong, dashboard akan menampilkan status **Belum Dikonfigurasi (Standby)** dan seluruh fungsi aplikasi inti tetap berjalan dengan sempurna.

---

### F. Prosedur Pencadangan (Backup) & Pemulihan (Disaster Recovery)

1. **Pencadangan Data Lokal (PGlite)**:
   Salin direktori `./data/pglite` dan `./uploads` ke media penyimpanan terpisah secara berkala:
   ```powershell
   Compress-Archive -Path ./data/pglite, ./uploads -DestinationPath backup-sdn-tosari-$(Get-Date -Format 'yyyyMMdd').zip
   ```

2. **Pencadangan PostgreSQL Eksternal**:
   ```bash
   pg_dump -U postgres -d absensi_sdn_kandangan -F c -b -v -f backup-sdn-tosari.dump
   ```

3. **Pemulihan Data**:
   ```bash
   pg_restore -U postgres -d absensi_sdn_kandangan -v backup-sdn-tosari.dump
   ```

---

### G. Panduan Deployment ke Vercel (Standar Industri Modern)

Aplikasi **GDS : Gerbang Digital Sekolah** dirancang siap-produksi untuk platform cloud modern **Vercel** dengan arsitektur serverless, global Edge CDN, dan latensi rendah kawasan Indonesia (Region Singapore `sin1`).

#### 1. Persiapan Database Cloud (PostgreSQL)
Vercel adalah platform serverless (stateless), sehingga untuk deployment publik disarankan menggunakan penyedia PostgreSQL Cloud gratis:
- **Neon Serverless Postgres** ([neon.tech](https://neon.tech)) — *Sangat direkomendasikan untuk Next.js / Vercel*.
- **Supabase** ([supabase.com](https://supabase.com))
- **Vercel Postgres Marketplace**

Dapatkan *Connection String* Anda, misalnya:
```text
postgresql://username:password@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

#### 2. Seeding Database Cloud
Setelah mendapatkan `DATABASE_URL` dari cloud provider Anda, jalankan perintah seeding sekali dari komputer lokal untuk membuat seluruh 28 tabel dan akun awal:
```bash
# Windows PowerShell
$env:DATABASE_URL="postgresql://username:password@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
npm run db:seed
```

#### 3. Hubungkan Repositori ke Vercel
1. Buka [https://vercel.com](https://vercel.com) dan login dengan akun GitHub Anda (`akhshodikin`).
2. Klik tombol **"Add New..."** lalu pilih **"Project"**.
3. Cari dan impor repositori: **`akhshodikin/Gerbang-Digital-Sekolah`**.
4. Di bagian **Environment Variables**, tambahkan:
   - `DATABASE_URL` : *URL koneksi PostgreSQL cloud Anda*
   - `AUTH_SECRET` : `sdn-kandangan-tosari-secret-key-32chars-minimum-security-2026-production` *(atau string rahasia acak 32+ karakter)*
   - `NEXT_PUBLIC_APP_NAME` : `GDS : Gerbang Digital Sekolah`
   - `NEXT_PUBLIC_SCHOOL_NAME` : `SDN Kandangan I Tosari`
   - `NEXT_PUBLIC_SCHOOL_REGION` : `Kecamatan Tosari, Kabupaten Pasuruan, Jawa Timur`
5. Klik **"Deploy"**. Vercel akan otomatis melakukan proses build dan menyediakan domain HTTPS gratis (contoh: `gerbang-digital-sekolah.vercel.app`).
6. Setiap kali Anda melakukan `git push` ke branch `main`, Vercel akan otomatis melakukan update (*Continuous Deployment*).

---
*Dikembangkan dengan standar kualitas produksi tinggi untuk SDN Kandangan I Tosari, Kabupaten Pasuruan.*
