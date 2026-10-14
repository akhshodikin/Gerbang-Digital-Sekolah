import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { getDb, schema } from "@/lib/db";
import { eq, asc } from "drizzle-orm";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();

  try {
    const teachers = await db
      .select({
        id: schema.teachers.id,
        nip: schema.teachers.nip,
        fullName: schema.teachers.fullName,
        gender: schema.teachers.gender,
        phone: schema.teachers.phone,
        email: schema.teachers.email,
        address: schema.teachers.address,
        position: schema.teachers.position,
        status: schema.teachers.status,
        isActive: schema.teachers.isActive,
        username: schema.users.username,
        homeroomClassName: schema.classes.name,
      })
      .from(schema.teachers)
      .leftJoin(schema.users, eq(schema.teachers.userId, schema.users.id))
      .leftJoin(schema.classes, eq(schema.classes.homeroomTeacherId, schema.teachers.id))
      .where(eq(schema.teachers.schoolId, session.schoolId))
      .orderBy(asc(schema.teachers.fullName));

    const rows = teachers.map((t: any, idx: number) => ({
      "No": idx + 1,
      "Nama Lengkap & Gelar": t.fullName,
      "NIP": t.nip || "-",
      "Jenis Kelamin (L/P)": t.gender || "-",
      "Jabatan / Tugas": t.position || "Guru Kelas",
      "Status Kepegawaian": t.status || "PNS",
      "Wali Kelas": t.homeroomClassName || "-",
      "Username Akun Login": t.username || "-",
      "No Telp / WhatsApp": t.phone || "-",
      "Email": t.email || "-",
      "Alamat Domisili": t.address || "-",
      "Status": t.isActive ? "AKTIF" : "NONAKTIF",
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Atur lebar kolom agar rapi
    worksheet["!cols"] = [
      { wch: 5 },  // No
      { wch: 30 }, // Nama Lengkap
      { wch: 22 }, // NIP
      { wch: 10 }, // L/P
      { wch: 25 }, // Jabatan
      { wch: 20 }, // Kepegawaian
      { wch: 15 }, // Wali Kelas
      { wch: 20 }, // Username Login
      { wch: 20 }, // No Telp
      { wch: 28 }, // Email
      { wch: 35 }, // Alamat
      { wch: 12 }, // Status
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "DATA_DEWAN_GURU");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
    const filename = `Data_Dewan_Guru_SDN_Kandangan_Tosari_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Export teachers XLSX error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengekspor data guru ke Excel." },
      { status: 500 }
    );
  }
}
