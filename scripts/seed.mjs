import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { PGlite } from "@electric-sql/pglite";

async function runSeed() {
  console.log("🌱 Memulai seeding database SDN Kandangan I Tosari...");

  const databaseUrl = process.env.DATABASE_URL?.trim();
  let client;
  let query;
  let exec;

  if (databaseUrl && databaseUrl.length > 0) {
    console.log("🔗 Menghubungkan ke PostgreSQL Cloud / Eksternal:", databaseUrl.replace(/:[^:@]+@/, ":****@"));
    const { Client } = await import("pg");
    const isLocalhost = databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");
    client = new Client({
      connectionString: databaseUrl,
      ssl: isLocalhost ? false : { rejectUnauthorized: false },
    });
    await client.connect();
    query = async (text, params = []) => {
      return await client.query(text, params);
    };
    exec = async (sqlText) => {
      return await client.query(sqlText);
    };
  } else {
    console.log("📂 Menggunakan PGlite Lokal (PostgreSQL Embedded di ./data/pglite)...");
    const dataDir = path.resolve(process.cwd(), "data", "pglite");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    client = new PGlite(dataDir);
    query = async (text, params = []) => {
      return await client.query(text, params);
    };
    exec = async (sqlText) => {
      return await client.exec(sqlText);
    };
  }

  // Run initialization DDL
  console.log("1. Memverifikasi struktur tabel database...");
  await exec(`
    CREATE TABLE IF NOT EXISTS schools (
      id TEXT PRIMARY KEY,
      npsn VARCHAR(20) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      address TEXT NOT NULL,
      district VARCHAR(100) NOT NULL DEFAULT 'Tosari',
      regency VARCHAR(100) NOT NULL DEFAULT 'Kabupaten Pasuruan',
      province VARCHAR(100) NOT NULL DEFAULT 'Jawa Timur',
      postal_code VARCHAR(10),
      phone VARCHAR(30),
      email VARCHAR(100),
      website VARCHAR(150),
      logo_url TEXT,
      region_logo_url TEXT,
      headmaster_name VARCHAR(255),
      headmaster_nip VARCHAR(50),
      timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Jakarta',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS roles (
      id VARCHAR(30) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id),
      username VARCHAR(100) NOT NULL UNIQUE,
      email VARCHAR(150),
      phone VARCHAR(30),
      password_hash TEXT NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      avatar_url TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      last_login_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_id VARCHAR(30) NOT NULL REFERENCES roles(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT user_roles_user_role_unq UNIQUE (user_id, role_id)
    );

    CREATE TABLE IF NOT EXISTS academic_years (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id),
      name VARCHAR(50) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      is_current BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS semesters (
      id TEXT PRIMARY KEY,
      academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
      semester_number INTEGER NOT NULL,
      name VARCHAR(50) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      is_current BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS teachers (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id),
      user_id TEXT REFERENCES users(id),
      nip VARCHAR(50),
      full_name VARCHAR(255) NOT NULL,
      gender VARCHAR(10),
      phone VARCHAR(30),
      email VARCHAR(150),
      address TEXT,
      position VARCHAR(100) DEFAULT 'Guru Kelas',
      status VARCHAR(30) DEFAULT 'PNS',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id),
      academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
      homeroom_teacher_id TEXT REFERENCES teachers(id),
      name VARCHAR(50) NOT NULL,
      grade_level INTEGER NOT NULL,
      capacity INTEGER DEFAULT 30,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id),
      current_class_id TEXT REFERENCES classes(id),
      nis VARCHAR(50) NOT NULL,
      nisn VARCHAR(50),
      full_name VARCHAR(255) NOT NULL,
      nickname VARCHAR(100),
      gender VARCHAR(10) NOT NULL,
      birth_place VARCHAR(100),
      birth_date DATE,
      address TEXT,
      photo_url TEXT,
      status VARCHAR(30) NOT NULL DEFAULT 'AKTIF',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT students_school_nis_unq UNIQUE (school_id, nis)
    );

    CREATE TABLE IF NOT EXISTS guardians (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id),
      user_id TEXT REFERENCES users(id),
      full_name VARCHAR(255) NOT NULL,
      relationship VARCHAR(50) NOT NULL DEFAULT 'Orang Tua',
      phone VARCHAR(30) NOT NULL,
      is_phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
      whatsapp_active BOOLEAN NOT NULL DEFAULT TRUE,
      address TEXT,
      occupation VARCHAR(100),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS student_guardians (
      id TEXT PRIMARY KEY,
      guardian_id TEXT NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      is_verified BOOLEAN NOT NULL DEFAULT FALSE,
      verified_by TEXT REFERENCES users(id),
      verified_at TIMESTAMP,
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT unq_guardian_student UNIQUE (guardian_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS attendance_sessions (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id),
      name VARCHAR(100) NOT NULL,
      type VARCHAR(20) NOT NULL,
      target_type VARCHAR(20) NOT NULL DEFAULT 'STUDENT',
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      late_threshold_time TIME NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      applicable_days JSONB DEFAULT '[1,2,3,4,5,6]',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS qr_tokens (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id),
      entity_type VARCHAR(20) NOT NULL,
      entity_id TEXT NOT NULL,
      token VARCHAR(128) NOT NULL UNIQUE,
      version INTEGER NOT NULL DEFAULT 1,
      is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
      revoked_at TIMESTAMP,
      revoked_reason TEXT,
      issued_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS student_attendance (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id),
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      class_id TEXT REFERENCES classes(id),
      date DATE NOT NULL,
      session_id TEXT REFERENCES attendance_sessions(id),
      status VARCHAR(30) NOT NULL,
      recorded_at TIMESTAMP NOT NULL,
      scan_method VARCHAR(30) NOT NULL DEFAULT 'QR',
      recorded_by_user_id TEXT REFERENCES users(id),
      notes TEXT,
      permission_request_id TEXT,
      check_out_time TIMESTAMP,
      early_departure_reason TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT student_date_session_unq UNIQUE (student_id, date, session_id)
    );

    CREATE TABLE IF NOT EXISTS teacher_attendance (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id),
      teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      check_in_time TIMESTAMP,
      check_out_time TIMESTAMP,
      status VARCHAR(30) NOT NULL,
      recorded_method VARCHAR(30) NOT NULL DEFAULT 'QR',
      recorded_by_user_id TEXT REFERENCES users(id),
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT teacher_date_unq UNIQUE (teacher_id, date)
    );

    CREATE TABLE IF NOT EXISTS permission_requests (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id),
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      guardian_id TEXT NOT NULL REFERENCES guardians(id),
      type VARCHAR(20) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      reason TEXT NOT NULL,
      attachment_url TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'MENUNGGU',
      reviewed_by_user_id TEXT REFERENCES users(id),
      reviewed_at TIMESTAMP,
      review_notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS violation_categories (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id),
      name VARCHAR(100) NOT NULL,
      severity VARCHAR(20) NOT NULL DEFAULT 'RINGAN',
      description TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS student_violations (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id),
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      category_id TEXT NOT NULL REFERENCES violation_categories(id),
      date DATE NOT NULL,
      time TIME NOT NULL,
      location VARCHAR(150) NOT NULL,
      description TEXT NOT NULL,
      initial_action TEXT NOT NULL,
      recorded_by_user_id TEXT NOT NULL REFERENCES users(id),
      evidence_file_url TEXT,
      status VARCHAR(30) NOT NULL DEFAULT 'BARU',
      is_parent_notified BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS violation_followups (
      id TEXT PRIMARY KEY,
      violation_id TEXT NOT NULL REFERENCES student_violations(id) ON DELETE CASCADE,
      action_taken TEXT NOT NULL,
      student_response TEXT,
      parent_communication_notes TEXT,
      handled_by_user_id TEXT NOT NULL REFERENCES users(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS counseling_records (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id),
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      session_summary TEXT NOT NULL,
      sensitive_notes TEXT NOT NULL,
      agreed_action_plan TEXT,
      counselor_user_id TEXT NOT NULL REFERENCES users(id),
      status VARCHAR(30) NOT NULL DEFAULT 'AKTIF',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id),
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      target_role VARCHAR(50) NOT NULL DEFAULT 'ALL',
      target_class_id TEXT REFERENCES classes(id),
      author_user_id TEXT NOT NULL REFERENCES users(id),
      is_published BOOLEAN NOT NULL DEFAULT TRUE,
      published_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id),
      type VARCHAR(30) NOT NULL,
      title VARCHAR(255),
      related_class_id TEXT REFERENCES classes(id),
      related_student_id TEXT REFERENCES students(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS conversation_members (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      last_read_at TIMESTAMP,
      joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT unq_conv_member UNIQUE (conversation_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_user_id TEXT NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
      is_read BOOLEAN NOT NULL DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS notification_jobs (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id),
      type VARCHAR(50) NOT NULL,
      recipient_phone VARCHAR(30) NOT NULL,
      recipient_name VARCHAR(150) NOT NULL,
      message_content TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      retry_count INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 3,
      scheduled_at TIMESTAMP NOT NULL DEFAULT NOW(),
      last_attempt_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notification_logs (
      id TEXT PRIMARY KEY,
      job_id TEXT REFERENCES notification_jobs(id),
      channel VARCHAR(30) NOT NULL DEFAULT 'WHATSAPP',
      target VARCHAR(50) NOT NULL,
      status VARCHAR(20) NOT NULL,
      response_payload TEXT,
      error_message TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS school_settings (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL UNIQUE REFERENCES schools(id),
      check_in_start TIME NOT NULL DEFAULT '06:30:00',
      check_in_late_threshold TIME NOT NULL DEFAULT '07:00:00',
      check_in_cutoff_time TIME NOT NULL DEFAULT '07:30:00',
      check_out_start TIME NOT NULL DEFAULT '12:00:00',
      school_days JSONB DEFAULT '[1,2,3,4,5,6]',
      enable_whatsapp_notifications BOOLEAN NOT NULL DEFAULT FALSE,
      wa_attendance_template TEXT DEFAULT 'Yth. Wali Siswa {nama_siswa}, ananda tercatat {status} pada pukul {waktu} WIB di SDN Kandangan I Tosari.',
      wa_late_template TEXT DEFAULT 'Pemberitahuan: Ananda {nama_siswa} tercatat TERLAMBAT pada pukul {waktu} WIB. Mohon koordinasi orang tua.',
      wa_absent_template TEXT DEFAULT 'Pemberitahuan: Hingga pukul {waktu} WIB ananda {nama_siswa} belum tercatat hadir dan belum ada izin terkonfirmasi.',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id),
      user_id TEXT REFERENCES users(id),
      action VARCHAR(50) NOT NULL,
      table_name VARCHAR(50) NOT NULL,
      record_id VARCHAR(100),
      old_values JSONB,
      new_values JSONB,
      reason TEXT,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  console.log("✓ Struktur 28 tabel siap.");

  // 2. Roles
  console.log("2. Menyiapkan Roles pengguna...");
  const roleList = [
    { id: "ADMIN", name: "Administrator", description: "Akses penuh manajemen sekolah dan absensi" },
    { id: "WALI_KELAS", name: "Wali Kelas", description: "Pengelolaan absensi kelas binaan dan komunikasi wali murid" },
    { id: "WALI_MURID", name: "Wali Murid", description: "Pemantauan kehadiran anak dan pengajuan izin resmi" },
    { id: "GURU_PIKET", name: "Guru Piket", description: "Pemindaian QR kehadiran dan pencatatan harian piket" },
  ];

  for (const r of roleList) {
    await query(
      `INSERT INTO roles (id, name, description) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = $2, description = $3`,
      [r.id, r.name, r.description]
    );
  }

  // 3. School Profile
  console.log("3. Menyiapkan Profil Sekolah SDN Kandangan I Tosari...");
  const schoolId = "sch-kandangan-tosari-01";
  await query(
    `INSERT INTO schools (
      id, npsn, name, address, district, regency, province, postal_code, phone, email, website,
      headmaster_name, headmaster_nip, timezone
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
    ) ON CONFLICT (npsn) DO UPDATE SET name = $3, address = $4, headmaster_name = $12, headmaster_nip = $13`,
    [
      schoolId,
      "20519101",
      "SDN Kandangan I Tosari",
      "Jl. Bromo No. 12, Desa Kandangan, Kecamatan Tosari",
      "Tosari",
      "Kabupaten Pasuruan",
      "Jawa Timur",
      "67177",
      "(0343) 571001",
      "sdnkandangan1tosari@pasuruankab.sch.id",
      "https://sdnkandangan1tosari.sch.id",
      "AKHMAD SHODIKIN, M.Pd",
      "198503182009031009",
      "Asia/Jakarta",
    ]
  );

  // 4. School Settings
  await query(
    `INSERT INTO school_settings (
      id, school_id, check_in_start, check_in_late_threshold, check_in_cutoff_time, check_out_start, enable_whatsapp_notifications
    ) VALUES ($1, $2, '06:30:00', '07:00:00', '07:30:00', '12:00:00', false)
    ON CONFLICT (school_id) DO NOTHING`,
    ["set-kandangan-01", schoolId]
  );

  // 5. Academic Year & Semester
  console.log("4. Menyiapkan Tahun Ajaran dan Semester...");
  const academicYearId = "ay-2026-2027";
  await query(
    `INSERT INTO academic_years (id, school_id, name, start_date, end_date, is_current)
     VALUES ($1, $2, '2026/2027', '2026-07-15', '2027-06-25', true)
     ON CONFLICT (id) DO UPDATE SET is_current = true`,
    [academicYearId, schoolId]
  );

  const semesterId = "sem-2026-1";
  await query(
    `INSERT INTO semesters (id, academic_year_id, semester_number, name, start_date, end_date, is_current)
     VALUES ($1, $2, 1, 'Semester 1 (Ganjil)', '2026-07-15', '2026-12-20', true)
     ON CONFLICT (id) DO UPDATE SET is_current = true`,
    [semesterId, academicYearId]
  );

  // 6. Users & Passwords (bcrypt)
  console.log("5. Menyiapkan Akun Pengguna 4 Peran...");
  const adminPass = await bcrypt.hash("admin123", 10);
  const guruPass = await bcrypt.hash("guru123", 10);
  const piketPass = await bcrypt.hash("piket123", 10);
  const waliPass = await bcrypt.hash("wali123", 10);

  const userList = [
    {
      id: "usr-admin-01",
      username: "admin",
      fullName: "Administrator SDN Kandangan I",
      email: "admin@sdnkandangan1.sch.id",
      phone: "081234567890",
      passwordHash: adminPass,
      role: "ADMIN",
    },
    {
      id: "usr-piket-01",
      username: "piket",
      fullName: "Budi Santoso, S.Pd",
      email: "piket@sdnkandangan1.sch.id",
      phone: "081234567891",
      passwordHash: piketPass,
      role: "GURU_PIKET",
    },
    {
      id: "usr-guru-01",
      username: "walikelas1",
      fullName: "Siti Rahmawati, S.Pd",
      email: "walikelas1@sdnkandangan1.sch.id",
      phone: "081234567892",
      passwordHash: guruPass,
      role: "WALI_KELAS",
    },
    {
      id: "usr-guru-02",
      username: "walikelas2",
      fullName: "Rina Wulandari, S.Pd",
      email: "walikelas2@sdnkandangan1.sch.id",
      phone: "081234567895",
      passwordHash: guruPass,
      role: "WALI_KELAS",
    },
    {
      id: "usr-guru-03",
      username: "walikelas3",
      fullName: "Agus Setiawan, S.Pd.SD",
      email: "walikelas3@sdnkandangan1.sch.id",
      phone: "081234567896",
      passwordHash: guruPass,
      role: "WALI_KELAS",
    },
    {
      id: "usr-guru-04",
      username: "walikelas4",
      fullName: "Ahmad Fauzi, S.Pd.SD",
      email: "walikelas4@sdnkandangan1.sch.id",
      phone: "081234567893",
      passwordHash: guruPass,
      role: "WALI_KELAS",
    },
    {
      id: "usr-guru-05",
      username: "walikelas5",
      fullName: "Dewi Nurhayati, S.Pd",
      email: "walikelas5@sdnkandangan1.sch.id",
      phone: "081234567897",
      passwordHash: guruPass,
      role: "WALI_KELAS",
    },
    {
      id: "usr-guru-06",
      username: "walikelas6",
      fullName: "Tri Wahyudi, S.Pd",
      email: "walikelas6@sdnkandangan1.sch.id",
      phone: "081234567898",
      passwordHash: guruPass,
      role: "WALI_KELAS",
    },
    {
      id: "usr-wali-01",
      username: "walimurid",
      fullName: "Bambang Supriyanto",
      email: "walimurid@gmail.com",
      phone: "081234567894",
      passwordHash: waliPass,
      role: "WALI_MURID",
    },
  ];

  for (const u of userList) {
    await query(
      `INSERT INTO users (id, school_id, username, full_name, email, phone, password_hash, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       ON CONFLICT (username) DO UPDATE SET full_name = $4, password_hash = $7`,
      [u.id, schoolId, u.username, u.fullName, u.email, u.phone, u.passwordHash]
    );

    await query(
      `INSERT INTO user_roles (id, user_id, role_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      [`ur-${u.id}-${u.role}`, u.id, u.role]
    );
  }

  // 7. Teachers
  console.log("6. Menyiapkan Data Guru...");
  const teacherList = [
    {
      id: "tch-01",
      userId: "usr-guru-01",
      nip: "198503152010012015",
      fullName: "Siti Rahmawati, S.Pd",
      gender: "P",
      phone: "081234567892",
      email: "walikelas1@sdnkandangan1.sch.id",
      position: "Guru Kelas 1",
      status: "PNS",
    },
    {
      id: "tch-02",
      userId: "usr-guru-02",
      nip: "198904122014022003",
      fullName: "Rina Wulandari, S.Pd",
      gender: "P",
      phone: "081234567895",
      email: "walikelas2@sdnkandangan1.sch.id",
      position: "Guru Kelas 2",
      status: "PPPK",
    },
    {
      id: "tch-03",
      userId: "usr-guru-03",
      nip: "199105202019031006",
      fullName: "Agus Setiawan, S.Pd.SD",
      gender: "L",
      phone: "081234567896",
      email: "walikelas3@sdnkandangan1.sch.id",
      position: "Guru Kelas 3",
      status: "PPPK",
    },
    {
      id: "tch-04",
      userId: "usr-guru-04",
      nip: "198811202014021003",
      fullName: "Ahmad Fauzi, S.Pd.SD",
      gender: "L",
      phone: "081234567893",
      email: "walikelas4@sdnkandangan1.sch.id",
      position: "Guru Kelas 4",
      status: "PNS",
    },
    {
      id: "tch-05",
      userId: "usr-guru-05",
      nip: "199308152020122011",
      fullName: "Dewi Nurhayati, S.Pd",
      gender: "P",
      phone: "081234567897",
      email: "walikelas5@sdnkandangan1.sch.id",
      position: "Guru Kelas 5",
      status: "PPPK",
    },
    {
      id: "tch-06",
      userId: "usr-guru-06",
      nip: "198602102011011009",
      fullName: "Tri Wahyudi, S.Pd",
      gender: "L",
      phone: "081234567898",
      email: "walikelas6@sdnkandangan1.sch.id",
      position: "Guru Kelas 6",
      status: "PNS",
    },
    {
      id: "tch-07",
      userId: "usr-piket-01",
      nip: "199207042019031008",
      fullName: "Budi Santoso, S.Pd",
      gender: "L",
      phone: "081234567891",
      email: "piket@sdnkandangan1.sch.id",
      position: "Guru PJOK / Petugas Piket",
      status: "PPPK",
    },
  ];

  for (const t of teacherList) {
    await query(
      `INSERT INTO teachers (id, school_id, user_id, nip, full_name, gender, phone, email, position, status, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
       ON CONFLICT (id) DO UPDATE SET full_name = $5, nip = $4, position = $9, user_id = $3`,
      [t.id, schoolId, t.userId, t.nip, t.fullName, t.gender, t.phone, t.email, t.position, t.status]
    );
  }

  // 8. Classes
  console.log("7. Menyiapkan Data Kelas...");
  const classList = [
    { id: "cls-01", name: "Kelas 1", gradeLevel: 1, teacherId: "tch-01" },
    { id: "cls-02", name: "Kelas 2", gradeLevel: 2, teacherId: "tch-02" },
    { id: "cls-03", name: "Kelas 3", gradeLevel: 3, teacherId: "tch-03" },
    { id: "cls-04", name: "Kelas 4", gradeLevel: 4, teacherId: "tch-04" },
    { id: "cls-05", name: "Kelas 5", gradeLevel: 5, teacherId: "tch-05" },
    { id: "cls-06", name: "Kelas 6", gradeLevel: 6, teacherId: "tch-06" },
  ];

  for (const c of classList) {
    await query(
      `INSERT INTO classes (id, school_id, academic_year_id, homeroom_teacher_id, name, grade_level, capacity)
       VALUES ($1, $2, $3, $4, $5, $6, 30)
       ON CONFLICT (id) DO UPDATE SET name = $5, homeroom_teacher_id = $4`,
      [c.id, schoolId, academicYearId, c.teacherId, c.name, c.gradeLevel]
    );
  }

  // 9. Students
  console.log("8. Menyiapkan Data Siswa...");
  const studentList = [
    {
      id: "std-01",
      nis: "20260101",
      nisn: "0165789123",
      fullName: "Muhammad Rizky Pratama",
      nickname: "Rizky",
      gender: "L",
      birthPlace: "Pasuruan",
      birthDate: "2019-04-12",
      classId: "cls-01",
      address: "Dusun Krajan RT 02/01, Desa Kandangan, Tosari",
    },
    {
      id: "std-02",
      nis: "20260102",
      nisn: "0165789124",
      fullName: "Aisyah Putri Rahmadhani",
      nickname: "Aisyah",
      gender: "P",
      birthPlace: "Pasuruan",
      birthDate: "2019-08-20",
      classId: "cls-01",
      address: "Dusun Ledoksari RT 01/02, Desa Kandangan, Tosari",
    },
    {
      id: "std-03",
      nis: "20230401",
      nisn: "0135789155",
      fullName: "Bagas Dimas Setiawan",
      nickname: "Bagas",
      gender: "L",
      birthPlace: "Probolinggo",
      birthDate: "2016-02-14",
      classId: "cls-04",
      address: "Dusun Ngadiwono RT 03/01, Tosari",
    },
    {
      id: "std-04",
      nis: "20230402",
      nisn: "0135789156",
      fullName: "Siti Nurhaliza",
      nickname: "Liza",
      gender: "P",
      birthPlace: "Pasuruan",
      birthDate: "2016-06-30",
      classId: "cls-04",
      address: "Dusun Tosari Tengah RT 02/03, Tosari",
    },
  ];

  for (const s of studentList) {
    await query(
      `INSERT INTO students (
        id, school_id, current_class_id, nis, nisn, full_name, nickname, gender, birth_place, birth_date, address, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'AKTIF')
      ON CONFLICT (school_id, nis) DO UPDATE SET full_name = $6, current_class_id = $3`,
      [
        s.id,
        schoolId,
        s.classId,
        s.nis,
        s.nisn,
        s.fullName,
        s.nickname,
        s.gender,
        s.birthPlace,
        s.birthDate,
        s.address,
      ]
    );
  }

  // 10. Guardians & Student-Guardian Relations
  console.log("9. Menyiapkan Wali Murid Terverifikasi...");
  const guardianId = "grd-01";
  await query(
    `INSERT INTO guardians (id, school_id, user_id, full_name, relationship, phone, is_phone_verified, address, occupation)
     VALUES ($1, $2, 'usr-wali-01', 'Bambang Supriyanto', 'Ayah', '081234567894', true, 'Dusun Krajan, Kandangan, Tosari', 'Petani Peternak Bromo')
     ON CONFLICT (id) DO UPDATE SET full_name = 'Bambang Supriyanto'`,
    [guardianId, schoolId]
  );

  // Link to student 1 (Muhammad Rizky Pratama)
  await query(
    `INSERT INTO student_guardians (id, guardian_id, student_id, is_verified, verified_by, notes)
     VALUES ($1, $2, $3, true, 'usr-admin-01', 'Verifikasi berkas Kartu Keluarga No. 3514050123450001')
     ON CONFLICT (guardian_id, student_id) DO UPDATE SET is_verified = true`,
    ["sg-01", guardianId, "std-01"]
  );

  // 11. Attendance Sessions
  console.log("10. Menyiapkan Sesi Absensi...");
  const sessions = [
    {
      id: "ses-student-in",
      name: "Sesi Pagi (Masuk Siswa)",
      type: "CHECK_IN",
      targetType: "STUDENT",
      startTime: "06:30:00",
      endTime: "07:30:00",
      lateThresholdTime: "07:00:00",
    },
    {
      id: "ses-student-out",
      name: "Sesi Siang (Pulang Siswa)",
      type: "CHECK_OUT",
      targetType: "STUDENT",
      startTime: "12:00:00",
      endTime: "13:30:00",
      lateThresholdTime: "12:00:00",
    },
    {
      id: "ses-teacher-in",
      name: "Sesi Masuk Guru",
      type: "CHECK_IN",
      targetType: "TEACHER",
      startTime: "06:15:00",
      endTime: "07:15:00",
      lateThresholdTime: "06:45:00",
    },
    {
      id: "ses-teacher-out",
      name: "Sesi Pulang Guru",
      type: "CHECK_OUT",
      targetType: "TEACHER",
      startTime: "13:30:00",
      endTime: "15:00:00",
      lateThresholdTime: "13:30:00",
    },
  ];

  for (const ses of sessions) {
    await query(
      `INSERT INTO attendance_sessions (id, school_id, name, type, target_type, start_time, end_time, late_threshold_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET name = $3, start_time = $6, end_time = $7, late_threshold_time = $8`,
      [ses.id, schoolId, ses.name, ses.type, ses.targetType, ses.startTime, ses.endTime, ses.lateThresholdTime]
    );
  }

  // 12. QR Tokens
  console.log("11. Menghasilkan QR Token Unik Siswa & Guru...");
  for (const s of studentList) {
    const tokenStr = `STD-TOSARI-${s.nis}-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
    await query(
      `INSERT INTO qr_tokens (id, school_id, entity_type, entity_id, token, version, is_revoked)
       VALUES ($1, $2, 'STUDENT', $3, $4, 1, false)
       ON CONFLICT (id) DO NOTHING`,
      [`qrt-std-${s.id}`, schoolId, s.id, tokenStr]
    );
  }

  for (const t of teacherList) {
    const tokenStr = `TCH-TOSARI-${t.id}-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
    await query(
      `INSERT INTO qr_tokens (id, school_id, entity_type, entity_id, token, version, is_revoked)
       VALUES ($1, $2, 'TEACHER', $3, $4, 1, false)
       ON CONFLICT (id) DO NOTHING`,
      [`qrt-tch-${t.id}`, schoolId, t.id, tokenStr]
    );
  }

  // 13. Violation Categories
  console.log("12. Menyiapkan Kategori Pelanggaran...");
  const categories = [
    { id: "cat-01", name: "Kedisiplinan Waktu (Keterlambatan)", severity: "RINGAN", description: "Hadir melebihi jam toleransi bel masuk sekolah." },
    { id: "cat-02", name: "Kerapian Seragam & Atribut", severity: "RINGAN", description: "Tidak memakai seragam lengkap, topi/dasi saat upacara." },
    { id: "cat-03", name: "Ketertiban Lingkungan & Kelas", severity: "SEDANG", description: "Membuat gaduh berlebihan atau membuang sampah sembarangan." },
    { id: "cat-04", name: "Sopan Santun & Perilaku", severity: "SEDANG", description: "Perilaku tidak patut terhadap rekan sebaya atau guru." },
  ];

  for (const c of categories) {
    await query(
      `INSERT INTO violation_categories (id, school_id, name, severity, description)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET name = $3`,
      [c.id, schoolId, c.name, c.severity, c.description]
    );
  }

  // 14. Sample Announcements
  console.log("13. Menyiapkan Pengumuman Sekolah...");
  await query(
    `INSERT INTO announcements (id, school_id, title, content, target_role, author_user_id)
     VALUES ($1, $2, $3, $4, 'ALL', 'usr-admin-01')
     ON CONFLICT (id) DO NOTHING`,
    [
      "anc-01",
      schoolId,
      "Pemberitahuan: Pelaksanaan Penilaian Tengah Semester (PTS) Ganjil",
      "Kepada seluruh Bapak/Ibu guru dan wali murid SDN Kandangan I Tosari, PTS Semester Ganjil akan dimulai pada hari Senin depan. Mohon kehadiran tepat waktu pukul 06.45 WIB.",
    ]
  );

  console.log("✅ SEEDING BERHASIL!");
  console.log("--------------------------------------------------");
  console.log("AKUN PENGUJIAN TERSUSUN:");
  console.log("1. ADMIN      : username: admin       | pass: admin123");
  console.log("2. GURU PIKET : username: piket       | pass: piket123");
  console.log("3. WALI KELAS : username: walikelas1  | pass: guru123");
  console.log("4. WALI KELAS : username: walikelas4  | pass: guru123");
  console.log("5. WALI MURID : username: walimurid   | pass: wali123");
  console.log("--------------------------------------------------");
  if (client?.end) {
    await client.end();
  } else if (client?.close) {
    await client.close();
  }
}

runSeed().catch((err) => {
  console.error("❌ Seeding gagal:", err);
  process.exit(1);
});
