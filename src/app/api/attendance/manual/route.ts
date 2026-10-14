import { NextRequest, NextResponse } from "next/server";
import { requireAuth, verifyClassAccess } from "@/lib/auth/guards";
import { getDb, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";
import { logAudit } from "@/lib/audit/audit-logger";

const manualAttendanceSchema = z.object({
  studentId: z.string().min(1, "ID Siswa wajib diisi"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
  status: z.enum(["HADIR", "TERLAMBAT", "IZIN", "SAKIT", "ALPA", "PULANG_CEPAT"]),
  notes: z.string().optional(),
  reason: z.string().min(3, "Alasan pencatatan / koreksi manual wajib disertakan"),
  checkOutTime: z.string().optional(),
});

export async function POST(req: NextRequest) {
  // Hanya Admin, Guru Piket, dan Wali Kelas yang berhak memasukkan absensi manual
  const auth = await requireAuth(["ADMIN", "GURU_PIKET", "WALI_KELAS"]);
  if (auth.error) return auth.error;

  const session = auth.session;

  try {
    const body = await req.json();
    const parsed = manualAttendanceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0]?.message || "Format data tidak valid" },
        { status: 400 }
      );
    }

    const { studentId, date, status, notes, reason, checkOutTime } = parsed.data;
    const db = getDb();

    // Dapatkan data siswa dan kelasnya
    const [student] = await db
      .select()
      .from(schema.students)
      .where(and(eq(schema.students.id, studentId), eq(schema.students.schoolId, session.schoolId)));

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Siswa tidak ditemukan." },
        { status: 404 }
      );
    }

    // Jika wali kelas, pastikan siswa berada di kelas binaannya
    if (session.roles.includes("WALI_KELAS") && !session.roles.includes("ADMIN")) {
      const hasAccess = await verifyClassAccess(session, student.currentClassId || "");
      if (!hasAccess) {
        return NextResponse.json(
          { success: false, message: "Akses ditolak: Anda hanya dapat mencatat absensi siswa di kelas binaan Anda." },
          { status: 403 }
        );
      }
    }

    const now = new Date();

    // Cek apakah sudah ada catatan absensi hari tersebut
    const [existing] = await db
      .select()
      .from(schema.studentAttendance)
      .where(
        and(
          eq(schema.studentAttendance.studentId, student.id),
          eq(schema.studentAttendance.date, date)
        )
      );

    if (existing) {
      // Koreksi Absensi
      const oldStatus = existing.status;
      await db
        .update(schema.studentAttendance)
        .set({
          status,
          notes: notes || existing.notes,
          checkOutTime: checkOutTime ? new Date(checkOutTime) : existing.checkOutTime,
          earlyDepartureReason: status === "PULANG_CEPAT" ? reason : existing.earlyDepartureReason,
          updatedAt: now,
        })
        .where(eq(schema.studentAttendance.id, existing.id));

      await logAudit({
        schoolId: session.schoolId,
        userId: session.userId,
        action: "CORRECTION",
        tableName: "student_attendance",
        recordId: existing.id,
        oldValues: { status: oldStatus, notes: existing.notes },
        newValues: { status, notes, reason },
        reason: `Koreksi absensi manual oleh ${session.username}: ${reason}`,
      });

      return NextResponse.json({
        success: true,
        message: `Status kehadiran ${student.fullName} berhasil diperbarui dari ${oldStatus} menjadi ${status}.`,
        recordId: existing.id,
      });
    }

    // Buat catatan baru
    const [inserted] = await db
      .insert(schema.studentAttendance)
      .values({
        id: crypto.randomUUID(),
        schoolId: session.schoolId,
        studentId: student.id,
        classId: student.currentClassId,
        date,
        status,
        recordedAt: now,
        scanMethod: "MANUAL",
        recordedByUserId: session.userId,
        notes: notes || `Pencatatan manual: ${reason}`,
        checkOutTime: checkOutTime ? new Date(checkOutTime) : null,
        earlyDepartureReason: status === "PULANG_CEPAT" ? reason : null,
      })
      .returning();

    await logAudit({
      schoolId: session.schoolId,
      userId: session.userId,
      action: "CREATE",
      tableName: "student_attendance",
      recordId: inserted?.id,
      newValues: { studentId: student.id, date, status, notes, reason },
      reason: `Pencatatan absensi manual: ${student.fullName} (${status})`,
    });

    return NextResponse.json({
      success: true,
      message: `Absensi ${student.fullName} berhasil dicatat sebagai ${status}.`,
      recordId: inserted?.id,
    });
  } catch (error: any) {
    console.error("Manual Attendance API Error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menyimpan absensi manual." },
      { status: 500 }
    );
  }
}
