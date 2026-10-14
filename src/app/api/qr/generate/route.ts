import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { generateQrToken, revokeQrToken, getQrCodeDataUrl } from "@/lib/qr/qr-service";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";

const genSchema = z.object({
  entityType: z.enum(["STUDENT", "TEACHER"]),
  entityId: z.string().min(1, "ID entitas wajib diisi"),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  const session = auth.session;

  try {
    const body = await req.json();
    const parsed = genSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0]?.message || "Format data tidak valid" },
        { status: 400 }
      );
    }

    const { entityType, entityId } = parsed.data;

    const result = await generateQrToken(session.schoolId, entityType, entityId, session.userId);

    return NextResponse.json({
      success: true,
      message: `QR Token baru untuk ${entityType} berhasil diterbitkan.`,
      token: result.token,
      qrDataUrl: result.qrDataUrl,
    });
  } catch (error: any) {
    console.error("QR Generate error:", error);
    return NextResponse.json({ success: false, message: "Gagal menerbitkan QR Token." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();

  const url = new URL(req.url);
  const entityType = (url.searchParams.get("entityType") || "STUDENT") as "STUDENT" | "TEACHER";
  const entityId = url.searchParams.get("entityId");

  if (!entityId) {
    return NextResponse.json({ success: false, message: "Parameter entityId diperlukan." }, { status: 400 });
  }

  try {
    const [qrRecord] = await db
      .select()
      .from(schema.qrTokens)
      .where(
        and(
          eq(schema.qrTokens.schoolId, session.schoolId),
          eq(schema.qrTokens.entityType, entityType),
          eq(schema.qrTokens.entityId, entityId),
          eq(schema.qrTokens.isRevoked, false)
        )
      );

    if (!qrRecord) {
      return NextResponse.json({ success: false, message: "QR token aktif tidak ditemukan." }, { status: 404 });
    }

    const qrDataUrl = await getQrCodeDataUrl(qrRecord.token);

    return NextResponse.json({
      success: true,
      token: qrRecord.token,
      qrDataUrl,
      issuedAt: qrRecord.issuedAt,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "Gagal mengambil data QR." }, { status: 500 });
  }
}
