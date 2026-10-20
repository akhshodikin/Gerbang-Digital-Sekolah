import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { getDb, schema } from "@/lib/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import fs from "fs";
import path from "path";

// Helper konversi URL/File ke Base64 Data URL untuk jsPDF
async function getImageDataUrl(
  inputUrlOrBase64?: string | null,
  fallbackRelativePath?: string
): Promise<string | null> {
  if (inputUrlOrBase64 && inputUrlOrBase64.startsWith("data:image/")) {
    return inputUrlOrBase64;
  }
  if (inputUrlOrBase64 && (inputUrlOrBase64.startsWith("http://") || inputUrlOrBase64.startsWith("https://"))) {
    try {
      const resp = await fetch(inputUrlOrBase64);
      if (resp.ok) {
        const buffer = await resp.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const contentType = resp.headers.get("content-type") || "image/png";
        return `data:${contentType};base64,${base64}`;
      }
    } catch (e) {
      console.warn("Gagal fetch url gambar:", inputUrlOrBase64, e);
    }
  }
  if (fallbackRelativePath) {
    try {
      const filePath = path.join(process.cwd(), fallbackRelativePath);
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath).replace(".", "").toLowerCase();
        const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
        const fileBuf = fs.readFileSync(filePath);
        return `data:${mime};base64,${fileBuf.toString("base64")}`;
      }
    } catch (e) {
      console.warn("Gagal membaca fallback image:", fallbackRelativePath, e);
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["ADMIN", "WALI_KELAS", "GURU_PIKET"]);
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();

  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "student"; // 'student' or 'teacher'
  const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];
  let classId = url.searchParams.get("classId");

  if (session.roles.includes("WALI_KELAS") && !session.roles.includes("ADMIN")) {
    classId = session.homeroomClassId || null;
  }

  try {
    // Ambil info sekolah untuk Kop Surat
    const [school] = await db
      .select()
      .from(schema.schools)
      .where(eq(schema.schools.id, session.schoolId));

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. KOP SURAT RESMI SEKOLAH
    // Muat Logo Kabupaten (Kiri) dan Logo Sekolah/GDS (Kanan)
    const leftLogoData = await getImageDataUrl(school?.regionLogoUrl, "public/images/tut-wuri-handayani.png");
    const rightLogoData = await getImageDataUrl(school?.logoUrl, "public/images/logo-gds.png");

    if (leftLogoData) {
      try {
        const format = leftLogoData.startsWith("data:image/jpeg") || leftLogoData.startsWith("data:image/jpg") ? "JPEG" : "PNG";
        doc.addImage(leftLogoData, format, 14, 10, 20, 24);
      } catch (err) {
        console.warn("Gagal menyematkan logo kabupaten di PDF:", err);
      }
    }

    if (rightLogoData) {
      try {
        const format = rightLogoData.startsWith("data:image/jpeg") || rightLogoData.startsWith("data:image/jpg") ? "JPEG" : "PNG";
        doc.addImage(rightLogoData, format, pageWidth - 34, 10, 20, 24);
      } catch (err) {
        console.warn("Gagal menyematkan logo sekolah di PDF:", err);
      }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("PEMERINTAH KABUPATEN PASURUAN", pageWidth / 2, 14, { align: "center" });
    doc.text("DINAS PENDIDIKAN DAN KEBUDAYAAN", pageWidth / 2, 19, { align: "center" });

    doc.setFontSize(14);
    doc.text(school?.name || "SDN KANDANGAN I TOSARI", pageWidth / 2, 26, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      school?.address || "Jl. Bromo No. 12, Desa Kandangan, Kec. Tosari, Kab. Pasuruan, Jawa Timur 67177",
      pageWidth / 2,
      31,
      { align: "center" }
    );
    doc.text(`Email: ${school?.email || "sdnkandangan1tosari@pasuruankab.sch.id"} | NPSN: ${school?.npsn || "20519101"}`, pageWidth / 2, 35, {
      align: "center",
    });

    // Garis Kop Surat Ganda
    doc.setLineWidth(0.8);
    doc.line(14, 38, pageWidth - 14, 38);
    doc.setLineWidth(0.2);
    doc.line(14, 39.5, pageWidth - 14, 39.5);

    // 2. JUDUL LAPORAN & PERIODE
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(
      type === "teacher" ? "LAPORAN REKAPITULASI KEHADIRAN DEWAN GURU" : "LAPORAN REKAPITULASI KEHADIRAN SISWA",
      pageWidth / 2,
      47,
      { align: "center" }
    );

    let classNameLabel = "Semua Kelas";
    if (classId) {
      const [cls] = await db.select({ name: schema.classes.name }).from(schema.classes).where(eq(schema.classes.id, classId));
      if (cls) classNameLabel = cls.name;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Tanggal Rekap: ${date}   |   Sasaran: ${classNameLabel}`, pageWidth / 2, 52, { align: "center" });

    // 3. AMBIL DATA DATABASE
    let head = [];
    let body: any[] = [];
    let statsSummary = { hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpa: 0 };

    if (type === "teacher") {
      head = [["No", "Nama Guru", "NIP", "Jabatan", "Status", "Jam Masuk", "Jam Pulang"]];
      const records = await db
        .select({
          name: schema.teachers.fullName,
          nip: schema.teachers.nip,
          position: schema.teachers.position,
          status: schema.teacherAttendance.status,
          checkIn: schema.teacherAttendance.checkInTime,
          checkOut: schema.teacherAttendance.checkOutTime,
        })
        .from(schema.teacherAttendance)
        .innerJoin(schema.teachers, eq(schema.teacherAttendance.teacherId, schema.teachers.id))
        .where(
          and(
            eq(schema.teacherAttendance.schoolId, session.schoolId),
            eq(schema.teacherAttendance.date, date)
          )
        );

      body = records.map((r: any, idx: number) => {
        if (r.status === "HADIR") statsSummary.hadir++;
        else if (r.status === "TERLAMBAT") statsSummary.terlambat++;
        else if (r.status === "IZIN") statsSummary.izin++;
        else if (r.status === "SAKIT") statsSummary.sakit++;
        else if (r.status === "ALPA") statsSummary.alpa++;

        return [
          idx + 1,
          r.name,
          r.nip || "-",
          r.position || "Guru",
          r.status,
          r.checkIn ? new Date(r.checkIn).toLocaleTimeString("id-ID") : "-",
          r.checkOut ? new Date(r.checkOut).toLocaleTimeString("id-ID") : "-",
        ];
      });
    } else {
      head = [["No", "NIS", "Nama Siswa", "Kelas", "Status Kehadiran", "Waktu Scan", "Metode"]];

      const studentConditions = [
        eq(schema.students.schoolId, session.schoolId),
        eq(schema.students.status, "AKTIF"),
      ];
      if (classId) studentConditions.push(eq(schema.students.currentClassId, classId));

      const students = await db
        .select({
          id: schema.students.id,
          nis: schema.students.nis,
          fullName: schema.students.fullName,
          className: schema.classes.name,
        })
        .from(schema.students)
        .leftJoin(schema.classes, eq(schema.students.currentClassId, schema.classes.id))
        .where(and(...studentConditions));

      const attendances = await db
        .select()
        .from(schema.studentAttendance)
        .where(
          and(
            eq(schema.studentAttendance.schoolId, session.schoolId),
            eq(schema.studentAttendance.date, date)
          )
        );

      const attMap = new Map();
      attendances.forEach((a: any) => attMap.set(`${a.studentId}_${a.date}`, a));

      body = students.map((s: any, idx: number) => {
        const att = attMap.get(`${s.id}_${date}`);
        const status = att ? att.status : "BELUM_HADIR";
        if (status === "HADIR") statsSummary.hadir++;
        else if (status === "TERLAMBAT") statsSummary.terlambat++;
        else if (status === "IZIN") statsSummary.izin++;
        else if (status === "SAKIT") statsSummary.sakit++;
        else if (status === "ALPA") statsSummary.alpa++;

        return [
          idx + 1,
          s.nis,
          s.fullName,
          s.className || "-",
          status,
          att ? new Date(att.recordedAt).toLocaleTimeString("id-ID") : "-",
          att ? att.scanMethod : "-",
        ];
      });
    }

    // 4. TABEL DENGAN JSPDF-AUTOTABLE
    autoTable(doc, {
      head,
      body,
      startY: 57,
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 2,
        textColor: [20, 20, 20],
      },
      headStyles: {
        fillColor: [15, 39, 68], // Navy Brand
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "center",
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        1: { halign: "center", cellWidth: 25 },
        4: { halign: "center" },
        5: { halign: "center" },
        6: { halign: "center" },
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 8;

    // 5. RINGKASAN STATISTIK
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(
      `Rekapitulasi: Hadir: ${statsSummary.hadir}  |  Terlambat: ${statsSummary.terlambat}  |  Izin: ${statsSummary.izin}  |  Sakit: ${statsSummary.sakit}  |  Alpa: ${statsSummary.alpa}`,
      14,
      finalY
    );

    // 6. BLOK TANDA TANGAN RESMI
    const signY = finalY + 12;
    const printDate = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    doc.text(`Tosari, ${printDate}`, pageWidth - 60, signY);
    doc.text("Mengetahui,", pageWidth - 60, signY + 4);
    doc.text("Kepala SDN Kandangan I Tosari", pageWidth - 60, signY + 8);

    doc.setFont("helvetica", "bold");
    doc.text(school?.headmasterName || "AKHMAD SHODIKIN, M.Pd", pageWidth - 60, signY + 28);
    doc.setFont("helvetica", "normal");
    doc.text(`NIP. ${school?.headmasterNip || "198503182009031009"}`, pageWidth - 60, signY + 32);

    // Footer nomor halaman & sistem
    const pageCount = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text(
        `Dokumen resmi dicetak otomatis melalui Sistem Absensi SDN Kandangan I Tosari - Halaman ${i} dari ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: "center" }
      );
    }

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="rekap-absensi-${type}-${date}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Export PDF error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengekspor laporan PDF." },
      { status: 500 }
    );
  }
}
