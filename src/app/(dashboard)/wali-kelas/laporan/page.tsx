"use client";

import React, { useState } from "react";
import { Printer, Download, Calendar, FileText } from "lucide-react";

export default function WaliKelasLaporanPage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const pdfUrl = `/api/reports/export-pdf?type=student&date=${date}`;
  const csvUrl = `/api/reports/export-csv?type=student&date=${date}`;

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl font-black text-slate-800">
          Cetak Rekap Kehadiran Kelas
        </h1>
        <p className="text-xs text-slate-500">
          Cetak dokumen resmi presensi siswa kelas binaan SDN Kandangan I Tosari
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 max-w-xl">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Pilih Tanggal Rekap Kehadiran
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="pt-3 flex flex-wrap gap-3">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition"
          >
            <Printer size={16} /> Cetak Rekap PDF Kelas
          </a>

          <a
            href={csvUrl}
            download
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition"
          >
            <Download size={16} /> Unduh CSV Excel
          </a>
        </div>
      </div>
    </div>
  );
}
