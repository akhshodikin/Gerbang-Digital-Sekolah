import { getDb } from "./index";
import { sql } from "drizzle-orm";

export async function initializeDatabase() {
  const db = getDb();

  // Create extension for UUID generation if not present
  try {
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
  } catch (e) {
    // pglite supports gen_random_uuid() natively
  }

  // 1. schools
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS schools (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  `);

  // 2. roles
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS roles (
      id VARCHAR(30) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // 3. users
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id),
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
    CREATE INDEX IF NOT EXISTS users_school_id_idx ON users(school_id);
  `);

  // 4. user_roles
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS user_roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_id VARCHAR(30) NOT NULL REFERENCES roles(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT user_roles_user_role_unq UNIQUE (user_id, role_id)
    );
  `);

  // 5. academic_years
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS academic_years (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id),
      name VARCHAR(50) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      is_current BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // 6. semesters
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS semesters (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
      semester_number INTEGER NOT NULL,
      name VARCHAR(50) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      is_current BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // 7. teachers
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS teachers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id),
      user_id UUID REFERENCES users(id),
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
  `);

  // 8. classes
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS classes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id),
      academic_year_id UUID NOT NULL REFERENCES academic_years(id),
      homeroom_teacher_id UUID REFERENCES teachers(id),
      name VARCHAR(50) NOT NULL,
      grade_level INTEGER NOT NULL,
      capacity INTEGER DEFAULT 30,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // 9. students
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS students (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id),
      current_class_id UUID REFERENCES classes(id),
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
    CREATE INDEX IF NOT EXISTS students_class_idx ON students(current_class_id);
  `);

  // 10. guardians
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS guardians (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id),
      user_id UUID REFERENCES users(id),
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
  `);

  // 11. student_guardians
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS student_guardians (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      guardian_id UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      is_verified BOOLEAN NOT NULL DEFAULT FALSE,
      verified_by UUID REFERENCES users(id),
      verified_at TIMESTAMP,
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT unq_guardian_student UNIQUE (guardian_id, student_id)
    );
  `);

  // 12. attendance_sessions
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS attendance_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id),
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
  `);

  // 13. qr_tokens
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS qr_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id),
      entity_type VARCHAR(20) NOT NULL,
      entity_id UUID NOT NULL,
      token VARCHAR(128) NOT NULL UNIQUE,
      version INTEGER NOT NULL DEFAULT 1,
      is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
      revoked_at TIMESTAMP,
      revoked_reason TEXT,
      issued_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS qr_tokens_entity_idx ON qr_tokens(entity_type, entity_id);
  `);

  // 14. student_attendance
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS student_attendance (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id),
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      class_id UUID REFERENCES classes(id),
      date DATE NOT NULL,
      session_id UUID REFERENCES attendance_sessions(id),
      status VARCHAR(30) NOT NULL,
      recorded_at TIMESTAMP NOT NULL,
      scan_method VARCHAR(30) NOT NULL DEFAULT 'QR',
      recorded_by_user_id UUID REFERENCES users(id),
      notes TEXT,
      permission_request_id UUID,
      check_out_time TIMESTAMP,
      early_departure_reason TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT student_date_session_unq UNIQUE (student_id, date, session_id)
    );
    CREATE INDEX IF NOT EXISTS student_attendance_date_idx ON student_attendance(date);
    CREATE INDEX IF NOT EXISTS student_attendance_status_idx ON student_attendance(status);
  `);

  // 15. teacher_attendance
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS teacher_attendance (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id),
      teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      check_in_time TIMESTAMP,
      check_out_time TIMESTAMP,
      status VARCHAR(30) NOT NULL,
      recorded_method VARCHAR(30) NOT NULL DEFAULT 'QR',
      recorded_by_user_id UUID REFERENCES users(id),
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT teacher_date_unq UNIQUE (teacher_id, date)
    );
    CREATE INDEX IF NOT EXISTS teacher_attendance_date_idx ON teacher_attendance(date);
  `);

  // 16. permission_requests
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS permission_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id),
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      guardian_id UUID NOT NULL REFERENCES guardians(id),
      type VARCHAR(20) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      reason TEXT NOT NULL,
      attachment_url TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'MENUNGGU',
      reviewed_by_user_id UUID REFERENCES users(id),
      reviewed_at TIMESTAMP,
      review_notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS perm_student_idx ON permission_requests(student_id);
    CREATE INDEX IF NOT EXISTS perm_status_idx ON permission_requests(status);
  `);

  // 17. violation_categories
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS violation_categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id),
      name VARCHAR(100) NOT NULL,
      severity VARCHAR(20) NOT NULL DEFAULT 'RINGAN',
      description TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // 18. student_violations
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS student_violations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id),
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      category_id UUID NOT NULL REFERENCES violation_categories(id),
      date DATE NOT NULL,
      time TIME NOT NULL,
      location VARCHAR(150) NOT NULL,
      description TEXT NOT NULL,
      initial_action TEXT NOT NULL,
      recorded_by_user_id UUID NOT NULL REFERENCES users(id),
      evidence_file_url TEXT,
      status VARCHAR(30) NOT NULL DEFAULT 'BARU',
      is_parent_notified BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS violation_student_idx ON student_violations(student_id);
  `);

  // 19. violation_followups
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS violation_followups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      violation_id UUID NOT NULL REFERENCES student_violations(id) ON DELETE CASCADE,
      action_taken TEXT NOT NULL,
      student_response TEXT,
      parent_communication_notes TEXT,
      handled_by_user_id UUID NOT NULL REFERENCES users(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // 20. counseling_records
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS counseling_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id),
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      session_summary TEXT NOT NULL,
      sensitive_notes TEXT NOT NULL,
      agreed_action_plan TEXT,
      counselor_user_id UUID NOT NULL REFERENCES users(id),
      status VARCHAR(30) NOT NULL DEFAULT 'AKTIF',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS counseling_student_idx ON counseling_records(student_id);
  `);

  // 21. announcements
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS announcements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id),
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      target_role VARCHAR(50) NOT NULL DEFAULT 'ALL',
      target_class_id UUID REFERENCES classes(id),
      author_user_id UUID NOT NULL REFERENCES users(id),
      is_published BOOLEAN NOT NULL DEFAULT TRUE,
      published_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // 22. conversations
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id),
      type VARCHAR(30) NOT NULL,
      title VARCHAR(255),
      related_class_id UUID REFERENCES classes(id),
      related_student_id UUID REFERENCES students(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // 23. conversation_members
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS conversation_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      last_read_at TIMESTAMP,
      joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT unq_conv_member UNIQUE (conversation_id, user_id)
    );
  `);

  // 24. messages
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_user_id UUID NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
      is_read BOOLEAN NOT NULL DEFAULT FALSE
    );
    CREATE INDEX IF NOT EXISTS conv_msg_idx ON messages(conversation_id, sent_at);
  `);

  // 25. notification_jobs
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS notification_jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id),
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
  `);

  // 26. notification_logs
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS notification_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id UUID REFERENCES notification_jobs(id),
      channel VARCHAR(30) NOT NULL DEFAULT 'WHATSAPP',
      target VARCHAR(50) NOT NULL,
      status VARCHAR(20) NOT NULL,
      response_payload TEXT,
      error_message TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // 27. school_settings
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS school_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL UNIQUE REFERENCES schools(id),
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
  `);

  // 28. audit_logs
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id),
      user_id UUID REFERENCES users(id),
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
    CREATE INDEX IF NOT EXISTS audit_created_idx ON audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS audit_table_idx ON audit_logs(table_name, record_id);
  `);

  return { success: true };
}
