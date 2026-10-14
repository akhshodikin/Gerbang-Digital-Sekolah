import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { getDb, schema } from "@/lib/db";
import { eq, and, gte, lte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["ADMIN", "WALI_KELAS", "GURU_PIKET"]);
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();

  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "student"; // 'student' or 'teacher'
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];
  let classId = url.searchParams.get("classId");

  if (session.roles.includes("WALI_KELAS") && !session.roles.includes("ADMIN")) {
    classId = session.homeroomClassId || null;
  }

  try {
    let csvRows: string[] = [];

    if (type === "teacher") {
      const condition = and(
        eq(schema.teacherAttendance.schoolId, session.schoolId),
        startDate && endDate
          ? and(gte(schema.teacherAttendance.date, startDate), lte(schema.teacherAttendance.date, endDate))
          : eq(schema.teacherAttendance.date, date)
      );

      const records = await db
        .select({
          teacherName: schema.teachers.fullName,
          nip: schema.teachers.nip,
          position: schema.teachers.position,
          date: schema.teacherAttendance.date,
          status: schema.teacherAttendance.status,
          checkIn: schema.teacherAttendance.checkInTime,
          checkOut: schema.teacherAttendance.checkOutTime,
          notes: schema.teacherAttendance.notes,
        })
        .from(schema.teacherAttendance)
        .innerJoin(schema.teachers, eq(schema.teacherAttendance.teacherId, schema.teachers.id))
        .where(condition);

      csvRows.push("No,Nama Guru,NIP,Jabatan,Tanggal,Status,Jam Masuk,Jam Pulang,Keterangan");
      records.forEach((r: any, idx: number) => {
        const inTime = r.checkIn ? new Date(r.checkIn).toLocaleTimeString("id-ID") : "-";
        const outTime = r.checkOut ? new Date(r.checkOut).toLocaleTimeString("id-ID") : "-";
        csvRows.push(
          `"${idx + 1}","${r.teacherName}","${r.nip || "-"}","${r.position || "-"}","${r.date}","${r.status}","${inTime}","${outTime}","${r.notes || "-"}"`
        );
      });
    } else {
      const studentConditions = [
        eq(schema.students.schoolId, session.schoolId),
        eq(schema.students.status, "AKTIF"),
      ];
      if (classId) studentConditions.push(eq(schema.students.currentClassId, classId));

      const students = await db
        .select({
          id: schema.students.id,
          nis: schema.students.nis,
          fullName: schema.students.fullName,
          className: schema.classes.name,
        })
        .from(schema.students)
        .leftJoin(schema.classes, eq(schema.students.currentClassId, schema.classes.id))
        .where(and(...studentConditions));

      const attConditions = [
        eq(schema.studentAttendance.schoolId, session.schoolId),
        startDate && endDate
          ? and(gte(schema.studentAttendance.date, startDate), lte(schema.studentAttendance.date, endDate))
          : eq(schema.studentAttendance.date, date),
      ];

      const attendances = await db
        .select()
        .from(schema.studentAttendance)
        .where(and(...attConditions));

      const attMap = new Map();
      attendances.forEach((a: any) => attMap.set(`${a.studentId}_${a.date}`, a));

      csvRows.push("No,NIS,Nama Siswa,Kelas,Tanggal,Status,Waktu Tercatat,Metode,Keterangan");
      students.forEach((s: any, idx: number) => {
        const att = attMap.get(`${s.id}_${date}`);
        const status = att ? att.status : "BELUM_HADIR";
        const time = att ? new Date(att.recordedAt).toLocaleTimeString("id-ID") : "-";
        const method = att ? att.scanMethod : "-";
        const notes = att ? att.notes : "-";

        csvRows.push(
          `"${idx + 1}","${s.nis}","${s.fullName}","${s.className || "-"}","${date}","${status}","${time}","${method}","${notes}"`
        );
      });
    }

    // UTF-8 BOM for Excel
    const csvContent = "\uFEFF" + csvRows.join("\r\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="rekap-absensi-${type}-${date}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("Export CSV error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengekspor laporan CSV." },
      { status: 500 }
    );
  }
}
