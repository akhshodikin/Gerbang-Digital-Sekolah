import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { getDb, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { generateQrToken } from "@/lib/qr/qr-service";
import { logAudit } from "@/lib/audit/audit-logger";
import * as XLSX from "xlsx";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "File Excel (.xlsx) wajib diunggah." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: "buffer" });

    // Gunakan sheet DATA_SISWA atau sheet pertama
    const sheetName = workbook.SheetNames.includes("DATA_SISWA")
      ? "DATA_SISWA"
      : workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      return NextResponse.json(
        { success: false, message: "Sheet data tidak ditemukan di dalam file Excel." },
        { status: 400 }
      );
    }

    const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    if (rawRows.length === 0) {
      return NextResponse.json(
        { success: false, message: "File Excel tidak memuat baris data siswa." },
        { status: 400 }
      );
    }

    // Ambil daftar kelas sekolah untuk pencocokan nama rombel
    const schoolClasses = await db
      .select()
      .from(schema.classes)
      .where(eq(schema.classes.schoolId, session.schoolId));

    const classMap = new Map<string, string>();
    for (const c of schoolClasses) {
      classMap.set(c.name.trim().toLowerCase(), c.id);
      classMap.set(c.gradeLevel.toString(), c.id);
      classMap.set(`kelas ${c.gradeLevel}`, c.id);
    }

    let successCount = 0;
    let updatedCount = 0;
    const errors: { row: number; nis?: string; error: string }[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNumber = i + 2; // Baris 1 adalah header di Excel

      // Ekstraksi nilai dengan toleransi variasi header
      const nisRaw = (row["NIS"] || row["nis"] || row["Nomor Induk"] || "").toString().trim();
      const nisnRaw = (row["NISN"] || row["nisn"] || "").toString().trim();
      const nameRaw = (
        row["Nama Lengkap Siswa"] ||
        row["Nama Lengkap"] ||
        row["Nama"] ||
        row["fullName"] ||
        ""
      ).toString().trim();
      const genderRaw = (
        row["Jenis Kelamin (L/P)"] ||
        row["Jenis Kelamin"] ||
        row["L/P"] ||
        row["gender"] ||
        "L"
      ).toString().trim().toUpperCase();
      const classRaw = (row["Kelas"] || row["Rombel"] || row["className"] || "").toString().trim();
      const birthPlaceRaw = (row["Tempat Lahir"] || row["birthPlace"] || "").toString().trim();
      const birthDateRaw = (
        row["Tanggal Lahir (YYYY-MM-DD)"] ||
        row["Tanggal Lahir"] ||
        row["birthDate"] ||
        ""
      ).toString().trim();
      const addressRaw = (
        row["Alamat Domisili Siswa"] ||
        row["Alamat"] ||
        row["address"] ||
        ""
      ).toString().trim();

      // Data orang tua yang menyatu
      const parentName = (
        row["Nama Orang Tua / Wali"] ||
        row["Nama Orang Tua"] ||
        row["Nama Wali"] ||
        row["parentName"] ||
        ""
      ).toString().trim();
      const parentRel = (
        row["Hubungan (Ayah/Ibu/Wali)"] ||
        row["Hubungan"] ||
        row["parentRelationship"] ||
        "Orang Tua"
      ).toString().trim();
      const parentPhone = (
        row["No Telp / WA Orang Tua"] ||
        row["No Telp Ortu"] ||
        row["No HP Ortu"] ||
        row["No WhatsApp Ortu"] ||
        row["parentPhone"] ||
        ""
      ).toString().trim().replace(/[^0-9]/g, "");

      if (!nisRaw) {
        errors.push({ row: rowNumber, error: "Kolom NIS kosong" });
        continue;
      }
      if (!nameRaw) {
        errors.push({ row: rowNumber, nis: nisRaw, error: "Nama lengkap siswa kosong" });
        continue;
      }

      const gender = genderRaw === "P" ? "P" : "L";

      // Cocokkan kelas
      let matchedClassId: string | null = null;
      if (classRaw) {
        const cleanClassName = classRaw.toLowerCase();
        matchedClassId = classMap.get(cleanClassName) || null;
      }

      // Validasi format tanggal lahir bila ada
      let birthDateVal: string | null = null;
      if (birthDateRaw) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(birthDateRaw)) {
          birthDateVal = birthDateRaw;
        } else if (typeof birthDateRaw === "number") {
          // Tanggal Excel serial number
          try {
            const dateObj = XLSX.SSF.parse_date_code(birthDateRaw);
            birthDateVal = `${dateObj.y}-${String(dateObj.m).padStart(2, "0")}-${String(dateObj.d).padStart(2, "0")}`;
          } catch {
            birthDateVal = null;
          }
        }
      }

      try {
        // Cek apakah siswa dengan NIS ini sudah ada di sekolah
        const [existingStudent] = await db
          .select()
          .from(schema.students)
          .where(
            and(
              eq(schema.students.schoolId, session.schoolId),
              eq(schema.students.nis, nisRaw)
            )
          );

        let studentId = existingStudent?.id;

        if (existingStudent) {
          // Update data siswa
          await db
            .update(schema.students)
            .set({
              nisn: nisnRaw || existingStudent.nisn,
              fullName: nameRaw,
              gender,
              currentClassId: matchedClassId || existingStudent.currentClassId,
              birthPlace: birthPlaceRaw || existingStudent.birthPlace,
              birthDate: birthDateVal || existingStudent.birthDate,
              address: addressRaw || existingStudent.address,
              status: "AKTIF",
              updatedAt: new Date(),
            })
            .where(eq(schema.students.id, existingStudent.id));
          updatedCount++;
        } else {
          // Tambah siswa baru
          const [inserted] = await db
            .insert(schema.students)
            .values({
              id: crypto.randomUUID(),
              schoolId: session.schoolId,
              nis: nisRaw,
              nisn: nisnRaw || null,
              fullName: nameRaw,
              gender,
              currentClassId: matchedClassId,
              birthPlace: birthPlaceRaw || null,
              birthDate: birthDateVal,
              address: addressRaw || null,
              status: "AKTIF",
            })
            .returning();
          studentId = inserted.id;
          successCount++;
        }

        // Terbitkan QR Code otomatis jika belum ada yang aktif
        if (studentId) {
          try {
            await generateQrToken(session.schoolId, "STUDENT", studentId, session.userId);
          } catch (qrErr) {
            // Token mungkin sudah ada, abaikan error duplikasi token
          }
        }

        // Sinkronisasi data Orang Tua / Wali murid
        if (studentId && parentName && parentPhone) {
          try {
            const [existingGuardian] = await db
              .select()
              .from(schema.guardians)
              .where(
                and(
                  eq(schema.guardians.schoolId, session.schoolId),
                  eq(schema.guardians.phone, parentPhone)
                )
              );

            let guardianId = existingGuardian?.id;
            if (!existingGuardian) {
              const [newG] = await db
                .insert(schema.guardians)
                .values({
                  id: crypto.randomUUID(),
                  schoolId: session.schoolId,
                  fullName: parentName,
                  relationship: parentRel || "Orang Tua",
                  phone: parentPhone,
                  isPhoneVerified: true,
                  whatsappActive: true,
                  address: addressRaw || null,
                })
                .returning();
              guardianId = newG.id;
            } else {
              // Update nama jika diperlukan
              await db
                .update(schema.guardians)
                .set({ fullName: parentName, updatedAt: new Date() })
                .where(eq(schema.guardians.id, existingGuardian.id));
            }

            if (guardianId) {
              const [existingLink] = await db
                .select()
                .from(schema.studentGuardians)
                .where(
                  and(
                    eq(schema.studentGuardians.guardianId, guardianId),
                    eq(schema.studentGuardians.studentId, studentId)
                  )
                );

              if (!existingLink) {
                await db
                  .insert(schema.studentGuardians)
                  .values({
                    id: crypto.randomUUID(),
                    guardianId,
                    studentId,
                    isVerified: true,
                    verifiedBy: session.userId,
                    verifiedAt: new Date(),
                    notes: "Impor otomatis melalui Excel (XLSX)",
                  });
              }
            }
          } catch (guardErr) {
            console.warn(`Gagal memproses data orang tua baris ${rowNumber}:`, guardErr);
          }
        }
      } catch (rowError: any) {
        errors.push({ row: rowNumber, nis: nisRaw, error: rowError.message || "Gagal menyimpan baris" });
      }
    }

    await logAudit({
      schoolId: session.schoolId,
      userId: session.userId,
      action: "IMPORT",
      tableName: "students",
      reason: `Impor XLSX Siswa oleh ${session.username}: ${successCount} baru, ${updatedCount} diperbarui, ${errors.length} gagal.`,
    });

    return NextResponse.json({
      success: true,
      message: `Impor selesai! Berhasil menambahkan ${successCount} siswa baru, memperbarui ${updatedCount} data siswa.${errors.length > 0 ? ` (${errors.length} baris dilewati karena kendala validasi)` : ""}`,
      totalProcessed: rawRows.length,
      successCount,
      updatedCount,
      errorCount: errors.length,
      errors,
    });
  } catch (error: any) {
    console.error("Import XLSX error:", error);
    return NextResponse.json(
      { success: false, message: `Gagal memproses file Excel: ${error.message || "Format tidak didukung"}` },
      { status: 500 }
    );
  }
}
