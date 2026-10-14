import { NextRequest, NextResponse } from "next/server";
import { requireAuth, verifyClassAccess, verifyStudentAccess } from "@/lib/auth/guards";
import { getDb, schema } from "@/lib/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();

  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "student"; // 'student' or 'teacher'
  const dateParam = url.searchParams.get("date");
  const startDateParam = url.searchParams.get("startDate");
  const endDateParam = url.searchParams.get("endDate");
  let classId = url.searchParams.get("classId");
  let studentId = url.searchParams.get("studentId");
  const statusParam = url.searchParams.get("status");

  const todayStr = new Date().toISOString().split("T")[0];
  const targetDate = dateParam || todayStr;

  try {
    // 1. REKAP ABSENSI GURU
    if (type === "teacher") {
      // Hanya Admin dan Guru Piket yang dapat melihat rekap guru penuh (Guru individu hanya melihat miliknya)
      let teacherCondition = and(
        eq(schema.teacherAttendance.schoolId, session.schoolId),
        startDateParam && endDateParam
          ? and(
              gte(schema.teacherAttendance.date, startDateParam),
              lte(schema.teacherAttendance.date, endDateParam)
            )
          : eq(schema.teacherAttendance.date, targetDate)
      );

      const records = await db
        .select({
          id: schema.teacherAttendance.id,
          teacherId: schema.teacherAttendance.teacherId,
          teacherName: schema.teachers.fullName,
          nip: schema.teachers.nip,
          position: schema.teachers.position,
          date: schema.teacherAttendance.date,
          checkInTime: schema.teacherAttendance.checkInTime,
          checkOutTime: schema.teacherAttendance.checkOutTime,
          status: schema.teacherAttendance.status,
          recordedMethod: schema.teacherAttendance.recordedMethod,
          notes: schema.teacherAttendance.notes,
        })
        .from(schema.teacherAttendance)
        .innerJoin(schema.teachers, eq(schema.teacherAttendance.teacherId, schema.teachers.id))
        .where(teacherCondition);

      return NextResponse.json({
        success: true,
        type: "teacher",
        date: targetDate,
        records,
      });
    }

    // 2. REKAP ABSENSI SISWA
    // Batasan Role:
    if (session.roles.includes("WALI_KELAS") && !session.roles.includes("ADMIN")) {
      if (!session.homeroomClassId) {
        return NextResponse.json({
          success: true,
          records: [],
          stats: { total: 0, hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpa: 0, belumHadir: 0 },
        });
      }
      classId = session.homeroomClassId; // Paksa hanya kelas binaannya
    }

    if (session.roles.includes("WALI_MURID") && !session.roles.includes("ADMIN")) {
      // Ambil hanya anak-anak yang terverifikasi untuk wali murid ini
      const childRelations = await db
        .select({ studentId: schema.studentGuardians.studentId })
        .from(schema.studentGuardians)
        .where(
          and(
            eq(schema.studentGuardians.guardianId, session.guardianId || ""),
            eq(schema.studentGuardians.isVerified, true)
          )
        );

      const allowedStudentIds = childRelations.map((r: any) => r.studentId);
      if (allowedStudentIds.length === 0) {
        return NextResponse.json({
          success: true,
          records: [],
          stats: { total: 0, hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpa: 0, belumHadir: 0 },
        });
      }

      if (studentId && !allowedStudentIds.includes(studentId)) {
        return NextResponse.json(
          { success: false, message: "Akses ditolak: Anda tidak memiliki akses ke data siswa ini." },
          { status: 403 }
        );
      }
    }

    // Ambil daftar siswa aktif yang masuk dalam filter
    const studentConditions = [
      eq(schema.students.schoolId, session.schoolId),
      eq(schema.students.status, "AKTIF"),
    ];

    if (classId) {
      studentConditions.push(eq(schema.students.currentClassId, classId));
    }
    if (studentId) {
      studentConditions.push(eq(schema.students.id, studentId));
    }

    const studentsInScope = await db
      .select({
        id: schema.students.id,
        nis: schema.students.nis,
        nisn: schema.students.nisn,
        fullName: schema.students.fullName,
        gender: schema.students.gender,
        classId: schema.students.currentClassId,
        className: schema.classes.name,
      })
      .from(schema.students)
      .leftJoin(schema.classes, eq(schema.students.currentClassId, schema.classes.id))
      .where(and(...studentConditions));

    // Ambil catatan absensi untuk siswa tersebut pada tanggal / rentang tanggal
    const attendanceConditions = [
      eq(schema.studentAttendance.schoolId, session.schoolId),
      startDateParam && endDateParam
        ? and(
            gte(schema.studentAttendance.date, startDateParam),
            lte(schema.studentAttendance.date, endDateParam)
          )
        : eq(schema.studentAttendance.date, targetDate),
    ];

    if (statusParam) {
      attendanceConditions.push(eq(schema.studentAttendance.status, statusParam));
    }

    const attendanceRecords = await db
      .select({
        id: schema.studentAttendance.id,
        studentId: schema.studentAttendance.studentId,
        date: schema.studentAttendance.date,
        status: schema.studentAttendance.status,
        recordedAt: schema.studentAttendance.recordedAt,
        scanMethod: schema.studentAttendance.scanMethod,
        notes: schema.studentAttendance.notes,
        checkOutTime: schema.studentAttendance.checkOutTime,
        earlyDepartureReason: schema.studentAttendance.earlyDepartureReason,
      })
      .from(schema.studentAttendance)
      .where(and(...attendanceConditions));

    // Petakan absensi ke setiap siswa
    const attendanceMap = new Map();
    for (const record of attendanceRecords) {
      const key = `${record.studentId}_${record.date}`;
      attendanceMap.set(key, record);
    }

    const mergedList = studentsInScope.map((student: any) => {
      const att = attendanceMap.get(`${student.id}_${targetDate}`);
      return {
        studentId: student.id,
        nis: student.nis,
        nisn: student.nisn,
        fullName: student.fullName,
        gender: student.gender,
        classId: student.classId,
        className: student.className || "Tanpa Kelas",
        attendanceId: att ? att.id : null,
        date: targetDate,
        status: att ? att.status : "BELUM_HADIR",
        recordedAt: att ? att.recordedAt : null,
        scanMethod: att ? att.scanMethod : null,
        notes: att ? att.notes : null,
        checkOutTime: att ? att.checkOutTime : null,
      };
    });

    // Hitung statistik
    const total = mergedList.length;
    const hadir = mergedList.filter((m: any) => m.status === "HADIR").length;
    const terlambat = mergedList.filter((m: any) => m.status === "TERLAMBAT").length;
    const izin = mergedList.filter((m: any) => m.status === "IZIN").length;
    const sakit = mergedList.filter((m: any) => m.status === "SAKIT").length;
    const alpa = mergedList.filter((m: any) => m.status === "ALPA").length;
    const pulangCepat = mergedList.filter((m: any) => m.status === "PULANG_CEPAT").length;
    const belumHadir = mergedList.filter((m: any) => m.status === "BELUM_HADIR").length;

    const totalPresent = hadir + terlambat + pulangCepat;
    const rate = total > 0 ? ((totalPresent / total) * 100).toFixed(1) : "0.0";

    return NextResponse.json({
      success: true,
      date: targetDate,
      classId: classId || null,
      stats: {
        total,
        hadir,
        terlambat,
        izin,
        sakit,
        alpa,
        pulangCepat,
        belumHadir,
        persentaseKehadiran: parseFloat(rate),
      },
      records: mergedList,
    });
  } catch (error: any) {
    console.error("Attendance Recap API Error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat data rekap absensi." },
      { status: 500 }
    );
  }
}
