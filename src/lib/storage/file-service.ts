import path from "path";
import fs from "fs";
import crypto from "crypto";

const isVercel = Boolean(process.env.VERCEL);
const uploadDirBase = process.env.UPLOAD_DIR || (isVercel ? "/tmp/uploads" : "uploads");
const UPLOAD_DIR = path.isAbsolute(uploadDirBase)
  ? uploadDirBase
  : path.resolve(process.cwd(), uploadDirBase);

// Pastikan direktori uploads privat ada
function ensureUploadDir() {
  try {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
  } catch {
    // Abaikan error di lingkungan serverless read-only
  }
}
ensureUploadDir();

export interface SaveFileResult {
  fileId: string;
  originalName: string;
  mimeType: string;
  size: number;
  filePath: string;
}

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function savePrivateFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<SaveFileResult> {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(
      `Format file tidak didukung (${mimeType}). Hanya file PDF, JPG, PNG, dan WebP yang diizinkan.`
    );
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(`Ukuran file melebihi batas maksimum 5MB (Ukuran saat ini: ${(buffer.length / 1024 / 1024).toFixed(2)}MB).`);
  }

  const ext = path.extname(originalName) || ".bin";
  const fileId = `${Date.now()}-${crypto.randomBytes(12).toString("hex")}${ext}`;
  const targetPath = path.join(UPLOAD_DIR, fileId);

  fs.writeFileSync(targetPath, buffer);

  return {
    fileId,
    originalName,
    mimeType,
    size: buffer.length,
    filePath: targetPath,
  };
}

export function getPrivateFilePath(fileId: string): string | null {
  // Hindari Path Traversal
  const safeFilename = path.basename(fileId);
  const targetPath = path.join(UPLOAD_DIR, safeFilename);

  if (fs.existsSync(targetPath)) {
    return targetPath;
  }
  return null;
}
