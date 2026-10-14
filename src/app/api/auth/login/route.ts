import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit/audit-logger";

const loginSchema = z.object({
  username: z.string().min(1, "Nama pengguna / username wajib diisi"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0]?.message || "Input tidak valid" },
        { status: 400 }
      );
    }

    const { username, password } = parsed.data;
    const db = getDb();

    // Cari pengguna berdasarkan username
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.username, username.trim().toLowerCase()));

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Nama pengguna atau kata sandi tidak cocok." },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, message: "Akun Anda dinonaktifkan oleh pihak sekolah. Silakan hubungi admin." },
        { status: 403 }
      );
    }

    // Verifikasi kata sandi
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: "Nama pengguna atau kata sandi tidak cocok." },
        { status: 401 }
      );
    }

    // Ambil daftar peran
    const userRolesList = await db
      .select({ roleId: schema.userRoles.roleId })
      .from(schema.userRoles)
      .where(eq(schema.userRoles.userId, user.id));

    const roles = userRolesList.map((r: any) => r.roleId);

    if (roles.length === 0) {
      return NextResponse.json(
        { success: false, message: "Akun Anda belum memiliki peran aktif. Hubungi pihak sekolah." },
        { status: 403 }
      );
    }

    // Ambil data pendukung sesuai peran
    let teacherId: string | null = null;
    let homeroomClassId: string | null = null;
    let guardianId: string | null = null;

    if (roles.includes("WALI_KELAS") || roles.includes("GURU_PIKET")) {
      let [teacher] = await db
        .select()
        .from(schema.teachers)
        .where(eq(schema.teachers.userId, user.id));

      // Fallback: jika guru belum terhubung userId tapi username berpola walikelas{1-6}
      if (!teacher && roles.includes("WALI_KELAS")) {
        const match = user.username.match(/^walikelas([1-6])$/i);
        if (match) {
          const grade = parseInt(match[1]);
          const [matchedClass] = await db
            .select()
            .from(schema.classes)
            .where(
              and(
                eq(schema.classes.schoolId, user.schoolId),
                eq(schema.classes.gradeLevel, grade)
              )
            );
          if (matchedClass && matchedClass.homeroomTeacherId) {
            const [t] = await db
              .select()
              .from(schema.teachers)
              .where(eq(schema.teachers.id, matchedClass.homeroomTeacherId));
            if (t) {
              teacher = t;
              await db
                .update(schema.teachers)
                .set({ userId: user.id })
                .where(eq(schema.teachers.id, t.id));
            }
          }
        }
      }

      if (teacher) {
        teacherId = teacher.id;
        const [cls] = await db
          .select()
          .from(schema.classes)
          .where(eq(schema.classes.homeroomTeacherId, teacher.id));
        if (cls) {
          homeroomClassId = cls.id;
        } else {
          // Fallback penugasan otomatis ke kelas sesuai grade jika belum terkait
          const match = user.username.match(/^walikelas([1-6])$/i);
          if (match) {
            const grade = parseInt(match[1]);
            const [clsByGrade] = await db
              .select()
              .from(schema.classes)
              .where(
                and(
                  eq(schema.classes.schoolId, user.schoolId),
                  eq(schema.classes.gradeLevel, grade)
                )
              );
            if (clsByGrade) {
              homeroomClassId = clsByGrade.id;
              await db
                .update(schema.classes)
                .set({ homeroomTeacherId: teacher.id })
                .where(eq(schema.classes.id, clsByGrade.id));
            }
          }
        }
      }
    }

    if (roles.includes("WALI_MURID")) {
      const [guardian] = await db
        .select()
        .from(schema.guardians)
        .where(eq(schema.guardians.userId, user.id));

      if (guardian) {
        guardianId = guardian.id;
      }
    }

    // Buat sesi JWT aman dalam HTTP-Only Cookie
    await createSession({
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      schoolId: user.schoolId,
      roles,
      teacherId,
      guardianId,
      homeroomClassId,
    });

    // Update lastLoginAt
    await db
      .update(schema.users)
      .set({ lastLoginAt: new Date() })
      .where(eq(schema.users.id, user.id));

    // Audit log
    await logAudit({
      schoolId: user.schoolId,
      userId: user.id,
      action: "LOGIN",
      tableName: "users",
      recordId: user.id,
      reason: `Pengguna ${user.username} (${roles.join(", ")}) berhasil masuk ke sistem.`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent"),
    });

    // Tentukan rute default berdasarkan prioritas peran
    let redirectUrl = "/admin/dashboard";
    if (roles.includes("ADMIN")) redirectUrl = "/admin/dashboard";
    else if (roles.includes("GURU_PIKET")) redirectUrl = "/piket/dashboard";
    else if (roles.includes("WALI_KELAS")) redirectUrl = "/wali-kelas/dashboard";
    else if (roles.includes("WALI_MURID")) redirectUrl = "/wali-murid/dashboard";

    return NextResponse.json({
      success: true,
      message: "Berhasil masuk ke aplikasi.",
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        roles,
      },
      redirectUrl,
    });
  } catch (error: any) {
    console.error("Login API Error:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server saat memproses login." },
      { status: 500 }
    );
  }
}
