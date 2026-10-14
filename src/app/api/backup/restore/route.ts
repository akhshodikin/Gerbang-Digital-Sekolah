import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit/audit-logger";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();
  const schoolId = session.schoolId;

  try {
    let backupJson: any = null;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ success: false, message: "File cadangan JSON wajib diunggah." }, { status: 400 });
      }
      const text = await file.text();
      backupJson = JSON.parse(text);
    } else {
      backupJson = await req.json();
    }

    if (!backupJson || !backupJson.tables) {
      return NextResponse.json(
        { success: false, message: "Format file cadangan tidak valid (struktur tabel tidak ditemukan)." },
        { status: 400 }
      );
    }

    const tables = backupJson.tables;
    const counts = {
      students: 0,
      guardians: 0,
      classes: 0,
      attendance: 0,
    };

    // 1. Restorasi Classes jika ada
    if (Array.isArray(tables.classes)) {
      for (const c of tables.classes) {
        if (!c.id) continue;
        try {
          const [exists] = await db.select().from(schema.classes).where(eq(schema.classes.id, c.id));
          if (!exists) {
            await db.insert(schema.classes).values({
              id: c.id,
              schoolId,
              academicYearId: c.academicYearId,
              homeroomTeacherId: c.homeroomTeacherId || null,
              name: c.name,
              gradeLevel: c.gradeLevel,
              capacity: c.capacity || 30,
            });
            counts.classes++;
          }
        } catch (e) {}
      }
    }

    // 2. Restorasi Guardians
    if (Array.isArray(tables.guardians)) {
      for (const g of tables.guardians) {
        if (!g.id) continue;
        try {
          const [exists] = await db.select().from(schema.guardians).where(eq(schema.guardians.id, g.id));
          if (!exists) {
            await db.insert(schema.guardians).values({
              id: g.id,
              schoolId,
              fullName: g.fullName,
              relationship: g.relationship || "Orang Tua",
              phone: g.phone,
              isPhoneVerified: Boolean(g.isPhoneVerified),
              whatsappActive: Boolean(g.whatsappActive),
              address: g.address || null,
              occupation: g.occupation || null,
            });
            counts.guardians++;
          }
        } catch (e) {}
      }
    }

    // 3. Restorasi Students
    if (Array.isArray(tables.students)) {
      for (const s of tables.students) {
        if (!s.id) continue;
        try {
          const [exists] = await db.select().from(schema.students).where(eq(schema.students.id, s.id));
          if (!exists) {
            await db.insert(schema.students).values({
              id: s.id,
              schoolId,
              nis: s.nis,
              nisn: s.nisn || null,
              fullName: s.fullName,
              nickname: s.nickname || null,
              gender: s.gender,
              currentClassId: s.currentClassId || null,
              birthPlace: s.birthPlace || null,
              birthDate: s.birthDate || null,
              address: s.address || null,
              status: s.status || "AKTIF",
            });
            counts.students++;
          }
        } catch (e) {}
      }
    }

    // 4. Restorasi Student Guardians Link
    if (Array.isArray(tables.studentGuardians)) {
      for (const sg of tables.studentGuardians) {
        if (!sg.guardianId || !sg.studentId) continue;
        try {
          const [exists] = await db
            .select()
            .from(schema.studentGuardians)
            .where(eq(schema.studentGuardians.id, sg.id));
          if (!exists) {
            await db.insert(schema.studentGuardians).values({
              id: sg.id,
              guardianId: sg.guardianId,
              studentId: sg.studentId,
              isVerified: Boolean(sg.isVerified),
              verifiedBy: session.userId,
              notes: sg.notes || "Dipulihkan dari file backup",
            });
          }
        } catch (e) {}
      }
    }

    // 5. Restorasi Student Attendance
    if (Array.isArray(tables.studentAttendance)) {
      for (const att of tables.studentAttendance) {
        if (!att.id) continue;
        try {
          const [exists] = await db.select().from(schema.studentAttendance).where(eq(schema.studentAttendance.id, att.id));
          if (!exists) {
            await db.insert(schema.studentAttendance).values({
              id: att.id,
              schoolId,
              studentId: att.studentId,
              classId: att.classId,
              sessionId: att.sessionId,
              date: att.date,
              status: att.status,
              checkInTime: att.checkInTime ? new Date(att.checkInTime) : null,
              method: att.method || "QR_CODE",
              scannedBy: att.scannedBy || null,
            });
            counts.attendance++;
          }
        } catch (e) {}
      }
    }

    await logAudit({
      schoolId: session.schoolId,
      userId: session.userId,
      action: "RESTORE",
      tableName: "all_tables",
      reason: `Pemulihan (restore) database dari cadangan oleh ${session.username}. Pulih: ${counts.students} siswa, ${counts.guardians} orang tua, ${counts.attendance} rekam absensi.`,
    });

    return NextResponse.json({
      success: true,
      message: `Pemulihan database berhasil! Pulih: ${counts.students} data siswa, ${counts.guardians} orang tua, dan ${counts.attendance} rekam absensi.`,
      restoredSummary: counts,
    });
  } catch (error: any) {
    console.error("Restore error:", error);
    return NextResponse.json(
      { success: false, message: `Gagal memulihkan database: ${error.message || "File rusak"}` },
      { status: 500 }
    );
  }
}
