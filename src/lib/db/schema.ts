import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  uuid,
  time,
  date,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. schools
export const schools = pgTable("schools", {
  id: uuid("id").defaultRandom().primaryKey(),
  npsn: varchar("npsn", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  district: varchar("district", { length: 100 }).notNull().default("Tosari"),
  regency: varchar("regency", { length: 100 }).notNull().default("Kabupaten Pasuruan"),
  province: varchar("province", { length: 100 }).notNull().default("Jawa Timur"),
  postalCode: varchar("postal_code", { length: 10 }),
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 100 }),
  website: varchar("website", { length: 150 }),
  logoUrl: text("logo_url"),
  regionLogoUrl: text("region_logo_url"),
  headmasterName: varchar("headmaster_name", { length: 255 }),
  headmasterNip: varchar("headmaster_nip", { length: 50 }),
  timezone: varchar("timezone", { length: 50 }).notNull().default("Asia/Jakarta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 2. roles
export const roles = pgTable("roles", {
  id: varchar("id", { length: 30 }).primaryKey(), // 'ADMIN', 'WALI_KELAS', 'WALI_MURID', 'GURU_PIKET'
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 3. users
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id")
      .references(() => schools.id)
      .notNull(),
    username: varchar("username", { length: 100 }).notNull().unique(),
    email: varchar("email", { length: 150 }),
    phone: varchar("phone", { length: 30 }),
    passwordHash: text("password_hash").notNull(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    avatarUrl: text("avatar_url"),
    isActive: boolean("is_active").default(true).notNull(),
    lastLoginAt: timestamp("last_login_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    schoolIdx: index("users_school_id_idx").on(table.schoolId),
    usernameIdx: uniqueIndex("users_username_idx").on(table.username),
  })
);

// 4. user_roles
export const userRoles = pgTable(
  "user_roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    roleId: varchar("role_id", { length: 30 })
      .references(() => roles.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userRoleUnq: uniqueIndex("user_roles_user_role_unq").on(table.userId, table.roleId),
  })
);

// 5. academic_years
export const academicYears = pgTable("academic_years", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id")
    .references(() => schools.id)
    .notNull(),
  name: varchar("name", { length: 50 }).notNull(), // e.g., '2026/2027'
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isCurrent: boolean("is_current").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 6. semesters
export const semesters = pgTable("semesters", {
  id: uuid("id").defaultRandom().primaryKey(),
  academicYearId: uuid("academic_year_id")
    .references(() => academicYears.id, { onDelete: "cascade" })
    .notNull(),
  semesterNumber: integer("semester_number").notNull(), // 1 (Ganjil) or 2 (Genap)
  name: varchar("name", { length: 50 }).notNull(), // 'Semester 1 (Ganjil)'
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isCurrent: boolean("is_current").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 7. teachers
export const teachers = pgTable("teachers", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id")
    .references(() => schools.id)
    .notNull(),
  userId: uuid("user_id").references(() => users.id),
  nip: varchar("nip", { length: 50 }),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  gender: varchar("gender", { length: 10 }), // 'L' / 'P'
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 150 }),
  address: text("address"),
  position: varchar("position", { length: 100 }).default("Guru Kelas"),
  status: varchar("status", { length: 30 }).default("PNS"), // 'PNS', 'PPPK', 'HONORER'
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 8. classes
export const classes = pgTable("classes", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id")
    .references(() => schools.id)
    .notNull(),
  academicYearId: uuid("academic_year_id")
    .references(() => academicYears.id)
    .notNull(),
  homeroomTeacherId: uuid("homeroom_teacher_id").references(() => teachers.id),
  name: varchar("name", { length: 50 }).notNull(), // 'Kelas 1', 'Kelas 2'
  gradeLevel: integer("grade_level").notNull(), // 1, 2, 3, 4, 5, 6
  capacity: integer("capacity").default(30),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 9. students
export const students = pgTable(
  "students",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id")
      .references(() => schools.id)
      .notNull(),
    currentClassId: uuid("current_class_id").references(() => classes.id),
    nis: varchar("nis", { length: 50 }).notNull(),
    nisn: varchar("nisn", { length: 50 }),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    nickname: varchar("nickname", { length: 100 }),
    gender: varchar("gender", { length: 10 }).notNull(), // 'L' / 'P'
    birthPlace: varchar("birth_place", { length: 100 }),
    birthDate: date("birth_date"),
    address: text("address"),
    photoUrl: text("photo_url"),
    status: varchar("status", { length: 30 }).default("AKTIF").notNull(), // 'AKTIF', 'LULUS', 'PINDAH', 'KELUAR'
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    nisUnq: uniqueIndex("students_school_nis_unq").on(table.schoolId, table.nis),
    classIdx: index("students_class_idx").on(table.currentClassId),
  })
);

// 10. guardians
export const guardians = pgTable("guardians", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id")
    .references(() => schools.id)
    .notNull(),
  userId: uuid("user_id").references(() => users.id),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  relationship: varchar("relationship", { length: 50 }).notNull().default("Orang Tua"), // 'Ayah', 'Ibu', 'Wali'
  phone: varchar("phone", { length: 30 }).notNull(),
  isPhoneVerified: boolean("is_phone_verified").default(false).notNull(),
  whatsappActive: boolean("whatsapp_active").default(true).notNull(),
  address: text("address"),
  occupation: varchar("occupation", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 11. student_guardians (Relasi Terverifikasi Wali Murid - Siswa)
export const studentGuardians = pgTable(
  "student_guardians",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guardianId: uuid("guardian_id")
      .references(() => guardians.id, { onDelete: "cascade" })
      .notNull(),
    studentId: uuid("student_id")
      .references(() => students.id, { onDelete: "cascade" })
      .notNull(),
    isVerified: boolean("is_verified").default(false).notNull(),
    verifiedBy: uuid("verified_by").references(() => users.id),
    verifiedAt: timestamp("verified_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    unqGuardianStudent: uniqueIndex("unq_guardian_student").on(table.guardianId, table.studentId),
  })
);

// 12. attendance_sessions
export const attendanceSessions = pgTable("attendance_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id")
    .references(() => schools.id)
    .notNull(),
  name: varchar("name", { length: 100 }).notNull(), // 'Sesi Pagi (Masuk)', 'Sesi Siang (Pulang)'
  type: varchar("type", { length: 20 }).notNull(), // 'CHECK_IN' or 'CHECK_OUT'
  targetType: varchar("target_type", { length: 20 }).notNull().default("STUDENT"), // 'STUDENT' or 'TEACHER'
  startTime: time("start_time").notNull(), // '06:30:00'
  endTime: time("end_time").notNull(), // '07:30:00'
  lateThresholdTime: time("late_threshold_time").notNull(), // '07:00:00'
  isActive: boolean("is_active").default(true).notNull(),
  applicableDays: jsonb("applicable_days").$type<number[]>().default([1, 2, 3, 4, 5, 6]), // 1=Senin..6=Sabtu
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 13. qr_tokens
export const qrTokens = pgTable(
  "qr_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id")
      .references(() => schools.id)
      .notNull(),
    entityType: varchar("entity_type", { length: 20 }).notNull(), // 'STUDENT' or 'TEACHER'
    entityId: uuid("entity_id").notNull(), // studentId or teacherId
    token: varchar("token", { length: 128 }).notNull().unique(), // Secure cryptographic random token
    version: integer("version").default(1).notNull(),
    isRevoked: boolean("is_revoked").default(false).notNull(),
    revokedAt: timestamp("revoked_at"),
    revokedReason: text("revoked_reason"),
    issuedAt: timestamp("issued_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    tokenIdx: uniqueIndex("qr_tokens_token_idx").on(table.token),
    entityIdx: index("qr_tokens_entity_idx").on(table.entityType, table.entityId),
  })
);

// 14. student_attendance
export const studentAttendance = pgTable(
  "student_attendance",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id")
      .references(() => schools.id)
      .notNull(),
    studentId: uuid("student_id")
      .references(() => students.id, { onDelete: "cascade" })
      .notNull(),
    classId: uuid("class_id").references(() => classes.id),
    date: date("date").notNull(), // YYYY-MM-DD
    sessionId: uuid("session_id").references(() => attendanceSessions.id),
    status: varchar("status", { length: 30 }).notNull(), // 'HADIR', 'TERLAMBAT', 'IZIN', 'SAKIT', 'ALPA', 'PULANG_CEPAT'
    recordedAt: timestamp("recorded_at").notNull(), // Server timestamp WIB
    scanMethod: varchar("scan_method", { length: 30 }).default("QR").notNull(), // 'QR', 'MANUAL', 'SISTEM_IZIN'
    recordedByUserId: uuid("recorded_by_user_id").references(() => users.id),
    notes: text("notes"),
    permissionRequestId: uuid("permission_request_id"), // Linked if generated from approved leave
    checkOutTime: timestamp("check_out_time"),
    earlyDepartureReason: text("early_departure_reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    studentDateSessionUnq: uniqueIndex("student_date_session_unq").on(
      table.studentId,
      table.date,
      table.sessionId
    ),
    dateIdx: index("student_attendance_date_idx").on(table.date),
    statusIdx: index("student_attendance_status_idx").on(table.status),
  })
);

// 15. teacher_attendance
export const teacherAttendance = pgTable(
  "teacher_attendance",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id")
      .references(() => schools.id)
      .notNull(),
    teacherId: uuid("teacher_id")
      .references(() => teachers.id, { onDelete: "cascade" })
      .notNull(),
    date: date("date").notNull(),
    checkInTime: timestamp("check_in_time"),
    checkOutTime: timestamp("check_out_time"),
    status: varchar("status", { length: 30 }).notNull(), // 'HADIR', 'TERLAMBAT', 'IZIN', 'SAKIT', 'DINAS', 'ALPA'
    recordedMethod: varchar("recorded_method", { length: 30 }).default("QR").notNull(),
    recordedByUserId: uuid("recorded_by_user_id").references(() => users.id),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    teacherDateUnq: uniqueIndex("teacher_date_unq").on(table.teacherId, table.date),
    teacherDateIdx: index("teacher_attendance_date_idx").on(table.date),
  })
);

// 16. permission_requests (Perizinan Siswa)
export const permissionRequests = pgTable(
  "permission_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id")
      .references(() => schools.id)
      .notNull(),
    studentId: uuid("student_id")
      .references(() => students.id, { onDelete: "cascade" })
      .notNull(),
    guardianId: uuid("guardian_id")
      .references(() => guardians.id)
      .notNull(),
    type: varchar("type", { length: 20 }).notNull(), // 'IZIN', 'SAKIT'
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    reason: text("reason").notNull(),
    attachmentUrl: text("attachment_url"), // Private secure file path
    status: varchar("status", { length: 20 }).default("MENUNGGU").notNull(), // 'MENUNGGU', 'DISETUJUI', 'DITOLAK', 'DIBATALKAN'
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id),
    reviewedAt: timestamp("reviewed_at"),
    reviewNotes: text("review_notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    permStudentIdx: index("perm_student_idx").on(table.studentId),
    permStatusIdx: index("perm_status_idx").on(table.status),
  })
);

// 17. violation_categories
export const violationCategories = pgTable("violation_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id")
    .references(() => schools.id)
    .notNull(),
  name: varchar("name", { length: 100 }).notNull(), // 'Kerapian', 'Kedisiplinan Waktu', 'Ketertiban Belajar'
  severity: varchar("severity", { length: 20 }).default("RINGAN").notNull(), // 'RINGAN', 'SEDANG', 'BERAT'
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 18. student_violations (Pelanggaran & Catatan Penanganan)
export const studentViolations = pgTable(
  "student_violations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id")
      .references(() => schools.id)
      .notNull(),
    studentId: uuid("student_id")
      .references(() => students.id, { onDelete: "cascade" })
      .notNull(),
    categoryId: uuid("category_id")
      .references(() => violationCategories.id)
      .notNull(),
    date: date("date").notNull(),
    time: time("time").notNull(),
    location: varchar("location", { length: 150 }).notNull(),
    description: text("description").notNull(), // Faktual dan bermartabat
    initialAction: text("initial_action").notNull(),
    recordedByUserId: uuid("recorded_by_user_id")
      .references(() => users.id)
      .notNull(),
    evidenceFileUrl: text("evidence_file_url"), // Private file attachment
    status: varchar("status", { length: 30 }).default("BARU").notNull(), // 'BARU', 'DALAM_PENANGANAN', 'MENUNGGU_TINDAK_LANJUT', 'SELESAI'
    isParentNotified: boolean("is_parent_notified").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    violationStudentIdx: index("violation_student_idx").on(table.studentId),
  })
);

// 19. violation_followups (Tindak Lanjut & Pembinaan)
export const violationFollowups = pgTable("violation_followups", {
  id: uuid("id").defaultRandom().primaryKey(),
  violationId: uuid("violation_id")
    .references(() => studentViolations.id, { onDelete: "cascade" })
    .notNull(),
  actionTaken: text("action_taken").notNull(),
  studentResponse: text("student_response"),
  parentCommunicationNotes: text("parent_communication_notes"),
  handledByUserId: uuid("handled_by_user_id")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 20. counseling_records (Konseling Sensitif/Rahasia)
export const counselingRecords = pgTable(
  "counseling_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id")
      .references(() => schools.id)
      .notNull(),
    studentId: uuid("student_id")
      .references(() => students.id, { onDelete: "cascade" })
      .notNull(),
    date: date("date").notNull(),
    sessionSummary: text("session_summary").notNull(),
    sensitiveNotes: text("sensitive_notes").notNull(), // Hanya dapat diakses oleh konselor/petugas berwenang
    agreedActionPlan: text("agreed_action_plan"),
    counselorUserId: uuid("counselor_user_id")
      .references(() => users.id)
      .notNull(),
    status: varchar("status", { length: 30 }).default("AKTIF").notNull(), // 'AKTIF', 'SELESAI', 'DIRUJUK'
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    counselingStudentIdx: index("counseling_student_idx").on(table.studentId),
  })
);

// 21. announcements (Pengumuman Sekolah)
export const announcements = pgTable("announcements", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id")
    .references(() => schools.id)
    .notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  targetRole: varchar("target_role", { length: 50 }).default("ALL").notNull(), // 'ALL', 'GURU', 'WALI_MURID'
  targetClassId: uuid("target_class_id").references(() => classes.id),
  authorUserId: uuid("author_user_id")
    .references(() => users.id)
    .notNull(),
  isPublished: boolean("is_published").default(true).notNull(),
  publishedAt: timestamp("published_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 22. conversations (Kanal Chat Internal)
export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id")
    .references(() => schools.id)
    .notNull(),
  type: varchar("type", { length: 30 }).notNull(), // 'DIRECT', 'CLASS_HOMEROOM', 'ADMIN_PICKET'
  title: varchar("title", { length: 255 }),
  relatedClassId: uuid("related_class_id").references(() => classes.id),
  relatedStudentId: uuid("related_student_id").references(() => students.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 23. conversation_members
export const conversationMembers = pgTable(
  "conversation_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .references(() => conversations.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    lastReadAt: timestamp("last_read_at"),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => ({
    unqConvMember: uniqueIndex("unq_conv_member").on(table.conversationId, table.userId),
  })
);

// 24. messages
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .references(() => conversations.id, { onDelete: "cascade" })
      .notNull(),
    senderUserId: uuid("sender_user_id")
      .references(() => users.id)
      .notNull(),
    content: text("content").notNull(),
    sentAt: timestamp("sent_at").defaultNow().notNull(),
    isRead: boolean("is_read").default(false).notNull(),
  },
  (table) => ({
    convMsgIdx: index("conv_msg_idx").on(table.conversationId, table.sentAt),
  })
);

// 25. notification_jobs
export const notificationJobs = pgTable("notification_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id")
    .references(() => schools.id)
    .notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'ATTENDANCE_CHECK_IN', 'ATTENDANCE_LATE', 'ABSENT_CUTOFF', 'PERMISSION_UPDATE'
  recipientPhone: varchar("recipient_phone", { length: 30 }).notNull(),
  recipientName: varchar("recipient_name", { length: 150 }).notNull(),
  messageContent: text("message_content").notNull(),
  status: varchar("status", { length: 20 }).default("PENDING").notNull(), // 'PENDING', 'SENT', 'FAILED', 'NOT_CONFIGURED'
  retryCount: integer("retry_count").default(0).notNull(),
  maxRetries: integer("max_retries").default(3).notNull(),
  scheduledAt: timestamp("scheduled_at").defaultNow().notNull(),
  lastAttemptAt: timestamp("last_attempt_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 26. notification_logs
export const notificationLogs = pgTable("notification_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: uuid("job_id").references(() => notificationJobs.id),
  channel: varchar("channel", { length: 30 }).default("WHATSAPP").notNull(),
  target: varchar("target", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(), // 'SUCCESS', 'FAILED', 'NOT_CONFIGURED'
  responsePayload: text("response_payload"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 27. school_settings
export const schoolSettings = pgTable("school_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id")
    .references(() => schools.id)
    .notNull()
    .unique(),
  checkInStart: time("check_in_start").default("06:30:00").notNull(),
  checkInLateThreshold: time("check_in_late_threshold").default("07:00:00").notNull(),
  checkInCutoffTime: time("check_in_cutoff_time").default("07:30:00").notNull(),
  checkOutStart: time("check_out_start").default("12:00:00").notNull(),
  schoolDays: jsonb("school_days").$type<number[]>().default([1, 2, 3, 4, 5, 6]), // Senin-Sabtu
  enableWhatsappNotifications: boolean("enable_whatsapp_notifications").default(false).notNull(),
  waAttendanceTemplate: text("wa_attendance_template").default(
    "Yth. Wali Siswa {nama_siswa}, ananda tercatat {status} pada pukul {waktu} WIB di SDN Kandangan I Tosari."
  ),
  waLateTemplate: text("wa_late_template").default(
    "Pemberitahuan: Ananda {nama_siswa} tercatat TERLAMBAT pada pukul {waktu} WIB. Mohon koordinasi orang tua."
  ),
  waAbsentTemplate: text("wa_absent_template").default(
    "Pemberitahuan: Hingga pukul {waktu} WIB ananda {nama_siswa} belum tercatat hadir dan belum ada izin terkonfirmasi."
  ),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 28. audit_logs
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id")
      .references(() => schools.id)
      .notNull(),
    userId: uuid("user_id").references(() => users.id),
    action: varchar("action", { length: 50 }).notNull(), // 'LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'CORRECTION', 'SCAN'
    tableName: varchar("table_name", { length: 50 }).notNull(),
    recordId: varchar("record_id", { length: 100 }),
    oldValues: jsonb("old_values"),
    newValues: jsonb("new_values"),
    reason: text("reason"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    auditCreatedIdx: index("audit_created_idx").on(table.createdAt),
    auditTableIdx: index("audit_table_idx").on(table.tableName, table.recordId),
  })
);
