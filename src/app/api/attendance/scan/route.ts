import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { processQrScan } from "@/lib/qr/qr-service";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { sendWhatsAppNotification } from "@/lib/wa/whatsapp-service";

const scanSchema = z.object({
  token: z.string().min(1, "Token QR Code wajib dikirim."),
});

export async function POST(req: NextRequest) {
  // Hanya Guru Piket dan Admin yang berhak memindai QR Code
  const auth = await requireAuth(["ADMIN", "GURU_PIKET"]);
  if (auth.error) return auth.error;

  const session = auth.session;

  try {
    const body = await req.json();
    const parsed = scanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0]?.message || "Format data tidak valid" },
        { status: 400 }
      );
    }

    // Eksekusi pemrosesan QR Server-side dengan validasi waktu server WIB
    const result = await processQrScan(session.schoolId, parsed.data.token, session.userId);

    // Jika scan siswa sukses, periksa wali murid terverifikasi untuk notifikasi WhatsApp
    if (result.success && result.entityType === "STUDENT") {
      try {
        const db = getDb();
        const [student] = await db
          .select({ id: schema.students.id, fullName: schema.students.fullName })
          .from(schema.students)
          .where(eq(schema.students.nis, result.identifier || ""));

        if (student) {
          // Cari wali murid terverifikasi
          const relations = await db
            .select({
              guardianPhone: schema.guardians.phone,
              guardianName: schema.guardians.fullName,
            })
            .from(schema.studentGuardians)
            .innerJoin(schema.guardians, eq(schema.studentGuardians.guardianId, schema.guardians.id))
            .where(
              and(
                eq(schema.studentGuardians.studentId, student.id),
                eq(schema.studentGuardians.isVerified, true)
              )
            );

          for (const rel of relations) {
            const timeStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
            const msgType = result.status === "TERLAMBAT" ? "ATTENDANCE_LATE" : "ATTENDANCE_CHECK_IN";

            // Fire-and-forget notifikasi WA
            sendWhatsAppNotification({
              schoolId: session.schoolId,
              recipientPhone: rel.guardianPhone,
              recipientName: rel.guardianName,
              messageType: msgType,
              variables: {
                nama_siswa: student.fullName,
                nama_ortu: rel.guardianName,
                status: result.status || "Hadir",
                waktu: timeStr,
              },
            }).catch((err) => console.error("WA notify error:", err));
          }
        }
      } catch (err) {
        console.error("Error sending WA during scan:", err);
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Attendance Scan API Error:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi gangguan sistem saat memproses pemindaian absensi." },
      { status: 500 }
    );
  }
}
