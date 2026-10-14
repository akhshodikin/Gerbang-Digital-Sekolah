import { getDb, schema } from "../db";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";
import QRCode from "qrcode";
import { logAudit } from "../audit/audit-logger";

export interface ScanResult {
  success: boolean;
  message: string;
  entityType?: "STUDENT" | "TEACHER";
  name?: string;
  nickname?: string;
  identifier?: string; // NIS or NIP
  className?: string;
  status?: string;
  recordedAt?: string;
  isAlreadyScanned?: boolean;
}

export async function generateQrToken(
  schoolId: string,
  entityType: "STUDENT" | "TEACHER",
  entityId: string,
  performedByUserId?: string
): Promise<{ token: string; qrDataUrl: string }> {
  const db = getDb();

  // Revoke active existing tokens for this entity
  await db
    .update(schema.qrTokens)
    .set({
      isRevoked: true,
      revokedAt: new Date(),
      revokedReason: "Diterbitkan token baru",
    })
    .where(
      and(
        eq(schema.qrTokens.entityType, entityType),
        eq(schema.qrTokens.entityId, entityId),
        eq(schema.qrTokens.isRevoked, false)
      )
    );

  // Generate cryptographically secure random token (does not leak student's PII)
  const randomPart = crypto.randomBytes(16).toString("hex").toUpperCase();
  const token = `TOSARI-${entityType.substring(0, 3)}-${randomPart}`;

  await db.insert(schema.qrTokens).values({
    id: crypto.randomUUID(),
    schoolId,
    entityType,
    entityId,
    token,
    version: 1,
    isRevoked: false,
  });

  const qrDataUrl = await QRCode.toDataURL(token, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 320,
    color: {
      dark: "#0F2744",
      light: "#FFFFFF",
    },
  });

  if (performedByUserId) {
    await logAudit({
      schoolId,
      userId: performedByUserId,
      action: "CREATE",
      tableName: "qr_tokens",
      recordId: token,
      reason: `Penerbitan QR Token baru untuk ${entityType} ID: ${entityId}`,
    });
  }

  return { token, qrDataUrl };
}

export async function getQrCodeDataUrl(token: string): Promise<string> {
  return await QRCode.toDataURL(token, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 320,
    color: {
      dark: "#0F2744",
      light: "#FFFFFF",
    },
  });
}

export async function revokeQrToken(
  tokenId: string,
  reason: string,
  performedByUserId: string,
  schoolId: string
): Promise<boolean> {
  const db = getDb();
  await db
    .update(schema.qrTokens)
    .set({
      isRevoked: true,
      revokedAt: new Date(),
      revokedReason: reason,
    })
    .where(eq(schema.qrTokens.id, tokenId));

  await logAudit({
    schoolId,
    userId: performedByUserId,
    action: "UPDATE",
    tableName: "qr_tokens",
    recordId: tokenId,
    reason: `Pencabutan QR Token: ${reason}`,
  });

  return true;
}

/**
 * Validasi dan proses pemindaian QR Code berdasarkan server time WIB.
 */
export async function processQrScan(
  schoolId: string,
  tokenString: string,
  scannedByUserId: string
): Promise<ScanResult> {
  const db = getDb();

  // 1. Cari token di database
  const [tokenRecord] = await db
    .select()
    .from(schema.qrTokens)
    .where(and(eq(schema.qrTokens.token, tokenString.trim()), eq(schema.qrTokens.schoolId, schoolId)));

  if (!tokenRecord) {
    return {
      success: false,
      message: "QR Code tidak dikenali atau tidak terdaftar di sistem SDN Kandangan I Tosari.",
    };
  }

  if (tokenRecord.isRevoked) {
    return {
      success: false,
      message: `QR Code sudah dicabut atau tidak berlaku lagi (${tokenRecord.revokedReason || "Kadaluwarsa"}). Silakan hubungi admin sekolah.`,
    };
  }

  // Waktu Server Jakarta (WIB)
  const now = new Date();
  const todayDateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentSeconds = now.getSeconds();
  const timeFormatted = `${String(currentHours).padStart(2, "0")}:${String(currentMinutes).padStart(2, "0")}:${String(currentSeconds).padStart(2, "0")}`;

  // Ambil pengaturan sekolah untuk batas jam
  const [settings] = await db
    .select()
    .from(schema.schoolSettings)
    .where(eq(schema.schoolSettings.schoolId, schoolId));

  const lateThreshold = settings?.checkInLateThreshold || "07:00:00";
  const isLate = timeFormatted > lateThreshold;

  // 2. Jika entitas SISWA
  if (tokenRecord.entityType === "STUDENT") {
    const [student] = await db
      .select({
        id: schema.students.id,
        nis: schema.students.nis,
        fullName: schema.students.fullName,
        currentClassId: schema.students.currentClassId,
        status: schema.students.status,
      })
      .from(schema.students)
      .where(eq(schema.students.id, tokenRecord.entityId));

    if (!student) {
      return { success: false, message: "Data siswa yang terhubung dengan QR Code tidak ditemukan." };
    }

    if (student.status !== "AKTIF") {
      return { success: false, message: `Status siswa tidak aktif (${student.status}). Absensi ditolak.` };
    }

    // Ambil nama kelas
    let className = "-";
    if (student.currentClassId) {
      const [cls] = await db
        .select({ name: schema.classes.name })
        .from(schema.classes)
        .where(eq(schema.classes.id, student.currentClassId));
      if (cls) className = cls.name;
    }

    // Ambil sesi absensi aktif untuk siswa (masuk)
    const [session] = await db
      .select()
      .from(schema.attendanceSessions)
      .where(
        and(
          eq(schema.attendanceSessions.schoolId, schoolId),
          eq(schema.attendanceSessions.targetType, "STUDENT"),
          eq(schema.attendanceSessions.type, "CHECK_IN")
        )
      );

    const sessionId = session ? session.id : null;

    // Periksa apakah sudah pernah discan hari ini pada sesi yang sama
    const [existingAttendance] = await db
      .select()
      .from(schema.studentAttendance)
      .where(
        and(
          eq(schema.studentAttendance.studentId, student.id),
          eq(schema.studentAttendance.date, todayDateStr),
          sessionId ? eq(schema.studentAttendance.sessionId, sessionId) : sql`1=1`
        )
      );

    if (existingAttendance) {
      return {
        success: false,
        isAlreadyScanned: true,
        message: `Siswa ${student.fullName} sudah tercatat ${existingAttendance.status} hari ini pada pukul ${existingAttendance.recordedAt.toLocaleTimeString("id-ID")}.`,
        name: student.fullName,
        identifier: student.nis,
        className,
        status: existingAttendance.status,
        recordedAt: existingAttendance.recordedAt.toISOString(),
      };
    }

    // Simpan absensi siswa baru
    const attendanceStatus = isLate ? "TERLAMBAT" : "HADIR";

    await db.insert(schema.studentAttendance).values({
      id: crypto.randomUUID(),
      schoolId,
      studentId: student.id,
      classId: student.currentClassId,
      date: todayDateStr,
      sessionId,
      status: attendanceStatus,
      recordedAt: now,
      scanMethod: "QR",
      recordedByUserId: scannedByUserId,
      notes: isLate ? `Terlambat hadir pada ${timeFormatted} WIB (Batas: ${lateThreshold})` : "Tepat waktu",
    });

    await logAudit({
      schoolId,
      userId: scannedByUserId,
      action: "SCAN",
      tableName: "student_attendance",
      recordId: student.id,
      newValues: { status: attendanceStatus, time: timeFormatted, nis: student.nis },
      reason: `Scan QR Absensi Siswa: ${student.fullName} (${attendanceStatus})`,
    });

    return {
      success: true,
      message: isLate
        ? `Siswa ${student.fullName} tercatat TERLAMBAT (${timeFormatted} WIB)`
        : `Siswa ${student.fullName} berhasil tercatat HADIR (${timeFormatted} WIB)`,
      entityType: "STUDENT",
      name: student.fullName,
      nickname: student.nickname || undefined,
      identifier: student.nis,
      className,
      status: attendanceStatus,
      recordedAt: now.toISOString(),
    };
  }

  // 3. Jika entitas GURU
  if (tokenRecord.entityType === "TEACHER") {
    const [teacher] = await db
      .select()
      .from(schema.teachers)
      .where(eq(schema.teachers.id, tokenRecord.entityId));

    if (!teacher) {
      return { success: false, message: "Data guru yang terhubung dengan QR Code tidak ditemukan." };
    }

    // Periksa absensi guru hari ini
    const [existingAttendance] = await db
      .select()
      .from(schema.teacherAttendance)
      .where(and(eq(schema.teacherAttendance.teacherId, teacher.id), eq(schema.teacherAttendance.date, todayDateStr)));

    // Jika belum check in, proses Datang
    if (!existingAttendance) {
      const attendanceStatus = isLate ? "TERLAMBAT" : "HADIR";
      await db.insert(schema.teacherAttendance).values({
        id: crypto.randomUUID(),
        schoolId,
        teacherId: teacher.id,
        date: todayDateStr,
        checkInTime: now,
        status: attendanceStatus,
        recordedMethod: "QR",
        recordedByUserId: scannedByUserId,
        notes: isLate ? `Hadir terlambat pada ${timeFormatted} WIB` : "Hadir tepat waktu",
      });

      await logAudit({
        schoolId,
        userId: scannedByUserId,
        action: "SCAN",
        tableName: "teacher_attendance",
        recordId: teacher.id,
        newValues: { status: attendanceStatus, checkIn: timeFormatted },
        reason: `Scan QR Guru Datang: ${teacher.fullName}`,
      });

      return {
        success: true,
        message: `Guru ${teacher.fullName} berhasil tercatat DATANG (${attendanceStatus} pada ${timeFormatted} WIB)`,
        entityType: "TEACHER",
        name: teacher.fullName,
        identifier: teacher.nip || "-",
        className: teacher.position || "Guru",
        status: attendanceStatus,
        recordedAt: now.toISOString(),
      };
    }

    // Jika sudah check in tapi belum checkout dan sekarang adalah waktu checkout (>12:00)
    if (!existingAttendance.checkOutTime && currentHours >= 11) {
      await db
        .update(schema.teacherAttendance)
        .set({
          checkOutTime: now,
          updatedAt: now,
        })
        .where(eq(schema.teacherAttendance.id, existingAttendance.id));

      await logAudit({
        schoolId,
        userId: scannedByUserId,
        action: "SCAN",
        tableName: "teacher_attendance",
        recordId: teacher.id,
        newValues: { checkOut: timeFormatted },
        reason: `Scan QR Guru Pulang: ${teacher.fullName}`,
      });

      return {
        success: true,
        message: `Guru ${teacher.fullName} berhasil mencatatkan PULANG pada ${timeFormatted} WIB`,
        entityType: "TEACHER",
        name: teacher.fullName,
        identifier: teacher.nip || "-",
        className: teacher.position || "Guru",
        status: "PULANG",
        recordedAt: now.toISOString(),
      };
    }

    return {
      success: false,
      isAlreadyScanned: true,
      message: `Guru ${teacher.fullName} sudah tercatat kehadiran hari ini (Datang: ${existingAttendance.checkInTime?.toLocaleTimeString("id-ID")}${existingAttendance.checkOutTime ? `, Pulang: ${existingAttendance.checkOutTime.toLocaleTimeString("id-ID")}` : ""}).`,
      name: teacher.fullName,
      identifier: teacher.nip || "-",
      status: existingAttendance.status,
    };
  }

  return { success: false, message: "Jenis entitas tidak didukung." };
}
