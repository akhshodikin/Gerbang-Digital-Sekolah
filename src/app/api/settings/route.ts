import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit/audit-logger";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();

  try {
    const [school] = await db
      .select()
      .from(schema.schools)
      .where(eq(schema.schools.id, session.schoolId));

    const [settings] = await db
      .select()
      .from(schema.schoolSettings)
      .where(eq(schema.schoolSettings.schoolId, session.schoolId));

    return NextResponse.json({
      success: true,
      school,
      settings: settings || {
        checkInStart: "06:30:00",
        checkInLateThreshold: "07:00:00",
        checkInCutoffTime: "07:30:00",
        checkOutStart: "12:00:00",
        enableWhatsappNotifications: false,
      },
      waConfigured: Boolean(process.env.WA_GATEWAY_URL && process.env.WA_API_TOKEN),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "Gagal memuat pengaturan." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();

  try {
    const body = await req.json();
    const { schoolData, settingsData } = body;

    if (schoolData) {
      const updateSchoolData: Record<string, any> = { updatedAt: new Date() };
      if (schoolData.name !== undefined) updateSchoolData.name = schoolData.name;
      if (schoolData.address !== undefined) updateSchoolData.address = schoolData.address;
      if (schoolData.phone !== undefined) updateSchoolData.phone = schoolData.phone;
      if (schoolData.email !== undefined) updateSchoolData.email = schoolData.email;
      if (schoolData.headmasterName !== undefined) updateSchoolData.headmasterName = schoolData.headmasterName;
      if (schoolData.headmasterNip !== undefined) updateSchoolData.headmasterNip = schoolData.headmasterNip;
      if (schoolData.logoUrl !== undefined) updateSchoolData.logoUrl = schoolData.logoUrl;
      if (schoolData.regionLogoUrl !== undefined) updateSchoolData.regionLogoUrl = schoolData.regionLogoUrl;

      await db
        .update(schema.schools)
        .set(updateSchoolData)
        .where(eq(schema.schools.id, session.schoolId));
    }

    if (settingsData) {
      await db
        .update(schema.schoolSettings)
        .set({
          checkInStart: settingsData.checkInStart,
          checkInLateThreshold: settingsData.checkInLateThreshold,
          checkInCutoffTime: settingsData.checkInCutoffTime,
          checkOutStart: settingsData.checkOutStart,
          enableWhatsappNotifications: settingsData.enableWhatsappNotifications,
          waAttendanceTemplate: settingsData.waAttendanceTemplate,
          waLateTemplate: settingsData.waLateTemplate,
          waAbsentTemplate: settingsData.waAbsentTemplate,
          updatedAt: new Date(),
        })
        .where(eq(schema.schoolSettings.schoolId, session.schoolId));
    }

    await logAudit({
      schoolId: session.schoolId,
      userId: session.userId,
      action: "UPDATE",
      tableName: "school_settings",
      recordId: session.schoolId,
      reason: `Pembaruan pengaturan sekolah oleh ${session.username}`,
    });

    return NextResponse.json({ success: true, message: "Pengaturan berhasil diperbarui." });
  } catch (error: any) {
    console.error("Update settings error:", error);
    return NextResponse.json({ success: false, message: "Gagal menyimpan perubahan pengaturan." }, { status: 500 });
  }
}
