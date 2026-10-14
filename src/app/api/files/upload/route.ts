import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { savePrivateFile } from "@/lib/storage/file-service";

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "Berkas tidak ditemukan dalam formulir." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const saved = await savePrivateFile(buffer, file.name, file.type);

    return NextResponse.json({
      success: true,
      message: "Berkas berhasil diunggah secara privat dan aman.",
      fileId: saved.fileId,
      fileUrl: `/api/files/${saved.fileId}`,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal mengunggah berkas." },
      { status: 400 }
    );
  }
}
