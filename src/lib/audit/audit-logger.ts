import { getDb, schema } from "../db";
import crypto from "crypto";

export interface LogAuditParams {
  schoolId: string;
  userId?: string | null;
  action: "LOGIN" | "LOGOUT" | "CREATE" | "UPDATE" | "DELETE" | "CORRECTION" | "SCAN" | "STATUS_CHANGE" | "BACKUP" | "RESTORE" | "IMPORT";
  tableName: string;
  recordId?: string | null;
  oldValues?: any;
  newValues?: any;
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    const db = getDb();
    await db.insert(schema.auditLogs).values({
      id: crypto.randomUUID(),
      schoolId: params.schoolId,
      userId: params.userId || null,
      action: params.action,
      tableName: params.tableName,
      recordId: params.recordId ? String(params.recordId) : null,
      oldValues: params.oldValues ? JSON.stringify(params.oldValues) : null,
      newValues: params.newValues ? JSON.stringify(params.newValues) : null,
      reason: params.reason || null,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
    });
  } catch (error) {
    console.error("Gagal mencatat audit log:", error);
  }
}
