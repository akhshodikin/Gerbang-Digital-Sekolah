import { getDb, schema } from "../db";
import { eq } from "drizzle-orm";

export interface SendWhatsAppParams {
  schoolId: string;
  recipientPhone: string;
  recipientName: string;
  messageType: "ATTENDANCE_CHECK_IN" | "ATTENDANCE_LATE" | "ABSENT_CUTOFF" | "PERMISSION_UPDATE" | "ANNOUNCEMENT";
  variables: Record<string, string>; // e.g. { nama_siswa: "Rizky", status: "Hadir", waktu: "06:45" }
}

export async function sendWhatsAppNotification(params: SendWhatsAppParams): Promise<{
  success: boolean;
  status: "SENT" | "NOT_CONFIGURED" | "FAILED";
  message: string;
}> {
  const db = getDb();

  // 1. Ambil pengaturan sekolah untuk template
  const [settings] = await db
    .select()
    .from(schema.schoolSettings)
    .where(eq(schema.schoolSettings.schoolId, params.schoolId));

  let rawTemplate = "Yth. {nama_ortu}, pemberitahuan dari SDN Kandangan I Tosari terkait ananda {nama_siswa}: {status}.";

  if (params.messageType === "ATTENDANCE_CHECK_IN" && settings?.waAttendanceTemplate) {
    rawTemplate = settings.waAttendanceTemplate;
  } else if (params.messageType === "ATTENDANCE_LATE" && settings?.waLateTemplate) {
    rawTemplate = settings.waLateTemplate;
  } else if (params.messageType === "ABSENT_CUTOFF" && settings?.waAbsentTemplate) {
    rawTemplate = settings.waAbsentTemplate;
  }

  // Substitusi variabel
  let messageContent = rawTemplate;
  for (const [key, val] of Object.entries(params.variables)) {
    messageContent = messageContent.replace(new RegExp(`{${key}}`, "g"), val);
  }

  const gatewayUrl = process.env.WA_GATEWAY_URL?.trim();
  const apiToken = process.env.WA_API_TOKEN?.trim();

  // Cek apakah konfigurasi WhatsApp sudah aktif
  const isConfigured = Boolean(gatewayUrl && apiToken);

  // Buat antrian notifikasi
  const [job] = await db
    .insert(schema.notificationJobs)
    .values({
      schoolId: params.schoolId,
      type: params.messageType,
      recipientPhone: params.recipientPhone,
      recipientName: params.recipientName,
      messageContent,
      status: isConfigured ? "PENDING" : "NOT_CONFIGURED",
      lastAttemptAt: new Date(),
    })
    .returning();

  if (!isConfigured) {
    // Catat log status Belum Dikonfigurasi
    await db.insert(schema.notificationLogs).values({
      jobId: job?.id,
      channel: "WHATSAPP",
      target: params.recipientPhone,
      status: "NOT_CONFIGURED",
      errorMessage: "Kredensial WhatsApp Business API belum dikonfigurasi di environment variables (WA_GATEWAY_URL / WA_API_TOKEN).",
    });

    return {
      success: false,
      status: "NOT_CONFIGURED",
      message: "Gateway WhatsApp belum dikonfigurasi. Pemberitahuan telah dicatat dalam sistem.",
    };
  }

  // Jika terkonfigurasi, panggil API Gateway eksternal
  try {
    const response = await fetch(gatewayUrl!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        to: params.recipientPhone,
        message: messageContent,
      }),
    });

    const respText = await response.text();

    if (response.ok) {
      await db
        .update(schema.notificationJobs)
        .set({ status: "SENT" })
        .where(eq(schema.notificationJobs.id, job.id));

      await db.insert(schema.notificationLogs).values({
        jobId: job.id,
        channel: "WHATSAPP",
        target: params.recipientPhone,
        status: "SUCCESS",
        responsePayload: respText,
      });

      return {
        success: true,
        status: "SENT",
        message: "Pemberitahuan WhatsApp berhasil dikirim ke orang tua.",
      };
    } else {
      await db
        .update(schema.notificationJobs)
        .set({ status: "FAILED" })
        .where(eq(schema.notificationJobs.id, job.id));

      await db.insert(schema.notificationLogs).values({
        jobId: job.id,
        channel: "WHATSAPP",
        target: params.recipientPhone,
        status: "FAILED",
        errorMessage: `Gateway HTTP ${response.status}: ${respText}`,
      });

      return {
        success: false,
        status: "FAILED",
        message: `Gagal mengirim WhatsApp: Gateway mengembalikan kode ${response.status}`,
      };
    }
  } catch (err: any) {
    await db
      .update(schema.notificationJobs)
      .set({ status: "FAILED" })
      .where(eq(schema.notificationJobs.id, job.id));

    await db.insert(schema.notificationLogs).values({
      jobId: job.id,
      channel: "WHATSAPP",
      target: params.recipientPhone,
      status: "FAILED",
      errorMessage: err.message || "Network error",
    });

    return {
      success: false,
      status: "FAILED",
      message: `Error koneksi WhatsApp gateway: ${err.message}`,
    };
  }
}
