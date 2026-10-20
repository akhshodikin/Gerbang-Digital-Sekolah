import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { getDb, schema } from "@/lib/db";
import { eq, and, like, or } from "drizzle-orm";
import { z } from "zod";
import { logAudit } from "@/lib/audit/audit-logger";
import { generateQrToken } from "@/lib/qr/qr-service";

const studentSchema = z.object({
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

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();

  const url = new URL(req.url);
  const classId = url.searchParams.get("classId");
  const search = url.searchParams.get("search");

  try {
    const conditions = [
      eq(schema.students.schoolId, session.schoolId),
      eq(schema.students.status, "AKTIF"),
    ];

    if (classId) {
      conditions.push(eq(schema.students.currentClassId, classId));
    }

    if (search) {
      conditions.push(
        or(
          like(schema.students.fullName, `%${search}%`),
          like(schema.students.nis, `%${search}%`)
        )!
      );
    }

    const students = await db
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
      .where(and(...conditions));

    return NextResponse.json({ success: true, students });
  } catch (error: any) {
    console.error("Fetch students error:", error);
    return NextResponse.json({ success: false, message: "Gagal memuat data siswa." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();

  try {
    const body = await req.json();
    const parsed = studentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0]?.message || "Format data tidak valid" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Cek apakah NIS sudah terdaftar di sekolah ini
    const [existing] = await db
      .select()
      .from(schema.students)
      .where(and(eq(schema.students.schoolId, session.schoolId), eq(schema.students.nis, data.nis)));

    if (existing) {
      return NextResponse.json(
        { success: false, message: `NIS ${data.nis} sudah digunakan oleh siswa ${existing.fullName}.` },
        { status: 400 }
      );
    }

    const [newStudent] = await db
      .insert(schema.students)
      .values({
        id: crypto.randomUUID(),
        schoolId: session.schoolId,
        nis: data.nis,
        nisn: data.nisn || null,
        fullName: data.fullName,
        nickname: data.nickname || null,
        gender: data.gender,
        birthPlace: data.birthPlace || null,
        birthDate: data.birthDate ? data.birthDate : null,
        photoUrl: data.photoUrl || null,
        currentClassId: data.currentClassId || null,
        address: data.address || null,
        status: "AKTIF",
      })
      .returning();

    // Terbitkan QR Token otomatis untuk siswa baru
    await generateQrToken(session.schoolId, "STUDENT", newStudent.id, session.userId);

    // Jika informasi orang tua / wali disertakan, buat atau tautkan data wali murid
    if (data.parentName) {
      try {
        let guardianId: string | null = null;

        // Cek apakah wali murid dengan nama dan nomor telepon ini sudah ada
        if (data.parentPhone) {
          const [existingGuardian] = await db
            .select()
            .from(schema.guardians)
            .where(
              and(
                eq(schema.guardians.schoolId, session.schoolId),
                eq(schema.guardians.phone, data.parentPhone),
                eq(schema.guardians.fullName, data.parentName)
              )
            );
          if (existingGuardian) {
            guardianId = existingGuardian.id;
          }
        }

        if (!guardianId) {
          const [newGuardian] = await db
            .insert(schema.guardians)
            .values({
              id: crypto.randomUUID(),
              schoolId: session.schoolId,
              fullName: data.parentName,
              relationship: data.parentRelationship || "Orang Tua",
              phone: data.parentPhone || "-",
              isPhoneVerified: Boolean(data.parentPhone),
              whatsappActive: Boolean(data.parentPhone),
              address: data.address || null,
            })
            .returning();
          guardianId = newGuardian.id;
        }

        if (guardianId) {
          await db
            .insert(schema.studentGuardians)
            .values({
              id: crypto.randomUUID(),
              guardianId,
              studentId: newStudent.id,
              isVerified: true,
              verifiedBy: session.userId,
              verifiedAt: new Date(),
              notes: "Tercatat otomatis saat penambahan data siswa",
            });
        }
      } catch (guardErr) {
        console.warn("Gagal menautkan wali murid:", guardErr);
      }
    }

    await logAudit({
      schoolId: session.schoolId,
      userId: session.userId,
      action: "CREATE",
      tableName: "students",
      recordId: newStudent?.id,
      newValues: { nis: data.nis, fullName: data.fullName, parentName: data.parentName, parentPhone: data.parentPhone },
      reason: `Penambahan data siswa baru: ${data.fullName} (NIS: ${data.nis}) oleh ${session.username}`,
    });

    return NextResponse.json({
      success: true,
      message: `Siswa ${newStudent.fullName} berhasil ditambahkan dan QR Code otomatis diterbitkan.`,
      student: newStudent,
    });
  } catch (error: any) {
    console.error("Create student error:", error);
    return NextResponse.json({ success: false, message: "Gagal menyimpan data siswa." }, { status: 500 });
  }
}
