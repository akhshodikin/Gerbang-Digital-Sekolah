import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit/audit-logger";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();
  const schoolId = session.schoolId;

  try {
    // Ambil seluruh data tabel sekolah
    const [school] = await db.select().from(schema.schools).where(eq(schema.schools.id, schoolId));
    const schoolSettings = await db.select().from(schema.schoolSettings).where(eq(schema.schoolSettings.schoolId, schoolId));
    const academicYears = await db.select().from(schema.academicYears).where(eq(schema.academicYears.schoolId, schoolId));
    const semesters = await db.select().from(schema.semesters);
    const classes = await db.select().from(schema.classes).where(eq(schema.classes.schoolId, schoolId));
    const teachers = await db.select().from(schema.teachers).where(eq(schema.teachers.schoolId, schoolId));
    const guardians = await db.select().from(schema.guardians).where(eq(schema.guardians.schoolId, schoolId));
    const students = await db.select().from(schema.students).where(eq(schema.students.schoolId, schoolId));
    const studentGuardians = await db.select().from(schema.studentGuardians);
    const attendanceSessions = await db.select().from(schema.attendanceSessions).where(eq(schema.attendanceSessions.schoolId, schoolId));
    const qrTokens = await db.select().from(schema.qrTokens).where(eq(schema.qrTokens.schoolId, schoolId));
    const studentAttendance = await db.select().from(schema.studentAttendance).where(eq(schema.studentAttendance.schoolId, schoolId));
    const teacherAttendance = await db.select().from(schema.teacherAttendance).where(eq(schema.teacherAttendance.schoolId, schoolId));
    const permissions = await db.select().from(schema.permissionRequests).where(eq(schema.permissionRequests.schoolId, schoolId));
    const violationCategories = await db.select().from(schema.violationCategories).where(eq(schema.violationCategories.schoolId, schoolId));
    const studentViolations = await db.select().from(schema.studentViolations).where(eq(schema.studentViolations.schoolId, schoolId));
    const counselingRecords = await db.select().from(schema.counselingRecords).where(eq(schema.counselingRecords.schoolId, schoolId));
    const announcements = await db.select().from(schema.announcements).where(eq(schema.announcements.schoolId, schoolId));
    const auditLogs = await db.select().from(schema.auditLogs).where(eq(schema.auditLogs.schoolId, schoolId));

    const backupData = {
      app: "ABSENSI QR CODE SDN KANDANGAN I TOSARI",
      version: "1.0",
      backupAt: new Date().toISOString(),
      schoolId: schoolId,
      schoolName: school?.name || "SDN Kandangan I Tosari",
      npsn: school?.npsn || "20519101",
      exportedBy: session.username,
      summary: {
        studentsCount: students.length,
        teachersCount: teachers.length,
        guardiansCount: guardians.length,
        classesCount: classes.length,
        studentAttendanceCount: studentAttendance.length,
        teacherAttendanceCount: teacherAttendance.length,
        permissionsCount: permissions.length,
        violationsCount: studentViolations.length,
        counselingCount: counselingRecords.length,
        auditLogsCount: auditLogs.length,
      },
      tables: {
        school,
        schoolSettings,
        academicYears,
        semesters,
        classes,
        teachers,
        guardians,
        students,
        studentGuardians,
        attendanceSessions,
        qrTokens,
        studentAttendance,
        teacherAttendance,
        permissions,
        violationCategories,
        studentViolations,
        counselingRecords,
        announcements,
        auditLogs,
      },
    };

    await logAudit({
      schoolId: session.schoolId,
      userId: session.userId,
      action: "BACKUP",
      tableName: "all_tables",
      reason: `Pencadangan penuh (full backup) database oleh ${session.username}`,
    });

    const jsonString = JSON.stringify(backupData, null, 2);
    const filename = `backup-sdn-kandangan-tosari-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Backup export error:", error);
    return NextResponse.json({ success: false, message: "Gagal membuat cadangan database." }, { status: 500 });
  }
}
