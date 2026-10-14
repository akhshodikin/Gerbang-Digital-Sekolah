import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { getDb, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { logAudit } from "@/lib/audit/audit-logger";

const updateTeacherSchema = z.object({
  fullName: z.string().min(2, "Nama guru minimal 2 karakter"),
  nip: z.string().optional().nullable(),
  gender: z.enum(["L", "P"]),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  position: z.string().default("Guru Kelas"),
  status: z.string().default("PNS"),
  address: z.string().optional().nullable(),
  homeroomClassId: z.string().optional().nullable(),
  createAccount: z.boolean().optional(),
  username: z.string().optional().nullable(),
  newPassword: z.string().optional().nullable(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();
  const teacherId = params.id;

  try {
    const [teacher] = await db
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
        homeroomClassId: schema.classes.id,
        homeroomClassName: schema.classes.name,
      })
      .from(schema.teachers)
      .leftJoin(schema.users, eq(schema.teachers.userId, schema.users.id))
      .leftJoin(schema.classes, eq(schema.classes.homeroomTeacherId, schema.teachers.id))
      .where(and(eq(schema.teachers.id, teacherId), eq(schema.teachers.schoolId, session.schoolId)));

    if (!teacher) {
      return NextResponse.json(
        { success: false, message: "Data guru tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, teacher });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: "Gagal memuat rincian guru." },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();
  const teacherId = params.id;

  try {
    const body = await req.json();
    const parsed = updateTeacherSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0]?.message || "Format data tidak valid" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Cek keberadaan guru
    const [existingTeacher] = await db
      .select()
      .from(schema.teachers)
      .where(and(eq(schema.teachers.id, teacherId), eq(schema.teachers.schoolId, session.schoolId)));

    if (!existingTeacher) {
      return NextResponse.json(
        { success: false, message: "Data guru tidak ditemukan." },
        { status: 404 }
      );
    }

    // 1. Update data dasar guru
    await db
      .update(schema.teachers)
      .set({
        fullName: data.fullName,
        nip: data.nip || null,
        gender: data.gender,
        phone: data.phone || null,
        email: data.email || null,
        position: data.position,
        status: data.status,
        address: data.address || null,
        updatedAt: new Date(),
      })
      .where(eq(schema.teachers.id, teacherId));

    // 2. Kelola Akun Login Pengguna
    let linkedUserId = existingTeacher.userId;

    if (data.createAccount && !linkedUserId) {
      // Buat akun baru jika belum ada
      let targetUsername = data.username?.trim().toLowerCase();
      if (!targetUsername && data.homeroomClassId) {
        const [cls] = await db
          .select()
          .from(schema.classes)
          .where(eq(schema.classes.id, data.homeroomClassId));
        if (cls) targetUsername = `walikelas${cls.gradeLevel}`;
      }
      if (!targetUsername) {
        targetUsername = data.nip ? `guru_${data.nip.slice(-6)}` : `guru_${Date.now().toString().slice(-4)}`;
      }

      const passwordHash = await bcrypt.hash(data.newPassword?.trim() || "guru123", 10);
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

      await db.insert(schema.userRoles).values({
        userId: newUser.id,
        roleId: data.homeroomClassId ? "WALI_KELAS" : "WALI_KELAS",
      });

      await db
        .update(schema.teachers)
        .set({ userId: linkedUserId })
        .where(eq(schema.teachers.id, teacherId));
    } else if (linkedUserId) {
      // Update akun yang sudah ada (nama, email, phone, password baru jika ada)
      const userUpdates: any = {
        fullName: data.fullName,
        phone: data.phone || null,
        email: data.email || null,
        updatedAt: new Date(),
      };

      if (data.username?.trim()) {
        userUpdates.username = data.username.trim().toLowerCase();
      }

      if (data.newPassword?.trim()) {
        userUpdates.passwordHash = await bcrypt.hash(data.newPassword.trim(), 10);
      }

      await db
        .update(schema.users)
        .set(userUpdates)
        .where(eq(schema.users.id, linkedUserId));

      // Pastikan memiliki peran WALI_KELAS jika diangkat menjadi wali kelas
      if (data.homeroomClassId) {
        const [existingRole] = await db
          .select()
          .from(schema.userRoles)
          .where(and(eq(schema.userRoles.userId, linkedUserId), eq(schema.userRoles.roleId, "WALI_KELAS")));
        
        if (!existingRole) {
          try {
            await db.insert(schema.userRoles).values({
              userId: linkedUserId,
              roleId: "WALI_KELAS",
            });
          } catch {}
        }
      }
    }

    // 3. Kelola Penugasan Wali Kelas
    // Lepaskan penugasan lama guru ini dari semua kelas
    await db
      .update(schema.classes)
      .set({ homeroomTeacherId: null })
      .where(eq(schema.classes.homeroomTeacherId, teacherId));

    // Jika ditugaskan ke kelas baru, set kelas tersebut
    if (data.homeroomClassId) {
      await db
        .update(schema.classes)
        .set({ homeroomTeacherId: teacherId })
        .where(eq(schema.classes.id, data.homeroomClassId));
    }

    await logAudit({
      schoolId: session.schoolId,
      userId: session.userId,
      action: "UPDATE",
      tableName: "teachers",
      recordId: teacherId,
      newValues: {
        fullName: data.fullName,
        nip: data.nip,
        position: data.position,
        homeroomClassId: data.homeroomClassId || null,
      },
      reason: `Pembaruan data dewan guru/staf: ${data.fullName} oleh ${session.username}`,
    });

    return NextResponse.json({
      success: true,
      message: `Data guru ${data.fullName} berhasil diperbarui.`,
    });
  } catch (error: any) {
    console.error("Update teacher error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memperbarui data guru." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();
  const teacherId = params.id;

  try {
    const [teacher] = await db
      .select()
      .from(schema.teachers)
      .where(and(eq(schema.teachers.id, teacherId), eq(schema.teachers.schoolId, session.schoolId)));

    if (!teacher) {
      return NextResponse.json(
        { success: false, message: "Data guru tidak ditemukan." },
        { status: 404 }
      );
    }

    // Lepaskan kelas yang diampu
    await db
      .update(schema.classes)
      .set({ homeroomTeacherId: null })
      .where(eq(schema.classes.homeroomTeacherId, teacherId));

    // Hapus data guru
    await db
      .delete(schema.teachers)
      .where(eq(schema.teachers.id, teacherId));

    await logAudit({
      schoolId: session.schoolId,
      userId: session.userId,
      action: "DELETE",
      tableName: "teachers",
      recordId: teacherId,
      oldValues: { fullName: teacher.fullName, nip: teacher.nip },
      reason: `Penghapusan data guru: ${teacher.fullName} oleh ${session.username}`,
    });

    return NextResponse.json({
      success: true,
      message: `Data guru ${teacher.fullName} berhasil dihapus.`,
    });
  } catch (error: any) {
    console.error("Delete teacher error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menghapus data guru." },
      { status: 500 }
    );
  }
}
