import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Belum masuk" },
      { status: 401 }
    );
  }

  const db = getDb();
  const [school] = await db
    .select({
      name: schema.schools.name,
      district: schema.schools.district,
      regency: schema.schools.regency,
      logoUrl: schema.schools.logoUrl,
      regionLogoUrl: schema.schools.regionLogoUrl,
    })
    .from(schema.schools)
    .where(eq(schema.schools.id, session.schoolId));

  return NextResponse.json({
    success: true,
    user: {
      userId: session.userId,
      username: session.username,
      fullName: session.fullName,
      schoolId: session.schoolId,
      roles: session.roles,
      homeroomClassId: session.homeroomClassId,
      guardianId: session.guardianId,
      teacherId: session.teacherId,
    },
    school: school || {
      name: "SDN Kandangan I Tosari",
      district: "Tosari",
      regency: "Kabupaten Pasuruan",
    },
  });
}
