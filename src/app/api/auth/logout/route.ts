import { NextRequest, NextResponse } from "next/server";
import { destroySession, getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit/audit-logger";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();

    if (session) {
      await logAudit({
        schoolId: session.schoolId,
        userId: session.userId,
        action: "LOGOUT",
        tableName: "users",
        recordId: session.userId,
        reason: `Pengguna ${session.username} keluar dari sistem.`,
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        userAgent: req.headers.get("user-agent"),
      });
    }

    await destroySession();

    return NextResponse.json({
      success: true,
      message: "Berhasil keluar dari aplikasi.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan saat logout." },
      { status: 500 }
    );
  }
}
