import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { getDb, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { logAudit } from "@/lib/audit/audit-logger";

const updateStudentSchema = z.object({
  nis: z.string().min(1, "NIS wajib diisi"),
  nisn: z.string().optional().nullable(),
  fullName: z.string().min(2, "Nama lengkap siswa minimal 2 karakter"),
  nickname: z.string().optional().nullable(),
  gender: z.enum(["L", "P"]),
  birthPlace: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
  currentClassId: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  parentName: z.string().optional().nullable(),
  parentRelationship: z.string().optional().nullable(),
  parentPhone: z.string().optional().nullable(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();
  const studentId = params.id;

  try {
    const [student] = await db
      .select({
        id: schema.students.id,
        nis: schema.students.nis,
        nisn: schema.students.nisn,
        fullName: schema.students.fullName,
        nickname: schema.students.nickname,
        gender: schema.students.gender,
        birthPlace: schema.students.birthPlace,
        birthDate: schema.students.birthDate,
        photoUrl: schema.students.photoUrl,
        address: schema.students.address,
        currentClassId: schema.students.currentClassId,
        className: schema.classes.name,
        status: schema.students.status,
        parentName: schema.guardians.fullName,
        parentRelationship: schema.guardians.relationship,
        parentPhone: schema.guardians.phone,
        guardianId: schema.guardians.id,
      })
      .from(schema.students)
      .leftJoin(schema.classes, eq(schema.students.currentClassId, schema.classes.id))
      .leftJoin(schema.studentGuardians, eq(schema.students.id, schema.studentGuardians.studentId))
      .leftJoin(schema.guardians, eq(schema.studentGuardians.guardianId, schema.guardians.id))
      .where(and(eq(schema.students.id, studentId), eq(schema.students.schoolId, session.schoolId)));

    if (!student) {
      return NextResponse.json({ success: false, message: "Siswa tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ success: true, student });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "Gagal memuat detail siswa." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();
  const studentId = params.id;

  try {
    const body = await req.json();
    const parsed = updateStudentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0]?.message || "Format data tidak valid" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Pastikan siswa ada di sekolah ini
    const [existing] = await db
      .select()
      .from(schema.students)
      .where(and(eq(schema.students.id, studentId), eq(schema.students.schoolId, session.schoolId)));

    if (!existing) {
      return NextResponse.json({ success: false, message: "Siswa tidak ditemukan." }, { status: 404 });
    }

    // Update data siswa
    await db
      .update(schema.students)
      .set({
        nis: data.nis,
        nisn: data.nisn || null,
        fullName: data.fullName,
        nickname: data.nickname || null,
        gender: data.gender,
        birthPlace: data.birthPlace || null,
        birthDate: data.birthDate ? data.birthDate : null,
        ...(data.photoUrl !== undefined ? { photoUrl: data.photoUrl } : {}),
        currentClassId: data.currentClassId || null,
        address: data.address || null,
        updatedAt: new Date(),
      })
      .where(eq(schema.students.id, studentId));

    // Sinkronisasi data orang tua / wali yang menyatu dengan siswa
    if (data.parentName && data.parentPhone) {
      const [existingLink] = await db
        .select()
        .from(schema.studentGuardians)
        .where(eq(schema.studentGuardians.studentId, studentId));

      if (existingLink) {
        // Update guardian yang sudah tertaut
        await db
          .update(schema.guardians)
          .set({
            fullName: data.parentName,
            relationship: data.parentRelationship || "Orang Tua",
            phone: data.parentPhone,
            updatedAt: new Date(),
          })
          .where(eq(schema.guardians.id, existingLink.guardianId));
      } else {
        // Cek jika nomor telepon sudah ada
        const [existingGuardian] = await db
          .select()
          .from(schema.guardians)
          .where(
            and(
              eq(schema.guardians.schoolId, session.schoolId),
              eq(schema.guardians.phone, data.parentPhone)
            )
          );

        let gId = existingGuardian?.id;
        if (!existingGuardian) {
          const [newG] = await db
            .insert(schema.guardians)
            .values({
              id: crypto.randomUUID(),
              schoolId: session.schoolId,
              fullName: data.parentName,
              relationship: data.parentRelationship || "Orang Tua",
              phone: data.parentPhone,
              isPhoneVerified: true,
              whatsappActive: true,
            })
            .returning();
          gId = newG.id;
        }

        if (gId) {
          await db
            .insert(schema.studentGuardians)
            .values({
              id: crypto.randomUUID(),
              guardianId: gId,
              studentId,
              isVerified: true,
              verifiedBy: session.userId,
              verifiedAt: new Date(),
            });
        }
      }
    }

    await logAudit({
      schoolId: session.schoolId,
      userId: session.userId,
      action: "UPDATE",
      tableName: "students",
      recordId: studentId,
      oldValues: { nis: existing.nis, fullName: existing.fullName },
      newValues: { nis: data.nis, fullName: data.fullName, parentName: data.parentName, parentPhone: data.parentPhone },
      reason: `Pembaruan data siswa & orang tua: ${data.fullName} (NIS: ${data.nis}) oleh ${session.username}`,
    });

    return NextResponse.json({
      success: true,
      message: `Data siswa ${data.fullName} dan orang tua berhasil diperbarui.`,
    });
  } catch (error: any) {
    console.error("Update student error:", error);
    return NextResponse.json({ success: false, message: "Gagal memperbarui data siswa." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();
  const studentId = params.id;

  try {
    const [existing] = await db
      .select()
      .from(schema.students)
      .where(and(eq(schema.students.id, studentId), eq(schema.students.schoolId, session.schoolId)));

    if (!existing) {
      return NextResponse.json({ success: false, message: "Siswa tidak ditemukan." }, { status: 404 });
    }

    // Soft delete: ubah status ke 'KELUAR'
    await db
      .update(schema.students)
      .set({ status: "KELUAR", updatedAt: new Date() })
      .where(eq(schema.students.id, studentId));

    await logAudit({
      schoolId: session.schoolId,
      userId: session.userId,
      action: "DELETE",
      tableName: "students",
      recordId: studentId,
      oldValues: { nis: existing.nis, fullName: existing.fullName },
      reason: `Penonaktifan data siswa: ${existing.fullName} (NIS: ${existing.nis}) oleh ${session.username}`,
    });

    return NextResponse.json({
      success: true,
      message: `Siswa ${existing.fullName} berhasil dinonaktifkan.`,
    });
  } catch (error: any) {
    console.error("Delete student error:", error);
    return NextResponse.json({ success: false, message: "Gagal menghapus siswa." }, { status: 500 });
  }
}
