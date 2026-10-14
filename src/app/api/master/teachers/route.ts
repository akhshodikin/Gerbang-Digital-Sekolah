import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { getDb, schema } from "@/lib/db";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { logAudit } from "@/lib/audit/audit-logger";
import { generateQrToken } from "@/lib/qr/qr-service";

const teacherSchema = z.object({
  fullName: z.string().min(2, "Nama guru minimal 2 karakter"),
  nip: z.string().optional().nullable(),
  gender: z.enum(["L", "P"]),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  position: z.string().default("Guru Kelas"),
  status: z.string().default("PNS"),
  address: z.string().optional().nullable(),
  homeroomClassId: z.string().optional().nullable(),
  createAccount: z.boolean().optional().default(false),
  username: z.string().optional().nullable(),
  password: z.string().optional().nullable(),
});

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();

  try {
    const teachers = await db
      .select({
        id: schema.teachers.id,
        schoolId: schema.teachers.schoolId,
        userId: schema.teachers.userId,
        nip: schema.teachers.nip,
        fullName: schema.teachers.fullName,
        gender: schema.teachers.gender,
        phone: schema.teachers.phone,
        email: schema.teachers.email,
        address: schema.teachers.address,
        position: schema.teachers.position,
        status: schema.teachers.status,
        isActive: schema.teachers.isActive,
        photoUrl: schema.users.avatarUrl,
        username: schema.users.username,
        userIsActive: schema.users.isActive,
        homeroomClassId: schema.classes.id,
        homeroomClassName: schema.classes.name,
        gradeLevel: schema.classes.gradeLevel,
      })
      .from(schema.teachers)
      .leftJoin(schema.users, eq(schema.teachers.userId, schema.users.id))
      .leftJoin(schema.classes, eq(schema.classes.homeroomTeacherId, schema.teachers.id))
      .where(eq(schema.teachers.schoolId, session.schoolId));

    // Ambil daftar kelas untuk pilihan dropdown wali kelas
    const schoolClasses = await db
      .select({
        id: schema.classes.id,
        name: schema.classes.name,
        gradeLevel: schema.classes.gradeLevel,
        homeroomTeacherId: schema.classes.homeroomTeacherId,
      })
      .from(schema.classes)
      .where(eq(schema.classes.schoolId, session.schoolId))
      .orderBy(asc(schema.classes.gradeLevel));

    return NextResponse.json({
      success: true,
      teachers,
      classes: schoolClasses,
    });
  } catch (error: any) {
    console.error("Fetch teachers error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat data guru." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();

  try {
    const body = await req.json();
    const parsed = teacherSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsed.error.errors[0]?.message || "Format data tidak valid",
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // 1. Simpan guru ke tabel teachers
    const [newTeacher] = await db
      .insert(schema.teachers)
      .values({
        schoolId: session.schoolId,
        fullName: data.fullName,
        nip: data.nip || null,
        gender: data.gender,
        phone: data.phone || null,
        email: data.email || null,
        position: data.position,
        status: data.status,
        address: data.address || null,
      })
      .returning();

    // 2. Terbitkan token QR Code untuk guru baru
    await generateQrToken(session.schoolId, "TEACHER", newTeacher.id, session.userId);

    // 3. Tangani pembuatan akun login (WALI KELAS atau Guru) jika diminta / jika menjadi wali kelas
    let linkedUserId: string | null = null;
    let targetClass: any = null;

    if (data.homeroomClassId) {
      const [cls] = await db
        .select()
        .from(schema.classes)
        .where(eq(schema.classes.id, data.homeroomClassId));
      targetClass = cls;
    }

    const shouldCreateAccount = data.createAccount || Boolean(data.homeroomClassId);

    if (shouldCreateAccount) {
      // Tentukan username akun
      let targetUsername = data.username?.trim().toLowerCase();
      if (!targetUsername && targetClass) {
        targetUsername = `walikelas${targetClass.gradeLevel}`;
      } else if (!targetUsername && data.nip) {
        targetUsername = `guru_${data.nip.slice(-6)}`;
      } else if (!targetUsername) {
        const cleanName = data.fullName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10);
        targetUsername = `guru_${cleanName}`;
      }

      // Cek apakah username sudah ada
      const [existingUser] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.username, targetUsername));

      if (existingUser) {
        linkedUserId = existingUser.id;
        // Update user jika diperlukan
        await db
          .update(schema.users)
          .set({
            fullName: data.fullName,
            phone: data.phone || existingUser.phone,
            email: data.email || existingUser.email,
          })
          .where(eq(schema.users.id, existingUser.id));

        // Pastikan role WALI_KELAS disematkan jika menjadi wali kelas
        if (targetClass) {
          const [hasRole] = await db
            .select()
            .from(schema.userRoles)
            .where(eq(schema.userRoles.userId, existingUser.id));
          
          if (!hasRole || hasRole.roleId !== "WALI_KELAS") {
            try {
              await db
                .insert(schema.userRoles)
                .values({
                  userId: existingUser.id,
                  roleId: "WALI_KELAS",
                });
            } catch {}
          }
        }
      } else {
        // Buat user baru dengan password default 'guru123'
        const passwordToHash = data.password?.trim() || "guru123";
        const passwordHash = await bcrypt.hash(passwordToHash, 10);

        const [newUser] = await db
          .insert(schema.users)
          .values({
            schoolId: session.schoolId,
            username: targetUsername,
            passwordHash,
            fullName: data.fullName,
            phone: data.phone || null,
            email: data.email || null,
            isActive: true,
          })
          .returning();

        linkedUserId = newUser.id;

        // Sematkan role WALI_KELAS jika wali kelas, atau GURU_PIKET jika piket, atau WALI_KELAS default
        const roleId = targetClass ? "WALI_KELAS" : (data.position.toLowerCase().includes("piket") ? "GURU_PIKET" : "WALI_KELAS");
        await db.insert(schema.userRoles).values({
          userId: newUser.id,
          roleId,
        });
      }

      // Hubungkan guru dengan user account
      if (linkedUserId) {
        await db
          .update(schema.teachers)
          .set({ userId: linkedUserId })
          .where(eq(schema.teachers.id, newTeacher.id));
      }
    }

    // 4. Update relasi kelas jika ditugaskan sebagai wali kelas
    if (data.homeroomClassId) {
      // Lepaskan penugasan lama di kelas ini jika ada guru lain
      await db
        .update(schema.classes)
        .set({ homeroomTeacherId: newTeacher.id })
        .where(eq(schema.classes.id, data.homeroomClassId));
    }

    await logAudit({
      schoolId: session.schoolId,
      userId: session.userId,
      action: "CREATE",
      tableName: "teachers",
      recordId: newTeacher.id,
      newValues: {
        fullName: data.fullName,
        nip: data.nip,
        homeroomClassId: data.homeroomClassId || null,
        userId: linkedUserId,
      },
      reason: `Penambahan guru/GTK baru: ${data.fullName}${targetClass ? ` sebagai Wali ${targetClass.name}` : ""} oleh ${session.username}`,
    });

    return NextResponse.json({
      success: true,
      message: `Data dewan guru ${newTeacher.fullName} berhasil disimpan${targetClass ? ` dan ditugaskan sebagai Wali ${targetClass.name}` : ""}.`,
      teacher: newTeacher,
    });
  } catch (error: any) {
    console.error("Save teacher error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menyimpan data guru: " + (error?.message || "Kesalahan server") },
      { status: 500 }
    );
  }
}
