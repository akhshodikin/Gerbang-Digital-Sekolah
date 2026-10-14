"use client";

import React, { useEffect, useState } from "react";
import { UserCheck, Calendar, RefreshCw } from "lucide-react";

export default function WaliMuridAbsensiPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/attendance/recap")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setRecords(d.records || []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl font-black text-slate-800">
          Riwayat Kehadiran Ananda
        </h1>
        <p className="text-xs text-slate-500">
          Catatan absensi anak yang telah terverifikasi secara sah oleh SDN Kandangan I Tosari
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#0F2744] text-white text-[11px] uppercase font-bold">
              <tr>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">NIS</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4 text-center">Status Kehadiran</th>
                <th className="py-3 px-4">Jam Scan Masuk</th>
                <th className="py-3 px-4">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Memuat riwayat kehadiran...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Tidak ada catatan kehadiran.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.studentId} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{r.fullName}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{r.nis}</td>
                    <td className="py-3 px-4 text-slate-600">{r.className}</td>
                    <td className="py-3 px-4 text-slate-700">{r.date}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                          r.status === "HADIR"
                            ? "bg-emerald-100 text-emerald-800"
                            : r.status === "TERLAMBAT"
                            ? "bg-amber-100 text-amber-800"
                            : r.status === "IZIN"
                            ? "bg-sky-100 text-sky-800"
                            : r.status === "SAKIT"
                            ? "bg-purple-100 text-purple-800"
                            : r.status === "ALPA"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {r.recordedAt ? new Date(r.recordedAt).toLocaleTimeString("id-ID") + " WIB" : "-"}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs">{r.notes || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
