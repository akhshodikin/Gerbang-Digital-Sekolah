import { getSession, SessionPayload } from "./session";
import { getDb, schema } from "../db";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function requireAuth(allowedRoles?: string[]): Promise<
  { session: SessionPayload; error?: never } | { session?: never; error: NextResponse }
> {
  const session = await getSession();

  if (!session) {
    return {
      error: NextResponse.json(
        { success: false, message: "Akses ditolak: Sesi tidak valid atau telah kedaluwarsa. Silakan masuk kembali." },
        { status: 401 }
      ),
    };
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = session.roles.some((r) => allowedRoles.includes(r));
    if (!hasRole) {
      return {
        error: NextResponse.json(
          { success: false, message: "Akses ditolak: Peran Anda tidak memiliki kewenangan untuk tindakan ini." },
          { status: 403 }
        ),
      };
    }
  }

  return { session };
}

/**
 * Memeriksa apakah pengguna memiliki hak akses terhadap data kelas tertentu (Admin atau Wali Kelas yang ditugaskan).
 */
export async function verifyClassAccess(session: SessionPayload, classId: string): Promise<boolean> {
  if (session.roles.includes("ADMIN")) return true;

  if (session.roles.includes("WALI_KELAS") && session.homeroomClassId) {
    return session.homeroomClassId === classId;
  }

  return false;
}

/**
 * Memeriksa apakah wali murid berhak melihat siswa tertentu (hanya siswa yang diverifikasi oleh sekolah).
 */
export async function verifyStudentAccess(session: SessionPayload, studentId: string): Promise<boolean> {
  if (session.roles.includes("ADMIN") || session.roles.includes("GURU_PIKET")) return true;

  if (session.roles.includes("WALI_KELAS") && session.homeroomClassId) {
    const db = getDb();
    const [student] = await db
      .select()
      .from(schema.students)
      .where(and(eq(schema.students.id, studentId), eq(schema.students.currentClassId, session.homeroomClassId)));
    return !!student;
  }

  if (session.roles.includes("WALI_MURID") && session.guardianId) {
    const db = getDb();
    const [relation] = await db
      .select()
      .from(schema.studentGuardians)
      .where(
        and(
          eq(schema.studentGuardians.guardianId, session.guardianId),
          eq(schema.studentGuardians.studentId, studentId),
          eq(schema.studentGuardians.isVerified, true)
        )
      );
    return !!relation;
  }

  return false;
}
