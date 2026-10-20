import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { getDb, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { generateQrToken } from "@/lib/qr/qr-service";
import { logAudit } from "@/lib/audit/audit-logger";
import * as XLSX from "xlsx";
import { parseExcelDate, getRowValue } from "@/lib/utils/excel-date";

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
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

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
      classMap.set(`kls ${c.gradeLevel}`, c.id);
    }

    let successCount = 0;
    let updatedCount = 0;
    const errors: { row: number; nis?: string; error: string }[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNumber = i + 2; // Baris 1 adalah header di Excel

      // 1. Ekstraksi NIS & NISN
      const nisRaw = String(
        getRowValue(row, "NIS", "nis", "Nomor Induk", "No Induk", "No. Induk", "Induk") || ""
      ).trim();

      const nisnRaw = String(
        getRowValue(row, "NISN", "nisn", "Nomor Induk Siswa Nasional") || ""
      ).trim();

      // 2. Ekstraksi Nama Siswa
      const nameRaw = String(
        getRowValue(row, "Nama Lengkap Siswa", "Nama Lengkap", "Nama Siswa", "Nama", "fullName", "Peserta Didik") || ""
      ).trim();

      // 3. Ekstraksi Jenis Kelamin
      const genderRaw = String(
        getRowValue(row, "Jenis Kelamin (L/P)", "Jenis Kelamin", "L/P", "JK", "Gender", "Kelamin") || "L"
      ).trim().toUpperCase();

      // 4. Ekstraksi Kelas
      const classRaw = String(
        getRowValue(row, "Kelas", "Rombel", "Rombongan Belajar", "className", "Tingkat") || ""
      ).trim();

      // 5. Ekstraksi Tempat & Tanggal Lahir
      let birthPlaceRaw = String(
        getRowValue(row, "Tempat Lahir", "Tmpt Lahir", "Tempat", "Kota Lahir", "birthPlace") || ""
      ).trim();

      const birthDateRawValue = getRowValue(
        row,
        "Tanggal Lahir (YYYY-MM-DD)",
        "Tanggal Lahir (DD/MM/YYYY)",
        "Tanggal Lahir",
        "Tgl Lahir",
        "Tgl. Lahir",
        "TGL LAHIR",
        "Tanggal_Lahir",
        "Tgl_Lahir",
        "birthDate",
        "DOB",
        "TTL",
        "Tgl"
      );

      // Jika Tempat Lahir kosong namun kolom tanggal memuat koma (misal: "Pasuruan, 15 Mei 2019" atau "Pasuruan, 15-05-2019")
      let birthDateVal: string | null = null;
      if (typeof birthDateRawValue === "string" && birthDateRawValue.includes(",")) {
        const parts = birthDateRawValue.split(",");
        if (!birthPlaceRaw && parts[0].trim()) {
          birthPlaceRaw = parts[0].trim();
        }
        birthDateVal = parseExcelDate(parts[1]?.trim());
      } else {
        birthDateVal = parseExcelDate(birthDateRawValue);
      }

      // 6. Ekstraksi Alamat
      const addressRaw = String(
        getRowValue(row, "Alamat Domisili Siswa", "Alamat Domisili", "Alamat Siswa", "Alamat", "address", "Domisili", "Tempat Tinggal") || ""
      ).trim();

      // 7. Ekstraksi Data Orang Tua / Wali
      // Prioritas 1: Kolom Nama Orang Tua / Wali gabungan
      let parentName = String(
        getRowValue(
          row,
          "Nama Orang Tua / Wali",
          "Nama Orang Tua/Wali",
          "Nama Orang Tua",
          "Nama Ortu",
          "Nama Wali",
          "Nama Wali Murid",
          "Orang Tua / Wali",
          "Orang Tua/Wali",
          "Orang Tua",
          "Ortu",
          "Wali",
          "parentName"
        ) || ""
      ).trim();

      let parentRel = String(
        getRowValue(row, "Hubungan (Ayah/Ibu/Wali)", "Hubungan", "parentRelationship", "Status Hubungan") || "Orang Tua"
      ).trim();

      // Prioritas 2: Kolom Terpisah Nama Ayah / Nama Ibu (Format Dapodik Kemendikbud)
      if (!parentName) {
        const ayah = String(getRowValue(row, "Nama Ayah", "Nama Ayah Kandung", "Ayah") || "").trim();
        const ibu = String(getRowValue(row, "Nama Ibu", "Nama Ibu Kandung", "Ibu") || "").trim();
        const wali = String(getRowValue(row, "Nama Wali", "Wali") || "").trim();

        if (ayah) {
          parentName = ayah;
          parentRel = "Ayah";
        } else if (ibu) {
          parentName = ibu;
          parentRel = "Ibu";
        } else if (wali) {
          parentName = wali;
          parentRel = "Wali";
        }
      }

      // 8. Ekstraksi No Telp / WhatsApp Orang Tua
      const parentPhoneRaw = String(
        getRowValue(
          row,
          "No Telp / WA Orang Tua",
          "No Telp / WA",
          "No Telp Ortu",
          "No HP Ortu",
          "No WhatsApp Ortu",
          "No HP",
          "No WA",
          "No Telepon",
          "Nomor Telepon",
          "Telepon Ortu",
          "HP Ortu",
          "WA Ortu",
          "parentPhone",
          "Kontak Ortu",
          "No HP Ayah",
          "No HP Ibu"
        ) || ""
      ).trim();
      const parentPhone = parentPhoneRaw.replace(/[^0-9]/g, "");

      // Validasi kolom wajib
      if (!nisRaw) {
        errors.push({ row: rowNumber, error: "Kolom NIS wajib diisi" });
        continue;
      }
      if (!nameRaw) {
        errors.push({ row: rowNumber, nis: nisRaw, error: "Nama lengkap siswa wajib diisi" });
        continue;
      }

      const gender = genderRaw.startsWith("P") ? "P" : "L";

      // Pencocokan kelas
      let matchedClassId: string | null = null;
      if (classRaw) {
        const cleanClassName = classRaw.toLowerCase();
        matchedClassId = classMap.get(cleanClassName) || null;
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
          // Perbarui data siswa
          await db
            .update(schema.students)
            .set({
              nisn: nisnRaw || existingStudent.nisn,
              fullName: nameRaw,
              gender,
              currentClassId: matchedClassId || existingStudent.currentClassId,
              birthPlace: birthPlaceRaw || existingStudent.birthPlace,
              birthDate: birthDateVal !== null ? birthDateVal : existingStudent.birthDate,
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
          } catch {
            // Token sudah ada, abaikan duplikasi
          }
        }

        // Sinkronisasi data Orang Tua / Wali Murid
        if (studentId && parentName) {
          try {
            // 1. Cek apakah siswa ini sudah memiliki relasi wali di studentGuardians
            const [existingLink] = await db
              .select({
                linkId: schema.studentGuardians.id,
                guardianId: schema.studentGuardians.guardianId,
              })
              .from(schema.studentGuardians)
              .where(eq(schema.studentGuardians.studentId, studentId));

            if (existingLink) {
              // Siswa sudah punya wali tertaut: update nama & no telp wali siswa ini
              await db
                .update(schema.guardians)
                .set({
                  fullName: parentName,
                  relationship: parentRel || "Orang Tua",
                  ...(parentPhone ? { phone: parentPhone, whatsappActive: true, isPhoneVerified: true } : {}),
                  ...(addressRaw ? { address: addressRaw } : {}),
                  updatedAt: new Date(),
                })
                .where(eq(schema.guardians.id, existingLink.guardianId));
            } else {
              // 2. Siswa belum punya wali tertaut
              let guardianId: string | null = null;

              // Cari apakah sudah ada wali dengan nomor telepon DAN nama yang sama persis di sekolah (misal saudara kandung)
              if (parentPhone) {
                const [existingGuardian] = await db
                  .select()
                  .from(schema.guardians)
                  .where(
                    and(
                      eq(schema.guardians.schoolId, session.schoolId),
                      eq(schema.guardians.phone, parentPhone),
                      eq(schema.guardians.fullName, parentName)
                    )
                  );
                if (existingGuardian) {
                  guardianId = existingGuardian.id;
                }
              }

              // Jika belum ada wali yang cocok, buatkan record wali baru
              if (!guardianId) {
                const [newG] = await db
                  .insert(schema.guardians)
                  .values({
                    id: crypto.randomUUID(),
                    schoolId: session.schoolId,
                    fullName: parentName,
                    relationship: parentRel || "Orang Tua",
                    phone: parentPhone || "-",
                    isPhoneVerified: Boolean(parentPhone),
                    whatsappActive: Boolean(parentPhone),
                    address: addressRaw || null,
                  })
                  .returning();
                guardianId = newG.id;
              }

              // Tautkan wali ke siswa
              if (guardianId) {
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
      recordId: session.schoolId,
      reason: `Impor data siswa via Excel: ${successCount} baru, ${updatedCount} diperbarui`,
    });

    return NextResponse.json({
      success: true,
      message: `Impor selesai! Berhasil menambahkan ${successCount} siswa baru dan memperbarui ${updatedCount} siswa.`,
      successCount,
      updatedCount,
      errorCount: errors.length,
      errors,
    });
  } catch (error: any) {
    console.error("Import students error:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan internal saat memproses file Excel." },
      { status: 500 }
    );
  }
}
