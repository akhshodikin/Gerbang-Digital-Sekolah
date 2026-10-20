"use client";

import React, { useEffect, useState } from "react";
import { FileText, Download, Printer, Filter, Calendar, Users, GraduationCap } from "lucide-react";
import KopSuratLogoManager from "@/components/reports/KopSuratLogoManager";

export default function AdminReportsPage() {
  const [reportType, setReportType] = useState<"student" | "teacher">("student");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [classId, setClassId] = useState("");
  const [classes, setClasses] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/master/classes")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setClasses(d.classes);
      });
  }, []);

  const pdfUrl = `/api/reports/export-pdf?type=${reportType}&date=${date}${
    reportType === "student" && classId ? `&classId=${classId}` : ""
  }`;

  const csvUrl = `/api/reports/export-csv?type=${reportType}&date=${date}${
    reportType === "student" && classId ? `&classId=${classId}` : ""
  }`;

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl font-black text-slate-800">
          Pusat Laporan & Rekapitulasi Kehadiran
        </h1>
        <p className="text-xs text-slate-500">
          Ekspor dokumen resmi PDF bertanda tangan dan data spreadsheet CSV/Excel SDN Kandangan I Tosari
        </p>
      </div>

      {/* Filter Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <h2 className="font-bold text-sm text-slate-800 flex items-center gap-2">
          <Filter size={16} className="text-blue-600" /> Pengaturan Laporan
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Jenis Rekapitulasi
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as "student" | "teacher")}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-600"
            >
              <option value="student">Rekapitulasi Kehadiran Siswa</option>
              <option value="teacher">Rekapitulasi Kehadiran Dewan Guru</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tanggal Rekap
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {reportType === "student" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Sasaran Kelas
              </label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-600"
              >
                <option value="">Semua Kelas (1 s/d 6)</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-3">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition"
          >
            <Printer size={16} /> Unduh / Cetak Dokumen PDF Resmi
          </a>

          <a
            href={csvUrl}
            download
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition"
          >
            <Download size={16} /> Unduh Data CSV / Excel
          </a>
        </div>
      </div>

      {/* Bagian Pengelolaan Logo Kop Surat Laporan PDF */}
      <KopSuratLogoManager />

      {/* Guide Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-xs text-slate-600 space-y-2">
        <h3 className="font-bold text-slate-800 text-sm">Ketentuan Format Laporan Resmi:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Dokumen PDF memuat Kop Surat Resmi Pemerintah Kabupaten Pasuruan & Dinas Pendidikan.</li>
          <li>Memuat nomor pokok sekolah nasional (NPSN), alamat lengkap SDN Kandangan I Tosari.</li>
          <li>Dilengkapi lembar pengesahan tanda tangan Kepala Sekolah AKHMAD SHODIKIN, M.Pd (NIP. 198503182009031009).</li>
          <li>Format file CSV menggunakan enkoding UTF-8 BOM untuk kompatibilitas penuh dengan Microsoft Excel.</li>
        </ul>
      </div>
    </div>
  );
}
