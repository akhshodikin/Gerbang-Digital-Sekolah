import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { getDb, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();

  const url = new URL(req.url);
  const classId = url.searchParams.get("classId");

  try {
    const conditions = [
      eq(schema.students.schoolId, session.schoolId),
      eq(schema.students.status, "AKTIF"),
    ];

    if (classId) {
      conditions.push(eq(schema.students.currentClassId, classId));
    }

    const students = await db
      .select({
        nis: schema.students.nis,
        nisn: schema.students.nisn,
        fullName: schema.students.fullName,
        gender: schema.students.gender,
        className: schema.classes.name,
        birthPlace: schema.students.birthPlace,
        birthDate: schema.students.birthDate,
        address: schema.students.address,
        parentName: schema.guardians.fullName,
        parentRelationship: schema.guardians.relationship,
        parentPhone: schema.guardians.phone,
      })
      .from(schema.students)
      .leftJoin(schema.classes, eq(schema.students.currentClassId, schema.classes.id))
      .leftJoin(schema.studentGuardians, eq(schema.students.id, schema.studentGuardians.studentId))
      .leftJoin(schema.guardians, eq(schema.studentGuardians.guardianId, schema.guardians.id))
      .where(and(...conditions));

    const rows = students.map((s: any, idx: number) => ({
      "No": idx + 1,
      "NIS": s.nis,
      "NISN": s.nisn || "",
      "Nama Lengkap Siswa": s.fullName,
      "Jenis Kelamin (L/P)": s.gender,
      "Kelas": s.className || "",
      "Tempat Lahir": s.birthPlace || "",
      "Tanggal Lahir (YYYY-MM-DD)": s.birthDate || "",
      "Alamat Domisili Siswa": s.address || "",
      "Nama Orang Tua / Wali": s.parentName || "",
      "Hubungan (Ayah/Ibu/Wali)": s.parentRelationship || "",
      "No Telp / WA Orang Tua": s.parentPhone || "",
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Atur lebar kolom agar rapi
    worksheet["!cols"] = [
      { wch: 5 },  // No
      { wch: 14 }, // NIS
      { wch: 14 }, // NISN
      { wch: 30 }, // Nama Lengkap
      { wch: 10 }, // L/P
      { wch: 12 }, // Kelas
      { wch: 16 }, // Tempat Lahir
      { wch: 16 }, // Tanggal Lahir
      { wch: 35 }, // Alamat
      { wch: 25 }, // Nama Ortu
      { wch: 15 }, // Hubungan
      { wch: 20 }, // No Telp Ortu
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "DATA_SISWA");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
    const filename = `Data_Siswa_SDN_Kandangan_Tosari_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Export XLSX error:", error);
    return NextResponse.json({ success: false, message: "Gagal mengekspor data Excel." }, { status: 500 });
  }
}
