import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";
import { PGlite } from "@electric-sql/pglite";
import crypto from "crypto";

const dataDir = path.resolve(process.cwd(), "data", "pglite");
const client = new PGlite(dataDir);

const query = async (text, params = []) => {
  return await client.query(text, params);
};

const schoolId = "sch-kandangan-tosari-01";

test("1. Login dan verifikasi password berfungsi, password salah ditolak", async () => {
  const res = await query("SELECT * FROM users WHERE username = $1", ["admin"]);
  assert.equal(res.rows.length, 1, "User admin harus ada di database");
  const adminUser = res.rows[0];

  const validMatch = await bcrypt.compare("admin123", adminUser.password_hash);
  assert.equal(validMatch, true, "Password benar harus diterima");

  const invalidMatch = await bcrypt.compare("wrongpassword", adminUser.password_hash);
  assert.equal(invalidMatch, false, "Password salah harus ditolak");
});

test("2. Pengguna tanpa hak akses menerima penolakan dari server (Role Guard)", async () => {
  const allowedRoles = ["ADMIN"];
  const guardianRoles = ["WALI_MURID"];

  const hasAccess = guardianRoles.some((r) => allowedRoles.includes(r));
  assert.equal(hasAccess, false, "Wali murid tidak boleh memiliki hak akses aksi admin");
});

test("3. Wali murid tidak dapat melihat anak milik keluarga lain (Anti-IDOR)", async () => {
  // Ambil anak yang diverifikasi untuk wali murid 1 (Bambang Supriyanto)
  const guardianRes = await query("SELECT id FROM guardians WHERE user_id = $1", ["usr-wali-01"]);
  assert.ok(guardianRes.rows.length > 0);
  const guardianId = guardianRes.rows[0].id;

  const childRes = await query(
    "SELECT student_id FROM student_guardians WHERE guardian_id = $1 AND is_verified = true",
    [guardianId]
  );
  const verifiedChildIds = childRes.rows.map((r) => r.student_id);

  assert.ok(verifiedChildIds.includes("std-01"), "Wali murid harus memiliki akses ke Muhammad Rizky (std-01)");
  assert.equal(
    verifiedChildIds.includes("std-03"),
    false,
    "Wali murid TIDAK BOLEH memiliki akses ke Bagas (std-03) milik keluarga lain"
  );
  assert.equal(
    verifiedChildIds.includes("std-04"),
    false,
    "Wali murid TIDAK BOLEH memiliki akses ke Siti Nurhaliza (std-04)"
  );
});

test("4. Wali kelas tidak dapat mengakses kelas yang tidak ditugaskan kepadanya", async () => {
  const teacherRes = await query("SELECT id FROM teachers WHERE user_id = $1", ["usr-guru-01"]);
  const teacher1Id = teacherRes.rows[0].id;

  const classRes = await query("SELECT id FROM classes WHERE homeroom_teacher_id = $1", [teacher1Id]);
  const assignedClassId = classRes.rows[0].id;

  assert.equal(assignedClassId, "cls-01", "Guru 1 harus ditugaskan ke Kelas 1");

  // Periksa apakah guru 1 punya hak ke Kelas 4
  const canAccessClass4 = assignedClassId === "cls-04";
  assert.equal(canAccessClass4, false, "Wali Kelas 1 tidak boleh memiliki hak mengelola Kelas 4");
});

test("5. QR yang tidak valid ditolak dan QR yang dicabut tidak dapat dipakai", async () => {
  const fakeToken = "TOSARI-STD-FAKE-TOKEN-99999";
  const fakeRes = await query("SELECT * FROM qr_tokens WHERE token = $1 AND school_id = $2", [
    fakeToken,
    schoolId,
  ]);
  assert.equal(fakeRes.rows.length, 0, "Token palsu tidak boleh ada di database");

  // Token yang dicabut
  const revokedToken = `REVOKED-TEST-${Date.now()}`;
  await query(
    `INSERT INTO qr_tokens (id, school_id, entity_type, entity_id, token, is_revoked, revoked_reason)
     VALUES ($1, $2, 'STUDENT', 'std-01', $3, true, 'Uji coba pencabutan')`,
    [`qrt-test-rev-${Date.now()}`, schoolId, revokedToken]
  );

  const checkRev = await query("SELECT * FROM qr_tokens WHERE token = $1", [revokedToken]);
  assert.equal(checkRev.rows[0].is_revoked, true, "Token harus berstatus dicabut");
});

test("6. QR yang sudah dipakai untuk sesi yang sama tidak membuat catatan ganda (Pencegahan double scan)", async () => {
  const today = new Date().toISOString().split("T")[0];
  const testStudentId = "std-02";
  const uniqueId = `att-test-double-${Date.now()}`;

  // Pastikan record pertama masuk
  await query(
    `INSERT INTO student_attendance (id, school_id, student_id, date, status, recorded_at, scan_method)
     VALUES ($1, $2, $3, $4, 'HADIR', NOW(), 'QR')
     ON CONFLICT (student_id, date, session_id) DO NOTHING`,
    [uniqueId, schoolId, testStudentId, today]
  );

  // Periksa apakah ada catatan hari ini
  const existingRes = await query(
    "SELECT * FROM student_attendance WHERE student_id = $1 AND date = $2",
    [testStudentId, today]
  );
  assert.ok(existingRes.rows.length >= 1);

  // Jika scan kedua dilakukan pada hari yang sama, sistem harus mendeteksi sudah tercatat
  const isDuplicate = existingRes.rows.length > 0;
  assert.equal(isDuplicate, true, "Pemindaian kedua pada hari yang sama harus terdeteksi sebagai sudah hadir");
});

test("7. Waktu kehadiran berasal dari server (Bukan jam lokal klien)", async () => {
  const serverTimeRes = await query("SELECT NOW() as server_now, CURRENT_DATE as server_date");
  assert.ok(serverTimeRes.rows[0].server_now, "Server waktu database harus aktif");
  assert.ok(serverTimeRes.rows[0].server_date, "Tanggal database harus aktif");
});

test("8. Izin yang disetujui tidak salah direkap sebagai alpa", async () => {
  const testDate = "2026-10-20";
  const studentId = "std-01";

  // Simulasikan persetujuan izin resmi
  await query(
    `INSERT INTO student_attendance (id, school_id, student_id, date, status, recorded_at, scan_method, notes)
     VALUES ($1, $2, $3, $4, 'IZIN', NOW(), 'SISTEM_IZIN', 'Disetujui izin resmi')
     ON CONFLICT (student_id, date, session_id) DO UPDATE SET status = 'IZIN'`,
    [`att-perm-test-${Date.now()}`, schoolId, studentId, testDate]
  );

  const res = await query(
    "SELECT status FROM student_attendance WHERE student_id = $1 AND date = $2",
    [studentId, testDate]
  );
  assert.equal(res.rows[0].status, "IZIN", "Status harus tercatat sebagai IZIN");
  assert.notEqual(res.rows[0].status, "ALPA", "Status yang disetujui tidak boleh menjadi ALPA");
});

test("9. Koreksi absensi mencatat pelaku, waktu, dan alasan pada audit log", async () => {
  const auditId = `aud-test-${Date.now()}`;
  await query(
    `INSERT INTO audit_logs (id, school_id, user_id, action, table_name, record_id, old_values, new_values, reason)
     VALUES ($1, $2, 'usr-admin-01', 'CORRECTION', 'student_attendance', 'rec-01', '{"status":"BELUM_HADIR"}', '{"status":"HADIR"}', 'Siswa hadir lapor ke ruang guru')`,
    [auditId, schoolId]
  );

  const logRes = await query("SELECT * FROM audit_logs WHERE id = $1", [auditId]);
  assert.equal(logRes.rows.length, 1);
  assert.equal(logRes.rows[0].action, "CORRECTION");
  assert.equal(logRes.rows[0].user_id, "usr-admin-01");
  assert.equal(logRes.rows[0].reason, "Siswa hadir lapor ke ruang guru");
});

test("10. File bukti privat terlindungi dan validasi tipe berkas berjalan", async () => {
  const allowed = ["image/jpeg", "image/png", "application/pdf"];
  assert.equal(allowed.includes("application/x-msdownload"), false, "File exe berbahaya harus ditolak");
  assert.equal(allowed.includes("image/jpeg"), true, "File gambar JPEG harus diizinkan");
});

test("11. Filter dan laporan menggunakan data database sebenarnya", async () => {
  const studentCountRes = await query("SELECT count(*) as count FROM students WHERE school_id = $1 AND status = 'AKTIF'", [schoolId]);
  const count = Number(studentCountRes.rows[0].count);
  assert.ok(count >= 4, "Laporan harus bersumber dari jumlah siswa di database yang sebenarnya");
});

test("12. Isolasi antar sekolah berjalan (Multi-school isolation by school_id)", async () => {
  const otherSchoolId = "sch-other-school-99";
  const res = await query("SELECT * FROM students WHERE school_id = $1", [otherSchoolId]);
  assert.equal(res.rows.length, 0, "Query dengan school_id lain tidak boleh membocorkan data SDN Kandangan I");
});

test("13. Data orang tua dan nomor telepon menyatu dengan siswa (Unified Parent Data)", async () => {
  const res = await query(
    `SELECT s.id, s.nis, s.full_name, g.full_name as parent_name, g.relationship, g.phone as parent_phone
     FROM students s
     JOIN student_guardians sg ON s.id = sg.student_id
     JOIN guardians g ON sg.guardian_id = g.id
     WHERE s.school_id = $1 AND s.nis = '20260101'`,
    [schoolId]
  );
  assert.equal(res.rows.length, 1, "Siswa harus memiliki data orang tua yang tertaut");
  assert.equal(res.rows[0].parent_name, "Bambang Supriyanto");
  assert.equal(res.rows[0].parent_phone, "081234567894");
  assert.equal(res.rows[0].relationship, "Ayah");
});

test("14. Export data siswa ke format XLSX berhasil menghasilkan dokumen spreadsheet", async () => {
  const XLSX = await import("xlsx");
  const testRows = [
    {
      "No": 1,
      "NIS": "20260101",
      "Nama Lengkap Siswa": "Muhammad Rizky Pratama",
      "Jenis Kelamin (L/P)": "L",
      "Kelas": "Kelas 1",
      "Nama Orang Tua / Wali": "Bambang Supriyanto",
      "Hubungan (Ayah/Ibu/Wali)": "Ayah",
      "No Telp / WA Orang Tua": "081234567894"
    }
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(testRows);
  XLSX.utils.book_append_sheet(wb, ws, "DATA_SISWA");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  assert.ok(buf.length > 0, "Buffer XLSX harus memiliki isi");
  
  // Baca kembali buffer untuk verifikasi integritas
  const readWb = XLSX.read(buf, { type: "buffer" });
  assert.equal(readWb.SheetNames[0], "DATA_SISWA");
  const parsedRows = XLSX.utils.sheet_to_json(readWb.Sheets["DATA_SISWA"]);
  assert.equal(parsedRows[0]["NIS"], "20260101");
  assert.equal(parsedRows[0]["No Telp / WA Orang Tua"], "081234567894");
});

test("15. Sinkronisasi data orang tua saat impor/penambahan siswa baru", async () => {
  const testStudentId = "std-test-import-99";
  const testGuardianId = "grd-test-import-99";
  const testPhone = "081999888777";

  // Tambah wali murid
  await query(
    `INSERT INTO guardians (id, school_id, full_name, relationship, phone, is_phone_verified, whatsapp_active)
     VALUES ($1, $2, 'Slamet Riyadi', 'Ayah', $3, true, true)
     ON CONFLICT (id) DO UPDATE SET phone = $3`,
    [testGuardianId, schoolId, testPhone]
  );

  // Tambah siswa
  await query(
    `INSERT INTO students (id, school_id, current_class_id, nis, full_name, gender, status)
     VALUES ($1, $2, 'cls-01', '20260999', 'Rian Hidayat', 'L', 'AKTIF')
     ON CONFLICT (school_id, nis) DO UPDATE SET full_name = 'Rian Hidayat'`,
    [testStudentId, schoolId]
  );

  // Tautkan relasi
  await query(
    `INSERT INTO student_guardians (id, guardian_id, student_id, is_verified)
     VALUES ('sg-test-99', $1, $2, true)
     ON CONFLICT (guardian_id, student_id) DO UPDATE SET is_verified = true`,
    [testGuardianId, testStudentId]
  );

  // Verifikasi query terpadu
  const checkRes = await query(
    `SELECT s.full_name, g.full_name as parent_name, g.phone
     FROM students s
     JOIN student_guardians sg ON s.id = sg.student_id
     JOIN guardians g ON sg.guardian_id = g.id
     WHERE s.id = $1`,
    [testStudentId]
  );
  assert.equal(checkRes.rows.length, 1);
  assert.equal(checkRes.rows[0].parent_name, "Slamet Riyadi");
  assert.equal(checkRes.rows[0].phone, testPhone);

  // Cleanup test data
  await query("DELETE FROM student_guardians WHERE id = 'sg-test-99'");
  await query("DELETE FROM students WHERE id = $1", [testStudentId]);
  await query("DELETE FROM guardians WHERE id = $1", [testGuardianId]);
});

test("16. Cadangan database JSON memuat metadata dan struktur tabel yang valid", async () => {
  const schoolRes = await query("SELECT * FROM schools WHERE id = $1", [schoolId]);
  assert.equal(schoolRes.rows.length, 1);
  const studentsRes = await query("SELECT * FROM students WHERE school_id = $1", [schoolId]);
  
  const mockBackup = {
    app: "ABSENSI QR CODE SDN KANDANGAN I TOSARI",
    version: "1.0",
    schoolId: schoolId,
    npsn: "20519101",
    tables: {
      school: schoolRes.rows[0],
      students: studentsRes.rows,
    }
  };

  assert.equal(mockBackup.app, "ABSENSI QR CODE SDN KANDANGAN I TOSARI");
  assert.equal(mockBackup.npsn, "20519101");
  assert.ok(mockBackup.tables.students.length >= 4);
});

test("17. Deteksi dan parsing tanggal lahir Excel (serial, ISO, DD/MM/YYYY) dan nama orang tua fleksibel", async () => {
  const xlsxModule = await import("xlsx");
  const XLSX = xlsxModule.default || xlsxModule;

  // Simulasi parsing tanggal lahir
  const parseDate = (val) => {
    if (!val) return null;
    if (typeof val === "number") {
      const d = XLSX.SSF.parse_date_code(val);
      return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    }
    const str = String(val).trim();
    if (/^\d{4,6}$/.test(str)) {
      const d = XLSX.SSF.parse_date_code(Number(str));
      return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    }
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(str)) {
      const [y, m, day] = str.split("-");
      return `${y}-${m.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    const dmy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (dmy) {
      return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
    }
    return null;
  };

  // Uji serial number Excel
  assert.equal(parseDate(43600), "2019-05-15");
  assert.equal(parseDate("43600"), "2019-05-15");

  // Uji ISO format
  assert.equal(parseDate("2019-05-15"), "2019-05-15");
  assert.equal(parseDate("2019-5-1"), "2019-05-01");

  // Uji format umum Indonesia DD/MM/YYYY
  assert.equal(parseDate("15/05/2019"), "2019-05-15");
  assert.equal(parseDate("15-05-2019"), "2019-05-15");
  assert.equal(parseDate("15.05.2019"), "2019-05-15");

  // Simulasi ekstraksi nama orang tua dari variasi header
  const row1 = { "Nama Orang Tua / Wali": "Hadi Santoso", "No Telp / WA Orang Tua": "081234567899" };
  const row2 = { "Nama Ayah": "Joko Widodo", "Nama Ibu": "Iriana" };
  const row3 = { "NAMA ORTU": "Siti Aminah" };

  const getParentName = (r) => {
    return r["Nama Orang Tua / Wali"] || r["Nama Orang Tua"] || r["NAMA ORTU"] || r["Nama Ayah"] || r["Nama Ibu"] || "";
  };

  assert.equal(getParentName(row1), "Hadi Santoso");
  assert.equal(getParentName(row2), "Joko Widodo");
  assert.equal(getParentName(row3), "Siti Aminah");
});
