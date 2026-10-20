import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  try {
    const templateRows = [
      {
        "NIS": "20260105",
        "NISN": "0165789130",
        "Nama Lengkap Siswa": "Budi Pratama",
        "Jenis Kelamin (L/P)": "L",
        "Kelas": "Kelas 1",
        "Tempat Lahir": "Pasuruan",
        "Tanggal Lahir (YYYY-MM-DD)": "2019-05-15",
        "Alamat Domisili Siswa": "Dusun Krajan RT 01/01, Kandangan",
        "Nama Orang Tua / Wali": "Hadi Santoso",
        "Hubungan (Ayah/Ibu/Wali)": "Ayah",
        "No Telp / WA Orang Tua": "081234567899",
      },
      {
        "NIS": "20260106",
        "NISN": "0165789131",
        "Nama Lengkap Siswa": "Dewi Lestari",
        "Jenis Kelamin (L/P)": "P",
        "Kelas": "Kelas 1",
        "Tempat Lahir": "Pasuruan",
        "Tanggal Lahir (YYYY-MM-DD)": "2019-09-22",
        "Alamat Domisili Siswa": "Dusun Ledoksari RT 02/01, Kandangan",
        "Nama Orang Tua / Wali": "Sri Wahyuni",
        "Hubungan (Ayah/Ibu/Wali)": "Ibu",
        "No Telp / WA Orang Tua": "081234567888",
      },
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateRows);

    worksheet["!cols"] = [
      { wch: 14 }, // NIS
      { wch: 14 }, // NISN
      { wch: 30 }, // Nama Lengkap
      { wch: 20 }, // L/P
      { wch: 14 }, // Kelas
      { wch: 16 }, // Tempat Lahir
      { wch: 25 }, // Tanggal Lahir
      { wch: 35 }, // Alamat
      { wch: 25 }, // Nama Ortu
      { wch: 25 }, // Hubungan
      { wch: 22 }, // No Telp Ortu
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "DATA_SISWA");

    // Sheet panduan
    const guideRows = [
      { "Kolom": "NIS", "Keterangan": "Nomor Induk Siswa (Wajib diisi, unik per siswa)", "Contoh": "20260105" },
      { "Kolom": "NISN", "Keterangan": "Nomor Induk Siswa Nasional (Opsional, 10 digit)", "Contoh": "0165789130" },
      { "Kolom": "Nama Lengkap Siswa", "Keterangan": "Nama lengkap peserta didik (Wajib diisi)", "Contoh": "Budi Pratama" },
      { "Kolom": "Jenis Kelamin (L/P)", "Keterangan": "L = Laki-laki, P = Perempuan (Wajib diisi)", "Contoh": "L" },
      { "Kolom": "Kelas", "Keterangan": "Nama rombel yang sudah ada di sistem (Kelas 1 s/d Kelas 6)", "Contoh": "Kelas 1" },
      { "Kolom": "Tempat Lahir", "Keterangan": "Kota / Kabupaten tempat kelahiran (Opsional)", "Contoh": "Pasuruan" },
      { "Kolom": "Tanggal Lahir (YYYY-MM-DD)", "Keterangan": "Format tanggal YYYY-MM-DD (2019-05-15) atau DD/MM/YYYY (15/05/2019) atau format tanggal Excel otomatis", "Contoh": "2019-05-15" },
      { "Kolom": "Alamat Domisili Siswa", "Keterangan": "Alamat tempat tinggal siswa (Opsional)", "Contoh": "Dusun Krajan, Tosari" },
      { "Kolom": "Nama Orang Tua / Wali", "Keterangan": "Nama ayah, ibu, atau wali murid (Bisa diisi nama saja walau belum ada nomor telepon)", "Contoh": "Hadi Santoso" },
      { "Kolom": "Hubungan (Ayah/Ibu/Wali)", "Keterangan": "Status hubungan keluarga (Ayah, Ibu, atau Wali)", "Contoh": "Ayah" },
      { "Kolom": "No Telp / WA Orang Tua", "Keterangan": "Nomor aktif WhatsApp orang tua (Opsional, untuk pengiriman notifikasi absensi)", "Contoh": "081234567899" },
    ];
    const guideSheet = XLSX.utils.json_to_sheet(guideRows);
    guideSheet["!cols"] = [{ wch: 28 }, { wch: 65 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, guideSheet, "PANDUAN_PENGISIAN");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="Template_Data_Siswa_SDN_Kandangan.xlsx"',
      },
    });
  } catch (error: any) {
    console.error("Template XLSX error:", error);
    return NextResponse.json({ success: false, message: "Gagal mengunduh template Excel." }, { status: 500 });
  }
}
