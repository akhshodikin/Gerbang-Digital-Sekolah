import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { getDb, schema } from "@/lib/db";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { logAudit } from "@/lib/audit/audit-logger";

const classSchema = z.object({
  name: z.string().min(1, "Nama kelas wajib diisi"),
  gradeLevel: z.number().min(1).max(6),
  academicYearId: z.string().min(1, "Tahun ajaran wajib dipilih"),
  homeroomTeacherId: z.string().optional().nullable(),
  capacity: z.number().default(30),
});

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();

  try {
    const classList = await db
      .select({
        id: schema.classes.id,
        name: schema.classes.name,
        gradeLevel: schema.classes.gradeLevel,
        capacity: schema.classes.capacity,
        academicYearId: schema.classes.academicYearId,
        homeroomTeacherId: schema.classes.homeroomTeacherId,
        teacherName: schema.teachers.fullName,
        teacherNip: schema.teachers.nip,
      })
      .from(schema.classes)
      .leftJoin(schema.teachers, eq(schema.classes.homeroomTeacherId, schema.teachers.id))
      .where(eq(schema.classes.schoolId, session.schoolId));

    // Tambahkan jumlah siswa aktif
    const result = [];
    for (const c of classList) {
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.students)
        .where(and(eq(schema.students.currentClassId, c.id), eq(schema.students.status, "AKTIF")));

      result.push({
        ...c,
        totalStudents: Number(countResult?.count || 0),
      });
    }

    return NextResponse.json({ success: true, classes: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "Gagal memuat data kelas." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();

  try {
    const body = await req.json();
    const parsed = classSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0]?.message || "Format data tidak valid" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const [newClass] = await db
      .insert(schema.classes)
      .values({
        schoolId: session.schoolId,
        name: data.name,
        gradeLevel: data.gradeLevel,
        academicYearId: data.academicYearId,
        homeroomTeacherId: data.homeroomTeacherId || null,
        capacity: data.capacity,
      })
      .returning();

    await logAudit({
      schoolId: session.schoolId,
      userId: session.userId,
      action: "CREATE",
      tableName: "classes",
      recordId: newClass?.id,
      newValues: data,
      reason: `Pembuatan kelas baru: ${data.name} oleh ${session.username}`,
    });

    return NextResponse.json({ success: true, message: "Kelas berhasil ditambahkan.", class: newClass });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "Gagal menambahkan kelas." }, { status: 500 });
  }
}
