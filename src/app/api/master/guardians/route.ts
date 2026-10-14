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

// POST: Verifikasi hubungan wali murid dengan siswa (Mencegah klaim anak berdasarkan NIS saja)
export async function POST(req: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();

  try {
    const body = await req.json();
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
    return NextResponse.json({ success: false, message: "Gagal memverifikasi relasi." }, { status: 500 });
  }
}
