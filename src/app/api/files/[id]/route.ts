import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { getPrivateFilePath } from "@/lib/storage/file-service";
import fs from "fs";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Hanya pengguna yang terautentikasi yang berhak mengakses berkas privat
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const fileId = params.id;
  const filePath = getPrivateFilePath(fileId);

  if (!filePath) {
    return NextResponse.json(
      { success: false, message: "Berkas tidak ditemukan atau telah dihapus." },
      { status: 404 }
    );
  }

  const ext = path.extname(filePath).toLowerCase();
  let contentType = "application/octet-stream";
  if (ext === ".pdf") contentType = "application/pdf";
  else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
  else if (ext === ".png") contentType = "image/png";
  else if (ext === ".webp") contentType = "image/webp";

  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${fileId}"`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
