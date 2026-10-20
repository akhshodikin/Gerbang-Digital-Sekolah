import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { getDb, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { logAudit } from "@/lib/audit/audit-logger";

const updateGuardianSchema = z.object({
  fullName: z.string().min(2, "Nama lengkap minimal 2 karakter"),
  relationship: z.string().min(1, "Hubungan keluarga wajib diisi"),
  phone: z.string().min(3, "Nomor telepon/WA minimal 3 karakter"),
  address: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(["ADMIN", "WALI_KELAS"]);
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();
  const guardianId = params.id;

  try {
    const [guardian] = await db
      .select()
      .from(schema.guardians)
      .where(
        and(
          eq(schema.guardians.id, guardianId),
          eq(schema.guardians.schoolId, session.schoolId)
        )
      );

    if (!guardian) {
      return NextResponse.json(
        { success: false, message: "Data wali murid tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, guardian });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: "Gagal memuat data wali murid." },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();
  const guardianId = params.id;

  try {
    const body = await req.json();
    const parsed = updateGuardianSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsed.error.errors[0]?.message || "Format data tidak valid",
        },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select()
      .from(schema.guardians)
      .where(
        and(
          eq(schema.guardians.id, guardianId),
          eq(schema.guardians.schoolId, session.schoolId)
        )
      );

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Data wali murid tidak ditemukan." },
        { status: 404 }
      );
    }

    const { fullName, relationship, phone, address, occupation } = parsed.data;

    await db
      .update(schema.guardians)
      .set({
        fullName,
        relationship,
        phone,
        address: address || null,
        occupation: occupation || null,
        updatedAt: new Date(),
      })
      .where(eq(schema.guardians.id, guardianId));

    await logAudit({
      schoolId: session.schoolId,
      userId: session.userId,
      action: "UPDATE",
      tableName: "guardians",
      recordId: guardianId,
      reason: `Pembaruan data wali murid ${fullName} (${relationship}) oleh ${session.username}`,
    });

    return NextResponse.json({
      success: true,
      message: `Data wali murid ${fullName} berhasil diperbarui.`,
    });
  } catch (err: any) {
    console.error("Update guardian error:", err);
    return NextResponse.json(
      { success: false, message: "Gagal memperbarui data wali murid." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();
  const guardianId = params.id;

  try {
    const [existing] = await db
      .select()
      .from(schema.guardians)
      .where(
        and(
          eq(schema.guardians.id, guardianId),
          eq(schema.guardians.schoolId, session.schoolId)
        )
      );

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Data wali murid tidak ditemukan." },
        { status: 404 }
      );
    }

    // 1. Hapus relasi anak di studentGuardians
    await db
      .delete(schema.studentGuardians)
      .where(eq(schema.studentGuardians.guardianId, guardianId));

    // 2. Hapus record guardian
    await db
      .delete(schema.guardians)
      .where(eq(schema.guardians.id, guardianId));

    // 3. Jika ada user akun login yang tertaut, hapus akun loginnya
    if (existing.userId) {
      try {
        await db
          .delete(schema.userRoles)
          .where(eq(schema.userRoles.userId, existing.userId));
        await db.delete(schema.users).where(eq(schema.users.id, existing.userId));
      } catch (userDelErr) {
        console.warn("Gagal menghapus user akun wali:", userDelErr);
      }
    }

    await logAudit({
      schoolId: session.schoolId,
      userId: session.userId,
      action: "DELETE",
      tableName: "guardians",
      recordId: guardianId,
      reason: `Penghapusan data wali murid ${existing.fullName} oleh ${session.username}`,
    });

    return NextResponse.json({
      success: true,
      message: `Data wali murid ${existing.fullName} berhasil dihapus.`,
    });
  } catch (err: any) {
    console.error("Delete guardian error:", err);
    return NextResponse.json(
      { success: false, message: "Gagal menghapus data wali murid." },
      { status: 500 }
    );
  }
}
