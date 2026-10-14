import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { getDb, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { savePrivateFile } from "@/lib/storage/file-service";
import { logAudit } from "@/lib/audit/audit-logger";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();
  const studentId = params.id;

  try {
    // 1. Cek keberadaan siswa
    const [existing] = await db
      .select()
      .from(schema.students)
      .where(
        and(
          eq(schema.students.id, studentId),
          eq(schema.students.schoolId, session.schoolId)
        )
      );

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Siswa tidak ditemukan." },
        { status: 404 }
      );
    }

    let photoUrl = "";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = (formData.get("file") || formData.get("photo")) as File | null;

      if (!file) {
        return NextResponse.json(
          { success: false, message: "Berkas foto tidak ditemukan dalam formulir." },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const saved = await savePrivateFile(buffer, file.name, file.type);
      photoUrl = `/api/files/${saved.fileId}`;
    } else {
      const body = await req.json();
      if (!body.photoUrl) {
        return NextResponse.json(
          { success: false, message: "URL foto (photoUrl) wajib disertakan." },
          { status: 400 }
        );
      }
      photoUrl = body.photoUrl;
    }

    // 2. Perbarui photo_url di database siswa
    await db
      .update(schema.students)
      .set({
        photoUrl,
        updatedAt: new Date(),
      })
      .where(eq(schema.students.id, studentId));

    // 3. Catat audit log
    await logAudit({
      schoolId: session.schoolId,
      userId: session.userId,
      action: "UPDATE",
      tableName: "students",
      recordId: studentId,
      oldValues: { photoUrl: existing.photoUrl },
      newValues: { photoUrl },
      reason: `Pembaruan foto kartu siswa: ${existing.fullName} (NIS: ${existing.nis}) oleh ${session.username}`,
    });

    return NextResponse.json({
      success: true,
      message: `Foto siswa ${existing.fullName} berhasil diperbarui.`,
      photoUrl,
    });
  } catch (error: any) {
    console.error("Student photo upload error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memperbarui foto siswa." },
      { status: 500 }
    );
  }
}
