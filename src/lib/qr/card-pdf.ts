import { jsPDF } from "jspdf";
import { TUT_WURI_HANDAYANI_PNG } from "./tut-wuri-handayani-asset";
import { TUT_WURI_HANDAYANI_OUTLINE_PNG } from "./tut-wuri-handayani-outline-asset";

export interface CardEntity {
  id: string;
  nis?: string | null;
  nip?: string | null;
  nisn?: string | null;
  fullName: string;
  gender?: string | null;
  className?: string | null;
  position?: string | null;
  photoUrl?: string | null;
  entityType?: "STUDENT" | "TEACHER";
  birthPlace?: string | null;
  birthDate?: string | null;
}

/**
 * Format Tempat dan Tanggal Lahir (TTL) standar Indonesia
 * Contoh: "Pasuruan, 14 Februari 2016"
 */
export function formatTtl(birthPlace?: string | null, birthDate?: string | null): string {
  if (!birthPlace && !birthDate) return "-";
  let dateFormatted = "";
  if (birthDate) {
    try {
      const d = new Date(birthDate);
      if (!isNaN(d.getTime())) {
        dateFormatted = d.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      } else {
        dateFormatted = String(birthDate);
      }
    } catch {
      dateFormatted = String(birthDate);
    }
  }

  if (birthPlace && dateFormatted) return `${birthPlace}, ${dateFormatted}`;
  if (birthPlace) return birthPlace;
  return dateFormatted || "-";
}

/**
 * Format Tanggal Lahir standar Indonesia
 * Contoh: "14 Februari 2016"
 */
export function formatBirthDate(birthDate?: string | null): string {
  if (!birthDate) return "-";
  try {
    const d = new Date(birthDate);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
  } catch {}
  return String(birthDate);
}

/**
 * Format Jenis Kelamin standar Indonesia
 * 'L' / 'LAKI-LAKI' -> 'Laki-laki', 'P' / 'PEREMPUAN' -> 'Perempuan'
 */
export function formatGender(gender?: string | null): string {
  if (!gender) return "-";
  const g = gender.trim().toUpperCase();
  if (g === "L" || g === "LAKI-LAKI" || g === "M") return "Laki-laki";
  if (g === "P" || g === "PEREMPUAN" || g === "F") return "Perempuan";
  return gender;
}

/**
 * Menggambar Background Gradasi Biru Lembut ke Putih (Sesuai Kartu NISN Resmi)
 */
function drawSkyBlueToWhiteGradient(doc: jsPDF, startX: number, startY: number, width: number, height: number, radius = 2.5) {
  // Base rounded rectangle
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(startX, startY, width, height, radius, radius, "F");

  // Interpolasi warna dari Soft Sky Blue #8ED0F2 (RGB: 142, 208, 242) ke Putih #FFFFFF (RGB: 255, 255, 255)
  const steps = 60;
  const stepHeight = height / steps;
  const startR = 142, startG = 208, startB = 242;
  const endR = 255, endG = 255, endB = 255;

  for (let i = 0; i < steps; i++) {
    const ratio = i / (steps - 1);
    const r = Math.round(startR + (endR - startR) * ratio);
    const g = Math.round(startG + (endG - startG) * ratio);
    const b = Math.round(startB + (endB - startB) * ratio);

    doc.setFillColor(r, g, b);
    const currentY = startY + i * stepHeight;
    doc.rect(startX, currentY, width, stepHeight + 0.1, "F");
  }

  // Pita Gelombang Pengaman di Bagian Bawah (Security Guilloche Lines)
  doc.setDrawColor(2, 132, 199); // sky-600
  doc.setLineWidth(0.3);
  doc.line(startX + 2, startY + 49.5, startX + 83.6, startY + 49.5);

  doc.setDrawColor(56, 189, 248); // sky-400
  doc.setLineWidth(0.2);
  doc.line(startX + 2, startY + 50.5, startX + 83.6, startY + 50.5);

  doc.setDrawColor(186, 230, 253); // sky-200
  doc.setLineWidth(0.15);
  doc.line(startX + 2, startY + 51.5, startX + 83.6, startY + 51.5);

  // Border kartu warna biru lembut
  doc.setDrawColor(56, 189, 248);
  doc.setLineWidth(0.35);
  doc.roundedRect(startX, startY, width, height, radius, radius, "S");
}

/**
 * Menggambar Kartu Identitas Tampak Depan pada jsPDF (Ukuran CR80: 85.6mm x 54mm)
 */
function drawCardFront(doc: jsPDF, entity: CardEntity, qrDataUrl: string, startX = 0, startY = 0) {
  const isTeacher = entity.entityType === "TEACHER" || Boolean(entity.nip);
  const badgeLabel = isTeacher ? "KARTU GURU" : "KARTU SISWA";
  const idValue = isTeacher ? (entity.nip || "-") : (entity.nis || "-");
  const nisnValue = isTeacher ? "-" : (entity.nisn || "-");

  // 1. Background utama kartu: Gradasi Biru Langit ke Putih + Security Wave Lines
  drawSkyBlueToWhiteGradient(doc, startX, startY, 85.6, 54, 2.5);

  // 2. Siluet Tut Wuri Handayani Garis Tepi Saja (Outline Watermark di sisi kanan)
  try {
    // @ts-ignore
    if (doc.saveGraphicsState && doc.setGState && doc.GState) {
      // @ts-ignore
      doc.saveGraphicsState();
      // @ts-ignore
      doc.setGState(new doc.GState({ opacity: 0.18 }));
      doc.addImage(TUT_WURI_HANDAYANI_OUTLINE_PNG, "PNG", startX + 38, startY + 11.5, 36, 36);
      // @ts-ignore
      doc.restoreGraphicsState();
    } else {
      doc.addImage(TUT_WURI_HANDAYANI_OUTLINE_PNG, "PNG", startX + 38, startY + 11.5, 36, 36);
    }
  } catch (e) {
    console.warn("Outline watermark render error:", e);
  }

  // 3. Logo Tut Wuri Handayani Berwarna di Header (Kiri Atas)
  try {
    doc.addImage(TUT_WURI_HANDAYANI_PNG, "PNG", startX + 3.2, startY + 2.2, 8.5, 8.5);
  } catch (e) {
    console.warn("Logo Tut Wuri render error:", e);
  }

  // 4. Teks Header Sekolah (Di samping logo)
  doc.setTextColor(15, 60, 120); // blue-900
  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.3);
  doc.text("DINAS PENDIDIKAN DAN KEBUDAYAAN", startX + 13, startY + 4.5);

  doc.setTextColor(10, 37, 80); // blue-950
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.text("SDN KANDANGAN I TOSARI", startX + 13, startY + 7.7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(3.8);
  doc.setTextColor(30, 80, 140); // blue-800
  doc.text("Kec. Tosari, Kab. Pasuruan, Jawa Timur", startX + 13, startY + 10.5);

  // 5. Badge Tipe Kartu (Kanan Atas)
  doc.setFillColor(30, 64, 175); // blue-700
  doc.roundedRect(startX + 65, startY + 3.2, 17.5, 4.8, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.4);
  doc.text(badgeLabel, startX + 73.75, startY + 6.6, { align: "center" });

  // Garis Pembatas Header
  doc.setDrawColor(56, 189, 248);
  doc.setLineWidth(0.25);
  doc.line(startX + 3, startY + 12.5, startX + 82.6, startY + 12.5);

  // 6. Bingkai Foto / Avatar Siswa (Kiri)
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(56, 189, 248); // sky-400
  doc.setLineWidth(0.35);
  doc.roundedRect(startX + 4, startY + 15, 16.5, 21.5, 1.2, 1.2, "FD");

  if (entity.photoUrl) {
    try {
      doc.addImage(entity.photoUrl, "JPEG", startX + 4.25, startY + 15.25, 16, 21);
    } catch {
      drawAvatarInitial(doc, entity.fullName, startX, startY);
    }
  } else {
    drawAvatarInitial(doc, entity.fullName, startX, startY);
  }

  // 7. Identitas Siswa: CUKUP DIISI (Nama, NISN, NIS, Tempat Lahir, Tanggal Lahir, Jenis Kelamin)
  // Nama Lengkap (Tebal, Biru Gelap Kontras)
  doc.setTextColor(10, 37, 80); // blue-950
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  const nameLines = doc.splitTextToSize(entity.fullName, 38);
  doc.text(nameLines, startX + 23, startY + 17.5);

  const startDetailY = startY + 16.8 + Math.min(nameLines.length, 2) * 2.8;

  // Baris 1: NISN
  doc.setFont("helvetica", "bold");
  doc.setFontSize(3.9);
  doc.setTextColor(30, 64, 175); // blue-800
  doc.text("NISN", startX + 23, startDetailY + 2.2);
  doc.text(":", startX + 37.5, startDetailY + 2.2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.0);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(nisnValue, startX + 39.5, startDetailY + 2.2);

  // Baris 2: NIS / NIP
  doc.setFont("helvetica", "bold");
  doc.setFontSize(3.9);
  doc.setTextColor(30, 64, 175);
  doc.text(isTeacher ? "NIP" : "NIS", startX + 23, startDetailY + 4.8);
  doc.text(":", startX + 37.5, startDetailY + 4.8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.0);
  doc.setTextColor(15, 23, 42);
  doc.text(idValue, startX + 39.5, startDetailY + 4.8);

  // Baris 3: Tempat Lahir
  doc.setFont("helvetica", "bold");
  doc.setFontSize(3.9);
  doc.setTextColor(30, 64, 175);
  doc.text("Tempat Lahir", startX + 23, startDetailY + 7.4);
  doc.text(":", startX + 37.5, startDetailY + 7.4);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.0);
  doc.setTextColor(15, 23, 42);
  const birthPlaceText = entity.birthPlace || "-";
  doc.text(doc.splitTextToSize(birthPlaceText, 23), startX + 39.5, startDetailY + 7.4);

  // Baris 4: Tanggal Lahir
  doc.setFont("helvetica", "bold");
  doc.setFontSize(3.9);
  doc.setTextColor(30, 64, 175);
  doc.text("Tanggal Lahir", startX + 23, startDetailY + 10.0);
  doc.text(":", startX + 37.5, startDetailY + 10.0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.0);
  doc.setTextColor(15, 23, 42);
  const birthDateText = formatBirthDate(entity.birthDate);
  doc.text(doc.splitTextToSize(birthDateText, 23), startX + 39.5, startDetailY + 10.0);

  // Baris 5: Jenis Kelamin
  doc.setFont("helvetica", "bold");
  doc.setFontSize(3.9);
  doc.setTextColor(30, 64, 175);
  doc.text("Jenis Kelamin", startX + 23, startDetailY + 12.6);
  doc.text(":", startX + 37.5, startDetailY + 12.6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.0);
  doc.setTextColor(15, 23, 42);
  doc.text(formatGender(entity.gender), startX + 39.5, startDetailY + 12.6);

  // 8. Kotak QR Code (Kanan)
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(56, 189, 248); // sky-400
  doc.setLineWidth(0.3);
  doc.roundedRect(startX + 62.5, startY + 14.5, 19.5, 19.5, 1.5, 1.5, "FD");

  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, "PNG", startX + 63.25, startY + 15.25, 18, 18);
    } catch (e) {
      console.warn("QR Code render error:", e);
    }
  }

  // 9. Footer Kartu
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.1);
  doc.setTextColor(30, 64, 175);
  doc.text("Berlaku selama menjadi warga sekolah aktif", startX + 4, startY + 48);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(10, 37, 80);
  doc.text("Kecamatan Tosari", startX + 81.6, startY + 48, { align: "right" });
}

function drawAvatarInitial(doc: jsPDF, fullName: string, startX: number, startY: number) {
  doc.setTextColor(30, 64, 175);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const initial = (fullName || "S").trim().charAt(0).toUpperCase();
  doc.text(initial, startX + 12.25, startY + 26.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(3.8);
  doc.setTextColor(100, 116, 139);
  doc.text("FOTO", startX + 12.25, startY + 32, { align: "center" });
}

/**
 * Menggambar Kartu Identitas Tampak Belakang pada jsPDF (Ukuran CR80: 85.6mm x 54mm)
 */
function drawCardBack(doc: jsPDF, entity: CardEntity, startX = 0, startY = 0) {
  // Background Soft Sky Blue ke Putih
  drawSkyBlueToWhiteGradient(doc, startX, startY, 85.6, 54, 2.5);

  // Watermark Siluet Tut Wuri Handayani Garis Tepi Saja
  try {
    // @ts-ignore
    if (doc.saveGraphicsState && doc.setGState && doc.GState) {
      // @ts-ignore
      doc.saveGraphicsState();
      // @ts-ignore
      doc.setGState(new doc.GState({ opacity: 0.15 }));
      doc.addImage(TUT_WURI_HANDAYANI_OUTLINE_PNG, "PNG", startX + 27, startY + 11, 32, 32);
      // @ts-ignore
      doc.restoreGraphicsState();
    } else {
      doc.addImage(TUT_WURI_HANDAYANI_OUTLINE_PNG, "PNG", startX + 27, startY + 11, 32, 32);
    }
  } catch (e) {
    // Silently continue
  }

  // Judul Ketentuan
  doc.setTextColor(10, 37, 80); // blue-950
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  doc.text("KETENTUAN KARTU ABSENSI RESMI", startX + 4, startY + 6.5);

  doc.setDrawColor(56, 189, 248);
  doc.setLineWidth(0.3);
  doc.line(startX + 4, startY + 8.5, startX + 81.6, startY + 8.5);

  // Poin-poin aturan
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFontSize(4.6);

  const rules = [
    "1. Kartu ini wajib dibawa setiap hari sekolah untuk pemindaian absensi QR Code.",
    "2. Pindai kartu kepada Guru Piket di gerbang sekolah sebelum batas jam masuk.",
    "3. Jangan melipat, merusak, membasahi, atau mencoret area QR Code kartu.",
    "4. Kartu ini hanya berlaku untuk pemilik identitas yang tertera dan tidak dapat dipindahtangankan.",
    "5. Jika kartu hilang atau rusak, segera laporkan ke Admin Sekolah untuk penerbitan ulang token.",
  ];

  let currentY = startY + 13;
  for (const r of rules) {
    const lines = doc.splitTextToSize(r, 77);
    doc.text(lines, startX + 4, currentY);
    currentY += lines.length * 3.6 + 1.2;
  }

  // Footer Belakang
  doc.setTextColor(30, 64, 175);
  doc.setFontSize(4.2);
  doc.setFont("helvetica", "bold");
  doc.text("SDN Kandangan I Tosari • Kabupaten Pasuruan, Jawa Timur", startX + 42.8, startY + 47.5, {
    align: "center",
  });
}

/**
 * 1. Unduh Berkas PDF CR-80 Standar (Ukuran persis ID Card 85.6mm x 54mm)
 * Terdiri dari 2 halaman: Halaman 1 = Depan, Halaman 2 = Belakang
 */
export function downloadCr80Pdf(entity: CardEntity, qrDataUrl: string) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [85.6, 54],
  });

  // Halaman 1: Kartu Depan
  drawCardFront(doc, entity, qrDataUrl, 0, 0);

  // Halaman 2: Kartu Belakang
  doc.addPage([85.6, 54], "landscape");
  drawCardBack(doc, entity, 0, 0);

  const cleanName = entity.fullName.replace(/[^a-zA-Z0-9]/g, "_");
  const identifier = entity.nis || entity.nip || "kartu";
  doc.save(`Kartu_ID_${identifier}_${cleanName}.pdf`);
}

/**
 * 2. Unduh Lembar A4 Siap Cetak & Gunting
 * Berisi Kartu Depan & Belakang berdampingan dengan garis potong (crop marks)
 */
export function downloadA4SheetPdf(entity: CardEntity, qrDataUrl: string) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Judul Lembar Cetak
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(10, 37, 80); // blue-950
  doc.text("KARTU IDENTITAS ABSENSI QR CODE", pageWidth / 2, 20, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "SDN Kandangan I Tosari — Ukuran Standar ID-1 / CR-80 (85.6 mm × 54.0 mm)",
    pageWidth / 2,
    25,
    { align: "center" }
  );

  // Posisi Kartu Depan & Belakang (Berdampingan di tengah lembar A4)
  const frontX = 16;
  const backX = 108.4;
  const cardY = 35;

  // Garis potong panduan (Crop marks) halus
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  // Crop marks Depan
  doc.rect(frontX - 0.5, cardY - 0.5, 86.6, 55, "S");
  // Crop marks Belakang
  doc.rect(backX - 0.5, cardY - 0.5, 86.6, 55, "S");

  // Gambar Kartu Depan & Belakang
  drawCardFront(doc, entity, qrDataUrl, frontX, cardY);
  drawCardBack(doc, entity, backX, cardY);

  // Petunjuk Pemotongan
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "Tampak Depan (85.6 x 54 mm)",
    frontX + 42.8,
    cardY + 60,
    { align: "center" }
  );
  doc.text(
    "Tampak Belakang (85.6 x 54 mm)",
    backX + 42.8,
    cardY + 60,
    { align: "center" }
  );

  doc.setDrawColor(226, 232, 240);
  doc.line(frontX, cardY + 70, backX + 85.6, cardY + 70);

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Petunjuk: Cetak dokumen ini pada skala 100% (Actual Size) menggunakan kertas tebal/foto (minimal 210 gsm), lalu potong mengikuti bingkai kartu untuk dimasukkan ke dalam plastik mika ID Card standar B2.",
    pageWidth / 2,
    cardY + 76,
    { align: "center", maxWidth: 170 }
  );

  const cleanName = entity.fullName.replace(/[^a-zA-Z0-9]/g, "_");
  const identifier = entity.nis || entity.nip || "kartu";
  doc.save(`Lembar_Cetak_A4_${identifier}_${cleanName}.pdf`);
}
