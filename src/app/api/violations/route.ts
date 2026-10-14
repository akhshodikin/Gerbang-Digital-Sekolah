import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { getDb, schema } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { logAudit } from "@/lib/audit/audit-logger";

const violationSchema = z.object({
  studentId: z.string().min(1, "ID Siswa wajib dipilih"),
  categoryId: z.string().min(1, "Kategori pelanggaran wajib dipilih"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal YYYY-MM-DD"),
  time: z.string().min(1, "Waktu kejadian wajib diisi"),
  location: z.string().min(3, "Lokasi kejadian minimal 3 karakter"),
  description: z.string().min(10, "Deskripsi faktual minimal 10 karakter"),
  initialAction: z.string().min(5, "Tindakan penanganan awal minimal 5 karakter"),
  evidenceFileUrl: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  // Hanya petugas berwenang yang dapat melihat rekap pelanggaran
  const auth = await requireAuth(["ADMIN", "GURU_PIKET", "WALI_KELAS"]);
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();

  try {
    const list = await db
      .select({
        id: schema.studentViolations.id,
        studentId: schema.studentViolations.studentId,
        studentName: schema.students.fullName,
        studentNis: schema.students.nis,
        className: schema.classes.name,
        categoryName: schema.violationCategories.name,
        severity: schema.violationCategories.severity,
        date: schema.studentViolations.date,
        time: schema.studentViolations.time,
        location: schema.studentViolations.location,
        description: schema.studentViolations.description,
        initialAction: schema.studentViolations.initialAction,
        evidenceFileUrl: schema.studentViolations.evidenceFileUrl,
        status: schema.studentViolations.status,
        recordedByName: schema.users.fullName,
        createdAt: schema.studentViolations.createdAt,
      })
      .from(schema.studentViolations)
      .innerJoin(schema.students, eq(schema.studentViolations.studentId, schema.students.id))
      .leftJoin(schema.classes, eq(schema.students.currentClassId, schema.classes.id))
      .innerJoin(schema.violationCategories, eq(schema.studentViolations.categoryId, schema.violationCategories.id))
      .innerJoin(schema.users, eq(schema.studentViolations.recordedByUserId, schema.users.id))
      .where(eq(schema.studentViolations.schoolId, session.schoolId))
      .orderBy(desc(schema.studentViolations.createdAt));

    let filtered = list;
    if (session.roles.includes("WALI_KELAS") && !session.roles.includes("ADMIN")) {
      const [cls] = await db
        .select({ name: schema.classes.name })
        .from(schema.classes)
        .where(eq(schema.classes.id, session.homeroomClassId || ""));
      if (cls) {
        filtered = list.filter((item: any) => item.className === cls.name);
      } else {
        filtered = [];
      }
    }

    return NextResponse.json({ success: true, violations: filtered });
  } catch (error: any) {
    console.error("Fetch violations error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat data pelanggaran." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Hanya Guru Piket atau Admin yang mencatat kejadian pelanggaran harian
  const auth = await requireAuth(["ADMIN", "GURU_PIKET"]);
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();

  try {
    const body = await req.json();
    const parsed = violationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0]?.message || "Format data tidak valid" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const [inserted] = await db
      .insert(schema.studentViolations)
      .values({
        schoolId: session.schoolId,
        studentId: data.studentId,
        categoryId: data.categoryId,
        date: data.date,
        time: data.time,
        location: data.location,
        description: data.description,
        initialAction: data.initialAction,
        recordedByUserId: session.userId,
        evidenceFileUrl: data.evidenceFileUrl || null,
        status: "BARU",
      })
      .returning();

    await logAudit({
      schoolId: session.schoolId,
      userId: session.userId,
      action: "CREATE",
      tableName: "student_violations",
      recordId: inserted?.id,
      newValues: { studentId: data.studentId, categoryId: data.categoryId, location: data.location },
      reason: `Pencatatan pelanggaran siswa oleh petugas ${session.username}`,
    });

    return NextResponse.json({
      success: true,
      message: "Catatan kejadian kedisiplinan siswa berhasil disimpan.",
      violation: inserted,
    });
  } catch (error: any) {
    console.error("Create violation error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menyimpan catatan kejadian." },
      { status: 500 }
    );
  }
}
