import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { getDb, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const auth = await requireAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();

  try {
    const logs = await db
      .select({
        id: schema.auditLogs.id,
        action: schema.auditLogs.action,
        tableName: schema.auditLogs.tableName,
        recordId: schema.auditLogs.recordId,
        userName: schema.users.fullName,
        username: schema.users.username,
        reason: schema.auditLogs.reason,
        ipAddress: schema.auditLogs.ipAddress,
        createdAt: schema.auditLogs.createdAt,
      })
      .from(schema.auditLogs)
      .leftJoin(schema.users, eq(schema.auditLogs.userId, schema.users.id))
      .where(eq(schema.auditLogs.schoolId, session.schoolId))
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(100);

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "Gagal memuat log audit." }, { status: 500 });
  }
}
