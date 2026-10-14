import { NextRequest, NextResponse } from "next/server";
import { requireAuth, verifyStudentAccess } from "@/lib/auth/guards";
import { getDb, schema } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { logAudit } from "@/lib/audit/audit-logger";

const permissionRequestSchema = z.object({
  studentId: z.string().min(1, "ID Siswa wajib dipilih"),
  type: z.enum(["IZIN", "SAKIT"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal mulai YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal selesai YYYY-MM-DD"),
  reason: z.string().min(5, "Alasan perizinan minimal 5 karakter"),
  attachmentUrl: z.string().optional().nullable(),
});

// GET: Ambil daftar pengajuan izin
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();

  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status");

  try {
    let queryBuilder = db
      .select({
        id: schema.permissionRequests.id,
        studentId: schema.permissionRequests.studentId,
        studentName: schema.students.fullName,
        studentNis: schema.students.nis,
        className: schema.classes.name,
        guardianName: schema.guardians.fullName,
        guardianPhone: schema.guardians.phone,
        type: schema.permissionRequests.type,
        startDate: schema.permissionRequests.startDate,
        endDate: schema.permissionRequests.endDate,
        reason: schema.permissionRequests.reason,
        attachmentUrl: schema.permissionRequests.attachmentUrl,
        status: schema.permissionRequests.status,
        reviewedAt: schema.permissionRequests.reviewedAt,
        reviewNotes: schema.permissionRequests.reviewNotes,
        createdAt: schema.permissionRequests.createdAt,
      })
      .from(schema.permissionRequests)
      .innerJoin(schema.students, eq(schema.permissionRequests.studentId, schema.students.id))
      .leftJoin(schema.classes, eq(schema.students.currentClassId, schema.classes.id))
      .innerJoin(schema.guardians, eq(schema.permissionRequests.guardianId, schema.guardians.id))
      .where(eq(schema.permissionRequests.schoolId, session.schoolId))
      .orderBy(desc(schema.permissionRequests.createdAt));

    let results = await queryBuilder;

    // Filter berdasarkan peran pengguna (Isolasi data)
    if (session.roles.includes("WALI_MURID") && !session.roles.includes("ADMIN")) {
      results = results.filter((r: any) => r.guardianName === session.fullName);
    } else if (session.roles.includes("WALI_KELAS") && !session.roles.includes("ADMIN")) {
      // Ambil hanya siswa di kelas binaan wali kelas ini
      const [myClass] = await db
        .select({ name: schema.classes.name })
        .from(schema.classes)
        .where(eq(schema.classes.id, session.homeroomClassId || ""));
      if (myClass) {
        results = results.filter((r: any) => r.className === myClass.name);
      } else {
        results = [];
      }
    }

    if (statusFilter) {
      results = results.filter((r: any) => r.status === statusFilter);
    }

    return NextResponse.json({ success: true, permissions: results });
  } catch (error: any) {
    console.error("Fetch permissions error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat pengajuan izin." },
      { status: 500 }
    );
  }
}

// POST: Ajukan perizinan baru (oleh Wali Murid atau Admin)
export async function POST(req: NextRequest) {
  const auth = await requireAuth(["WALI_MURID", "ADMIN"]);
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();

  try {
    const body = await req.json();
    const parsed = permissionRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0]?.message || "Format data tidak valid" },
        { status: 400 }
      );
    }

    const { studentId, type, startDate, endDate, reason, attachmentUrl } = parsed.data;

    // Pastikan wali murid berhak atas siswa tersebut
    const hasStudentAccess = await verifyStudentAccess(session, studentId);
    if (!hasStudentAccess) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Anda tidak memiliki akses terhadap siswa ini." },
        { status: 403 }
      );
    }

    // Ambil guardianId
    let guardianId = session.guardianId;
    if (!guardianId) {
      // Jika diajukan admin
      const [rel] = await db
        .select({ guardianId: schema.studentGuardians.guardianId })
        .from(schema.studentGuardians)
        .where(eq(schema.studentGuardians.studentId, studentId));
      guardianId = rel ? rel.guardianId : null;
    }

    if (!guardianId) {
      return NextResponse.json(
        { success: false, message: "Data wali murid untuk siswa ini belum terdaftar di sistem." },
        { status: 400 }
      );
    }

    const [newRequest] = await db
      .insert(schema.permissionRequests)
      .values({
        schoolId: session.schoolId,
        studentId,
        guardianId,
        type,
        startDate,
        endDate,
        reason,
        attachmentUrl: attachmentUrl || null,
        status: "MENUNGGU",
      })
      .returning();

    await logAudit({
      schoolId: session.schoolId,
      userId: session.userId,
      action: "CREATE",
      tableName: "permission_requests",
      recordId: newRequest?.id,
      newValues: { studentId, type, startDate, endDate, reason },
      reason: `Pengajuan ${type} untuk siswa ID ${studentId} oleh ${session.username}`,
    });

    return NextResponse.json({
      success: true,
      message: "Pengajuan izin berhasil dikirim dan menunggu persetujuan wali kelas.",
      permission: newRequest,
    });
  } catch (error: any) {
    console.error("Submit permission error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memproses pengajuan izin." },
      { status: 500 }
    );
  }
}
