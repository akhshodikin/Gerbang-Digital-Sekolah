"use client";

import React, { useEffect, useState } from "react";
import { Clock, Calendar, RefreshCw, AlertTriangle } from "lucide-react";

export default function PiketKeterlambatanPage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [lateStudents, setLateStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/recap?date=${date}&status=TERLAMBAT`);
      const data = await res.json();
      if (data.success) {
        setLateStudents((data.records || []).filter((r: any) => r.status === "TERLAMBAT"));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [date]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-black text-slate-800">
            Daftar Siswa Terlambat Hadir
          </h1>
          <p className="text-xs text-slate-500">
            Catatan kedatangan siswa melebihi batas waktu toleransi gerbang (07.00 WIB)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={fetchData}
            className="text-xs text-blue-700 font-semibold hover:underline flex items-center gap-1"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#0F2744] text-white text-[11px] uppercase font-bold">
              <tr>
                <th className="py-3 px-4">No</th>
                <th className="py-3 px-4">NIS</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Waktu Hadir di Gerbang</th>
                <th className="py-3 px-4">Keterangan / Alasan Terlambat</th>
                <th className="py-3 px-4 text-center">Status Notifikasi Orang Tua</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Memuat daftar siswa terlambat...
                  </td>
                </tr>
              ) : lateStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Tidak ada siswa yang tercatat terlambat pada tanggal ini.
                  </td>
                </tr>
              ) : (
                lateStudents.map((s, idx) => (
                  <tr key={s.studentId} className="hover:bg-amber-50/40">
                    <td className="py-3 px-4 text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{s.nis}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{s.fullName}</td>
                    <td className="py-3 px-4 text-slate-600">{s.className}</td>
                    <td className="py-3 px-4 font-semibold text-amber-700">
                      {s.recordedAt
                        ? new Date(s.recordedAt).toLocaleTimeString("id-ID") + " WIB"
                        : "-"}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{s.notes || "Hadir lewat pukul 07.00"}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Terkirim ke WhatsApp
                      </span>
                    </td>
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
