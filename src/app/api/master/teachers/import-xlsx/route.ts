import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { getDb, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { generateQrToken } from "@/lib/qr/qr-service";
import { logAudit } from "@/lib/audit/audit-logger";
import bcrypt from "bcryptjs";
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

    // Gunakan sheet DATA_GURU, DATA_DEWAN_GURU, atau sheet pertama
    const sheetName = workbook.SheetNames.find((s) =>
      s.includes("GURU") || s.includes("TEACHER")
    ) || workbook.SheetNames[0];

    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      return NextResponse.json(
        { success: false, message: "Lembar data guru tidak ditemukan dalam file Excel." },
        { status: 400 }
      );
    }

    const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    if (rawRows.length === 0) {
      return NextResponse.json(
        { success: false, message: "File Excel tidak memuat baris data guru/staf." },
        { status: 400 }
      );
    }

    // Ambil daftar kelas sekolah untuk pencocokan penugasan wali kelas
    const schoolClasses = await db
      .select()
      .from(schema.classes)
      .where(eq(schema.classes.schoolId, session.schoolId));

    const classMap = new Map<string, any>();
    for (const c of schoolClasses) {
      classMap.set(c.name.trim().toLowerCase(), c);
      classMap.set(c.gradeLevel.toString(), c);
      classMap.set(`kelas ${c.gradeLevel}`, c);
      classMap.set(`wali kelas ${c.gradeLevel}`, c);
    }

    let importedCount = 0;
    let updatedCount = 0;
    const errors: { row: number; name?: string; error: string }[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNumber = i + 2; // Baris 1 adalah header di Excel

      // Ekstraksi nilai dengan toleransi variasi penamaan kolom
      const nameRaw = (
        row["Nama Lengkap & Gelar"] ||
        row["Nama Lengkap"] ||
        row["Nama Guru"] ||
        row["Nama"] ||
        row["fullName"] ||
        ""
      ).toString().trim();

      const nipRaw = (row["NIP"] || row["nip"] || "").toString().trim().replace(/[^0-9]/g, "");
      const genderRaw = (
        row["Jenis Kelamin (L/P)"] ||
        row["Jenis Kelamin"] ||
        row["L/P"] ||
        row["gender"] ||
        "L"
      ).toString().trim().toUpperCase();

      const positionRaw = (
        row["Jabatan / Tugas"] ||
        row["Jabatan"] ||
        row["Tugas"] ||
        row["position"] ||
        "Guru Kelas"
      ).toString().trim();

      const statusRaw = (
        row["Status Kepegawaian"] ||
        row["Status"] ||
        row["status"] ||
        "PNS"
      ).toString().trim().toUpperCase();

      const classRaw = (
        row["Wali Kelas"] ||
        row["Kelas"] ||
        row["Rombel"] ||
        row["className"] ||
        ""
      ).toString().trim();

      const usernameRaw = (
        row["Username Login"] ||
        row["Username"] ||
        row["Akun Login"] ||
        row["Akun"] ||
        row["username"] ||
        ""
      ).toString().trim();

      const phoneRaw = (
        row["No Telp / WhatsApp"] ||
        row["No Telp"] ||
        row["No WhatsApp"] ||
        row["No HP"] ||
        row["phone"] ||
        ""
      ).toString().trim();

      const emailRaw = (row["Email"] || row["email"] || "").toString().trim();
      const addressRaw = (
        row["Alamat Domisili"] ||
        row["Alamat"] ||
        row["address"] ||
        ""
      ).toString().trim();

      if (!nameRaw) {
        errors.push({ row: rowNumber, error: "Nama guru wajib diisi" });
        continue;
      }

      const gender = genderRaw === "P" ? "P" : "L";
      let status = "PNS";
      if (statusRaw.includes("PPPK") || statusRaw.includes("P3K")) status = "PPPK";
      else if (statusRaw.includes("HONOR") || statusRaw.includes("GTT") || statusRaw.includes("PTT")) status = "HONORER";

      // Cocokkan kelas wali
      let assignedClass: any = null;
      if (classRaw && classRaw !== "-") {
        assignedClass = classMap.get(classRaw.toLowerCase()) || null;
      }

      // Cek apakah guru sudah terdaftar (berdasarkan NIP jika ada, atau nama lengkap)
      let existingTeacher: any = null;
      if (nipRaw) {
        const [byNip] = await db
          .select()
          .from(schema.teachers)
          .where(
            and(
              eq(schema.teachers.schoolId, session.schoolId),
              eq(schema.teachers.nip, nipRaw)
            )
          );
        existingTeacher = byNip;
      }

      if (!existingTeacher) {
        const [byName] = await db
          .select()
          .from(schema.teachers)
          .where(
            and(
              eq(schema.teachers.schoolId, session.schoolId),
              eq(schema.teachers.fullName, nameRaw)
            )
          );
        existingTeacher = byName;
      }

      let teacherId = "";

      if (existingTeacher) {
        // Update guru yang sudah ada
        await db
          .update(schema.teachers)
          .set({
            fullName: nameRaw,
            nip: nipRaw || existingTeacher.nip,
            gender,
            position: positionRaw || existingTeacher.position,
            status,
            phone: phoneRaw || existingTeacher.phone,
            email: emailRaw || existingTeacher.email,
            address: addressRaw || existingTeacher.address,
            updatedAt: new Date(),
          })
          .where(eq(schema.teachers.id, existingTeacher.id));

        teacherId = existingTeacher.id;
        updatedCount++;
      } else {
        // Buat guru baru
        const [newTeacher] = await db
          .insert(schema.teachers)
          .values({
            schoolId: session.schoolId,
            fullName: nameRaw,
            nip: nipRaw || null,
            gender,
            position: positionRaw,
            status,
            phone: phoneRaw || null,
            email: emailRaw || null,
            address: addressRaw || null,
          })
          .returning();

        teacherId = newTeacher.id;
        importedCount++;

        // Terbitkan QR Code untuk guru baru
        await generateQrToken(session.schoolId, "TEACHER", teacherId, session.userId);
      }

      // =====================================================================
      // FITUR: "serta login sesuai dengan wali kelasnya"
      // Jika guru merupakan Wali Kelas atau memiliki username login yang ditentukan:
      // =====================================================================
      if (assignedClass || usernameRaw) {
        // 1. Hubungkan guru dengan kelas sebagai homeroom teacher
        if (assignedClass) {
          // Lepas guru lain dari kelas ini jika ada
          await db
            .update(schema.classes)
            .set({ homeroomTeacherId: teacherId })
            .where(eq(schema.classes.id, assignedClass.id));
        }

        // 2. Tentukan username akun login
        let usernameToUse = usernameRaw.toLowerCase().replace(/[^a-z0-9_]/g, "");
        if (!usernameToUse && assignedClass) {
          usernameToUse = `walikelas${assignedClass.gradeLevel}`;
        } else if (!usernameToUse && nipRaw) {
          usernameToUse = `guru_${nipRaw.slice(-6)}`;
        } else if (!usernameToUse) {
          const clean = nameRaw.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10);
          usernameToUse = `guru_${clean}`;
        }

        // 3. Cek apakah user dengan username ini sudah ada
        const [existingUser] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.username, usernameToUse));

        let finalUserId = "";

        if (existingUser) {
          finalUserId = existingUser.id;
          // Update data nama & profil user
          await db
            .update(schema.users)
            .set({
              fullName: nameRaw,
              phone: phoneRaw || existingUser.phone,
              email: emailRaw || existingUser.email,
            })
            .where(eq(schema.users.id, existingUser.id));

          // Pastikan user memiliki role WALI_KELAS jika wali kelas
          if (assignedClass) {
            const [roleCheck] = await db
              .select()
              .from(schema.userRoles)
              .where(
                and(
                  eq(schema.userRoles.userId, existingUser.id),
                  eq(schema.userRoles.roleId, "WALI_KELAS")
                )
              );

            if (!roleCheck) {
              try {
                await db.insert(schema.userRoles).values({
                  userId: existingUser.id,
                  roleId: "WALI_KELAS",
                });
              } catch {}
            }
          }
        } else {
          // Buat akun user baru dengan password default 'guru123'
          const defaultPassword = "guru123";
          const passwordHash = await bcrypt.hash(defaultPassword, 10);

          const [newUser] = await db
            .insert(schema.users)
            .values({
              schoolId: session.schoolId,
              username: usernameToUse,
              passwordHash,
              fullName: nameRaw,
              phone: phoneRaw || null,
              email: emailRaw || null,
              isActive: true,
            })
            .returning();

          finalUserId = newUser.id;

          const roleId = assignedClass ? "WALI_KELAS" : (positionRaw.toLowerCase().includes("piket") ? "GURU_PIKET" : "WALI_KELAS");
          await db.insert(schema.userRoles).values({
            userId: newUser.id,
            roleId,
          });
        }

        // Hubungkan guru dengan user account
        if (finalUserId) {
          await db
            .update(schema.teachers)
            .set({ userId: finalUserId })
            .where(eq(schema.teachers.id, teacherId));
        }
      }
    }

    await logAudit({
      schoolId: session.schoolId,
      userId: session.userId,
      action: "IMPORT",
      tableName: "teachers",
      recordId: session.schoolId,
      newValues: { importedCount, updatedCount, totalRows: rawRows.length },
      reason: `Import data dewan guru via Excel: ${importedCount} baru, ${updatedCount} diperbarui oleh ${session.username}`,
    });

    return NextResponse.json({
      success: true,
      message: `Proses impor data guru selesai: ${importedCount} data baru ditambahkan, ${updatedCount} data diperbarui.`,
      importedCount,
      updatedCount,
      totalRows: rawRows.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Import teachers XLSX error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memproses berkas Excel: " + (error?.message || "Kesalahan format berkas") },
      { status: 500 }
    );
  }
}
