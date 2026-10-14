import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  try {
    const templateRows = [
      {
        "Nama Lengkap & Gelar": "Siti Rahmawati, S.Pd",
        "NIP": "198503152010012015",
        "Jenis Kelamin (L/P)": "P",
        "Jabatan / Tugas": "Guru Kelas 1",
        "Status Kepegawaian": "PNS",
        "Wali Kelas": "Kelas 1",
        "Username Login": "walikelas1",
        "No Telp / WhatsApp": "081234567892",
        "Email": "walikelas1@sdnkandangan1.sch.id",
        "Alamat Domisili": "Dusun Krajan RT 02/01, Kandangan",
      },
      {
        "Nama Lengkap & Gelar": "Rina Wulandari, S.Pd",
        "NIP": "198904122014022003",
        "Jenis Kelamin (L/P)": "P",
        "Jabatan / Tugas": "Guru Kelas 2",
        "Status Kepegawaian": "PPPK",
        "Wali Kelas": "Kelas 2",
        "Username Login": "walikelas2",
        "No Telp / WhatsApp": "081234567895",
        "Email": "walikelas2@sdnkandangan1.sch.id",
        "Alamat Domisili": "Dusun Ledoksari RT 01/02, Kandangan",
      },
      {
        "Nama Lengkap & Gelar": "Agus Setiawan, S.Pd.SD",
        "NIP": "199105202019031006",
        "Jenis Kelamin (L/P)": "L",
        "Jabatan / Tugas": "Guru Kelas 3",
        "Status Kepegawaian": "PPPK",
        "Wali Kelas": "Kelas 3",
        "Username Login": "walikelas3",
        "No Telp / WhatsApp": "081234567896",
        "Email": "walikelas3@sdnkandangan1.sch.id",
        "Alamat Domisili": "Dusun Krajan RT 03/01, Kandangan",
      },
      {
        "Nama Lengkap & Gelar": "Ahmad Fauzi, S.Pd.SD",
        "NIP": "198811202014021003",
        "Jenis Kelamin (L/P)": "L",
        "Jabatan / Tugas": "Guru Kelas 4",
        "Status Kepegawaian": "PNS",
        "Wali Kelas": "Kelas 4",
        "Username Login": "walikelas4",
        "No Telp / WhatsApp": "081234567893",
        "Email": "walikelas4@sdnkandangan1.sch.id",
        "Alamat Domisili": "Dusun Bromo RT 01/03, Tosari",
      },
      {
        "Nama Lengkap & Gelar": "Dewi Nurhayati, S.Pd",
        "NIP": "199308152020122011",
        "Jenis Kelamin (L/P)": "P",
        "Jabatan / Tugas": "Guru Kelas 5",
        "Status Kepegawaian": "PPPK",
        "Wali Kelas": "Kelas 5",
        "Username Login": "walikelas5",
        "No Telp / WhatsApp": "081234567897",
        "Email": "walikelas5@sdnkandangan1.sch.id",
        "Alamat Domisili": "Dusun Mororejo RT 02/01, Tosari",
      },
      {
        "Nama Lengkap & Gelar": "Tri Wahyudi, S.Pd",
        "NIP": "198602102011011009",
        "Jenis Kelamin (L/P)": "L",
        "Jabatan / Tugas": "Guru Kelas 6",
        "Status Kepegawaian": "PNS",
        "Wali Kelas": "Kelas 6",
        "Username Login": "walikelas6",
        "No Telp / WhatsApp": "081234567898",
        "Email": "walikelas6@sdnkandangan1.sch.id",
        "Alamat Domisili": "Dusun Krajan RT 01/01, Kandangan",
      },
      {
        "Nama Lengkap & Gelar": "Budi Santoso, S.Pd",
        "NIP": "199207042019031008",
        "Jenis Kelamin (L/P)": "L",
        "Jabatan / Tugas": "Guru PJOK / Petugas Piket",
        "Status Kepegawaian": "PPPK",
        "Wali Kelas": "-",
        "Username Login": "piket",
        "No Telp / WhatsApp": "081234567891",
        "Email": "piket@sdnkandangan1.sch.id",
        "Alamat Domisili": "Dusun Krajan, Kandangan",
      },
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateRows);

    worksheet["!cols"] = [
      { wch: 28 }, // Nama Lengkap
      { wch: 22 }, // NIP
      { wch: 20 }, // L/P
      { wch: 25 }, // Jabatan
      { wch: 20 }, // Status Kepegawaian
      { wch: 15 }, // Wali Kelas
      { wch: 18 }, // Username Login
      { wch: 22 }, // No Telp
      { wch: 30 }, // Email
      { wch: 35 }, // Alamat
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "DATA_GURU");

    // Sheet Panduan Pengisian
    const guideRows = [
      {
        "Nama Kolom": "Nama Lengkap & Gelar",
        "Status": "Wajib",
        "Keterangan": "Nama lengkap dewan guru/staf beserta gelar akademik resmi",
        "Contoh": "Siti Rahmawati, S.Pd",
      },
      {
        "Nama Kolom": "NIP",
        "Status": "Opsional",
        "Keterangan": "Nomor Induk Pegawai 18 digit untuk PNS/PPPK (Kosongkan jika Honorer/GTT)",
        "Contoh": "198503152010012015",
      },
      {
        "Nama Kolom": "Jenis Kelamin (L/P)",
        "Status": "Wajib",
        "Keterangan": "L = Laki-laki, P = Perempuan",
        "Contoh": "P",
      },
      {
        "Nama Kolom": "Jabatan / Tugas",
        "Status": "Wajib",
        "Keterangan": "Tugas utama (misal: Guru Kelas 1, Guru PJOK, Guru PAI, Kepala Sekolah, Staf TU)",
        "Contoh": "Guru Kelas 1",
      },
      {
        "Nama Kolom": "Status Kepegawaian",
        "Status": "Wajib",
        "Keterangan": "Pilihan status: PNS, PPPK, atau HONORER",
        "Contoh": "PNS",
      },
      {
        "Nama Kolom": "Wali Kelas",
        "Status": "Opsional",
        "Keterangan": "Isi dengan 'Kelas 1' s/d 'Kelas 6' jika guru bertugas sebagai Wali Kelas. Isi '-' jika bukan wali kelas. Sistem otomatis menghubungkan guru dengan rombel binaannya.",
        "Contoh": "Kelas 1",
      },
      {
        "Nama Kolom": "Username Login",
        "Status": "Opsional",
        "Keterangan": "Username akun untuk masuk ke aplikasi. Jika dikosongkan dan guru adalah wali kelas, sistem otomatis membuatkan akun (misal: walikelas1) dengan password bawaan 'guru123'.",
        "Contoh": "walikelas1",
      },
      {
        "Nama Kolom": "No Telp / WhatsApp",
        "Status": "Disarankan",
        "Keterangan": "Nomor WhatsApp aktif guru untuk koordinasi dan notifikasi",
        "Contoh": "081234567892",
      },
      {
        "Nama Kolom": "Email",
        "Status": "Opsional",
        "Keterangan": "Alamat email aktif guru",
        "Contoh": "walikelas1@sdnkandangan1.sch.id",
      },
      {
        "Nama Kolom": "Alamat Domisili",
        "Status": "Opsional",
        "Keterangan": "Alamat tempat tinggal guru",
        "Contoh": "Dusun Krajan, Tosari",
      },
    ];

    const guideSheet = XLSX.utils.json_to_sheet(guideRows);
    guideSheet["!cols"] = [{ wch: 24 }, { wch: 12 }, { wch: 65 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(workbook, guideSheet, "PANDUAN_PENGISIAN");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="Template_Data_Guru_SDN_Kandangan.xlsx"',
      },
    });
  } catch (error: any) {
    console.error("Template teachers XLSX error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengunduh template Excel guru." },
      { status: 500 }
    );
  }
}
