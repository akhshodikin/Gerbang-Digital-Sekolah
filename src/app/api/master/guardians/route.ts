import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { getDb, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { logAudit } from "@/lib/audit/audit-logger";

const linkGuardianSchema = z.object({
  guardianId: z.string().min(1, "ID Wali murid wajib diisi"),
  studentId: z.string().min(1, "ID Siswa wajib diisi"),
  notes: z.string().optional(),
});

export async function GET() {
  const auth = await requireAuth(["ADMIN", "WALI_KELAS"]);
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();

  try {
    const guardians = await db
      .select({
        id: schema.guardians.id,
        fullName: schema.guardians.fullName,
        relationship: schema.guardians.relationship,
        phone: schema.guardians.phone,
        isPhoneVerified: schema.guardians.isPhoneVerified,
        address: schema.guardians.address,
        occupation: schema.guardians.occupation,
      })
      .from(schema.guardians)
      .where(eq(schema.guardians.schoolId, session.schoolId));

    // Ambil daftar anak yang terhubung dan diverifikasi
    const result = [];
    for (const g of guardians) {
      const children = await db
        .select({
          studentId: schema.students.id,
          studentName: schema.students.fullName,
          studentNis: schema.students.nis,
          className: schema.classes.name,
          isVerified: schema.studentGuardians.isVerified,
          verifiedAt: schema.studentGuardians.verifiedAt,
          notes: schema.studentGuardians.notes,
        })
        .from(schema.studentGuardians)
        .innerJoin(schema.students, eq(schema.studentGuardians.studentId, schema.students.id))
        .leftJoin(schema.classes, eq(schema.students.currentClassId, schema.classes.id))
        .where(eq(schema.studentGuardians.guardianId, g.id));

      result.push({
        ...g,
        children,
      });
    }

    return NextResponse.json({ success: true, guardians: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "Gagal memuat data wali murid." }, { status: 500 });
  }
}

// POST: Tambah wali murid baru ATAU verifikasi relasi dengan siswa
export async function POST(req: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();

  try {
    const body = await req.json();

    // Skenario 1: Tambah profil wali murid baru
    if (body.fullName && !body.guardianId) {
      if (body.fullName.trim().length < 2) {
        return NextResponse.json(
          { success: false, message: "Nama lengkap wali murid minimal 2 karakter." },
          { status: 400 }
        );
      }

      const [newG] = await db
        .insert(schema.guardians)
        .values({
          id: crypto.randomUUID(),
          schoolId: session.schoolId,
          fullName: body.fullName.trim(),
          relationship: body.relationship || "Orang Tua",
          phone: body.phone?.trim() || "-",
          address: body.address?.trim() || null,
          occupation: body.occupation?.trim() || null,
          isPhoneVerified: Boolean(body.phone?.trim()),
          whatsappActive: Boolean(body.phone?.trim()),
        })
        .returning();

      // Jika langsung disertakan studentId untuk verifikasi
      if (body.studentId) {
        await db.insert(schema.studentGuardians).values({
          id: crypto.randomUUID(),
          guardianId: newG.id,
          studentId: body.studentId,
          isVerified: true,
          verifiedBy: session.userId,
          verifiedAt: new Date(),
          notes: body.notes || "Diverifikasi saat penambahan akun wali murid",
        });
      }

      await logAudit({
        schoolId: session.schoolId,
        userId: session.userId,
        action: "CREATE",
        tableName: "guardians",
        recordId: newG.id,
        reason: `Penambahan wali murid baru ${newG.fullName} oleh ${session.username}`,
      });

      return NextResponse.json({
        success: true,
        message: `Wali murid ${newG.fullName} berhasil ditambahkan.`,
        guardian: newG,
      });
    }

    // Skenario 2: Tautkan / verifikasi relasi wali murid dengan siswa
    const parsed = linkGuardianSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0]?.message || "Format data tidak valid" },
        { status: 400 }
      );
    }

    const { guardianId, studentId, notes } = parsed.data;

    // Cek apakah sudah ada relasi
    const [existing] = await db
      .select()
      .from(schema.studentGuardians)
      .where(
        and(
          eq(schema.studentGuardians.guardianId, guardianId),
          eq(schema.studentGuardians.studentId, studentId)
        )
      );

    if (existing) {
      await db
        .update(schema.studentGuardians)
        .set({
          isVerified: true,
          verifiedBy: session.userId,
          verifiedAt: new Date(),
          notes: notes || "Diverifikasi resmi oleh admin sekolah",
        })
        .where(eq(schema.studentGuardians.id, existing.id));
    } else {
      await db.insert(schema.studentGuardians).values({
        guardianId,
        studentId,
        isVerified: true,
        verifiedBy: session.userId,
        verifiedAt: new Date(),
        notes: notes || "Diverifikasi resmi oleh admin sekolah",
      });
    }

    await logAudit({
      schoolId: session.schoolId,
      userId: session.userId,
      action: "UPDATE",
      tableName: "student_guardians",
      recordId: `${guardianId}_${studentId}`,
      reason: `Verifikasi resmi hubungan wali murid dan siswa oleh ${session.username}`,
    });

    return NextResponse.json({
      success: true,
      message: "Hubungan wali murid dan siswa berhasil diverifikasi oleh sekolah.",
    });
  } catch (error: any) {
    console.error("Create / link guardian error:", error);
    return NextResponse.json({ success: false, message: "Gagal memproses data wali murid." }, { status: 500 });
  }
}

// DELETE: Memutus relasi / tautan verifikasi siswa dengan wali murid
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();

  const url = new URL(req.url);
  const guardianId = url.searchParams.get("guardianId");
  const studentId = url.searchParams.get("studentId");

  if (!guardianId || !studentId) {
    return NextResponse.json(
      { success: false, message: "Parameter guardianId dan studentId wajib disertakan." },
      { status: 400 }
    );
  }

  try {
    // Ambil info nama untuk audit log
    const [guardian] = await db
      .select({ fullName: schema.guardians.fullName })
      .from(schema.guardians)
      .where(eq(schema.guardians.id, guardianId));

    const [student] = await db
      .select({ fullName: schema.students.fullName })
      .from(schema.students)
      .where(eq(schema.students.id, studentId));

    await db
      .delete(schema.studentGuardians)
      .where(
        and(
          eq(schema.studentGuardians.guardianId, guardianId),
          eq(schema.studentGuardians.studentId, studentId)
        )
      );

    await logAudit({
      schoolId: session.schoolId,
      userId: session.userId,
      action: "DELETE",
      tableName: "student_guardians",
      recordId: `${guardianId}_${studentId}`,
      reason: `Pemutusan relasi siswa ${student?.fullName || studentId} dari wali murid ${guardian?.fullName || guardianId} oleh ${session.username}`,
    });

    return NextResponse.json({
      success: true,
      message: `Tautan siswa ${student?.fullName || ""} berhasil diputuskan dari wali murid.`,
    });
  } catch (error: any) {
    console.error("Delete relation error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memutus relasi siswa." },
      { status: 500 }
    );
  }
}
