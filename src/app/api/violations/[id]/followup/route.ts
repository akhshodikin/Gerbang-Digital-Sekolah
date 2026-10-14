import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { getDb, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { logAudit } from "@/lib/audit/audit-logger";

const followupSchema = z.object({
  actionTaken: z.string().min(5, "Tindakan pembinaan minimal 5 karakter"),
  studentResponse: z.string().optional(),
  parentCommunicationNotes: z.string().optional(),
  status: z.enum(["DALAM_PENANGANAN", "MENUNGGU_TINDAK_LANJUT", "SELESAI"]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Hanya Wali Kelas dan Admin yang menangani pembinaan
  const auth = await requireAuth(["ADMIN", "WALI_KELAS"]);
  if (auth.error) return auth.error;

  const session = auth.session;
  const violationId = params.id;
  const db = getDb();

  try {
    const body = await req.json();
    const parsed = followupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0]?.message || "Format data tidak valid" },
        { status: 400 }
      );
    }

    const { actionTaken, studentResponse, parentCommunicationNotes, status } = parsed.data;

    // Cek apakah data pelanggaran ada
    const [violation] = await db
      .select()
      .from(schema.studentViolations)
      .where(
        and(
          eq(schema.studentViolations.id, violationId),
          eq(schema.studentViolations.schoolId, session.schoolId)
        )
      );

    if (!violation) {
      return NextResponse.json(
        { success: false, message: "Catatan pelanggaran tidak ditemukan." },
        { status: 404 }
      );
    }

    // Insert tindak lanjut
    const [followup] = await db
      .insert(schema.violationFollowups)
      .values({
        violationId,
        actionTaken,
        studentResponse: studentResponse || null,
        parentCommunicationNotes: parentCommunicationNotes || null,
        handledByUserId: session.userId,
      })
      .returning();

    // Update status pelanggaran
    await db
      .update(schema.studentViolations)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(schema.studentViolations.id, violationId));

    await logAudit({
      schoolId: session.schoolId,
      userId: session.userId,
      action: "UPDATE",
      tableName: "student_violations",
      recordId: violationId,
      newValues: { status, actionTaken },
      reason: `Pencatatan pembinaan dan pembaruan status kejadian menjadi ${status} oleh ${session.username}`,
    });

    return NextResponse.json({
      success: true,
      message: `Catatan pembinaan berhasil disimpan. Status kini: ${status}.`,
      followup,
    });
  } catch (error: any) {
    console.error("Followup violation error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menyimpan catatan tindak lanjut." },
      { status: 500 }
    );
  }
}
