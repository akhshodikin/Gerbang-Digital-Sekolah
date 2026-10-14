import { NextRequest, NextResponse } from "next/server";
import { requireAuth, verifyClassAccess } from "@/lib/auth/guards";
import { getDb, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";
import { logAudit } from "@/lib/audit/audit-logger";
import { sendWhatsAppNotification } from "@/lib/wa/whatsapp-service";

const reviewSchema = z.object({
  status: z.enum(["DISETUJUI", "DITOLAK"]),
  reviewNotes: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(["ADMIN", "WALI_KELAS"]);
  if (auth.error) return auth.error;

  const session = auth.session;
  const permissionId = params.id;
  const db = getDb();

  try {
    const body = await req.json();
    const parsed = reviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0]?.message || "Format data tidak valid" },
        { status: 400 }
      );
    }

    const { status, reviewNotes } = parsed.data;

    // Dapatkan data pengajuan izin
    const [request] = await db
      .select({
        id: schema.permissionRequests.id,
        schoolId: schema.permissionRequests.schoolId,
        studentId: schema.permissionRequests.studentId,
        guardianId: schema.permissionRequests.guardianId,
        type: schema.permissionRequests.type,
        startDate: schema.permissionRequests.startDate,
        endDate: schema.permissionRequests.endDate,
        reason: schema.permissionRequests.reason,
        currentStatus: schema.permissionRequests.status,
        studentName: schema.students.fullName,
        studentClassId: schema.students.currentClassId,
        guardianName: schema.guardians.fullName,
        guardianPhone: schema.guardians.phone,
      })
      .from(schema.permissionRequests)
      .innerJoin(schema.students, eq(schema.permissionRequests.studentId, schema.students.id))
      .innerJoin(schema.guardians, eq(schema.permissionRequests.guardianId, schema.guardians.id))
      .where(
        and(
          eq(schema.permissionRequests.id, permissionId),
          eq(schema.permissionRequests.schoolId, session.schoolId)
        )
      );

    if (!request) {
      return NextResponse.json(
        { success: false, message: "Pengajuan izin tidak ditemukan." },
        { status: 404 }
      );
    }

    // Jika wali kelas, pastikan siswa adalah siswa binaan kelasnya
    if (session.roles.includes("WALI_KELAS") && !session.roles.includes("ADMIN")) {
      const hasClassAccess = await verifyClassAccess(session, request.studentClassId || "");
      if (!hasClassAccess) {
        return NextResponse.json(
          { success: false, message: "Akses ditolak: Anda hanya berhak meninjau izin siswa di kelas binaan Anda." },
          { status: 403 }
        );
      }
    }

    const now = new Date();

    // 1. Perbarui status pengajuan izin
    await db
      .update(schema.permissionRequests)
      .set({
        status,
        reviewedByUserId: session.userId,
        reviewedAt: now,
        reviewNotes: reviewNotes || null,
        updatedAt: now,
      })
      .where(eq(schema.permissionRequests.id, permissionId));

    // 2. Jika DISETUJUI, sinkronisasi kehadiran siswa untuk setiap tanggal dalam rentang izin
    if (status === "DISETUJUI") {
      const start = new Date(request.startDate);
      const end = new Date(request.endDate);

      // Loop dari start date ke end date
      for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
        const dateStr = dt.toISOString().split("T")[0];

        // Cek apakah sudah ada catatan absensi hari tersebut
        const [existing] = await db
          .select()
          .from(schema.studentAttendance)
          .where(
            and(
              eq(schema.studentAttendance.studentId, request.studentId),
              eq(schema.studentAttendance.date, dateStr)
            )
          );

        if (existing) {
          // Update menjadi status izin/sakit
          await db
            .update(schema.studentAttendance)
            .set({
              status: request.type, // 'IZIN' atau 'SAKIT'
              scanMethod: "SISTEM_IZIN",
              permissionRequestId: request.id,
              notes: `Disetujui: ${reviewNotes || request.reason}`,
              updatedAt: now,
            })
            .where(eq(schema.studentAttendance.id, existing.id));
        } else {
          // Buat record baru
          await db.insert(schema.studentAttendance).values({
            id: crypto.randomUUID(),
            schoolId: session.schoolId,
            studentId: request.studentId,
            classId: request.studentClassId,
            date: dateStr,
            status: request.type,
            recordedAt: now,
            scanMethod: "SISTEM_IZIN",
            recordedByUserId: session.userId,
            notes: `Disetujui: ${reviewNotes || request.reason}`,
            permissionRequestId: request.id,
          });
        }
      }
    }

    // 3. Catat ke audit log
    await logAudit({
      schoolId: session.schoolId,
      userId: session.userId,
      action: "UPDATE",
      tableName: "permission_requests",
      recordId: permissionId,
      oldValues: { status: request.currentStatus },
      newValues: { status, reviewNotes },
      reason: `Peninjauan perizinan siswa ${request.studentName}: ${status} oleh ${session.username}`,
    });

    // 4. Kirim notifikasi WhatsApp ke Wali Murid
    sendWhatsAppNotification({
      schoolId: session.schoolId,
      recipientPhone: request.guardianPhone,
      recipientName: request.guardianName,
      messageType: "PERMISSION_UPDATE",
      variables: {
        nama_ortu: request.guardianName,
        nama_siswa: request.studentName,
        status: status === "DISETUJUI" ? `DISETUJUI (${request.type})` : `DITOLAK (${reviewNotes || "Alasan tidak memenuhi syarat"})`,
        waktu: now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      },
    }).catch((err) => console.error("Error sending WA permission update:", err));

    return NextResponse.json({
      success: true,
      message: `Pengajuan ${request.type} ananda ${request.studentName} berhasil ${status.toLowerCase()}.`,
    });
  } catch (error: any) {
    console.error("Review permission error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memproses peninjauan izin." },
      { status: 500 }
    );
  }
}
