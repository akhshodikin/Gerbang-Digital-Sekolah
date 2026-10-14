import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { getDb, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { logAudit } from "@/lib/audit/audit-logger";

const counselingSchema = z.object({
  studentId: z.string().min(1, "ID Siswa wajib diisi"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal YYYY-MM-DD"),
  sessionSummary: z.string().min(10, "Ringkasan sesi minimal 10 karakter"),
  sensitiveNotes: z.string().min(5, "Catatan bimbingan/rahasia wajib diisi"),
  agreedActionPlan: z.string().optional(),
  status: z.enum(["AKTIF", "SELESAI", "DIRUJUK"]).default("AKTIF"),
});

export async function GET() {
  // Hanya Admin yang memiliki wewenang mengakses arsip konseling rahasia
  const auth = await requireAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();

  try {
    const list = await db
      .select({
        id: schema.counselingRecords.id,
        studentId: schema.counselingRecords.studentId,
        studentName: schema.students.fullName,
        studentNis: schema.students.nis,
        className: schema.classes.name,
        date: schema.counselingRecords.date,
        sessionSummary: schema.counselingRecords.sessionSummary,
        sensitiveNotes: schema.counselingRecords.sensitiveNotes,
        agreedActionPlan: schema.counselingRecords.agreedActionPlan,
        status: schema.counselingRecords.status,
        counselorName: schema.users.fullName,
        createdAt: schema.counselingRecords.createdAt,
      })
      .from(schema.counselingRecords)
      .innerJoin(schema.students, eq(schema.counselingRecords.studentId, schema.students.id))
      .leftJoin(schema.classes, eq(schema.students.currentClassId, schema.classes.id))
      .innerJoin(schema.users, eq(schema.counselingRecords.counselorUserId, schema.users.id))
      .where(eq(schema.counselingRecords.schoolId, session.schoolId))
      .orderBy(desc(schema.counselingRecords.createdAt));

    return NextResponse.json({ success: true, counselingRecords: list });
  } catch (error: any) {
    console.error("Fetch counseling error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat arsip bimbingan konseling." },
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
    const parsed = counselingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0]?.message || "Format data tidak valid" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const [inserted] = await db
      .insert(schema.counselingRecords)
      .values({
        schoolId: session.schoolId,
        studentId: data.studentId,
        date: data.date,
        sessionSummary: data.sessionSummary,
        sensitiveNotes: data.sensitiveNotes,
        agreedActionPlan: data.agreedActionPlan || null,
        counselorUserId: session.userId,
        status: data.status,
      })
      .returning();

    await logAudit({
      schoolId: session.schoolId,
      userId: session.userId,
      action: "CREATE",
      tableName: "counseling_records",
      recordId: inserted?.id,
      reason: `Pencatatan sesi bimbingan konseling siswa ID ${data.studentId} oleh ${session.username}`,
    });

    return NextResponse.json({
      success: true,
      message: "Catatan bimbingan konseling rahasia berhasil disimpan.",
      counseling: inserted,
    });
  } catch (error: any) {
    console.error("Create counseling error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menyimpan catatan konseling." },
      { status: 500 }
    );
  }
}
