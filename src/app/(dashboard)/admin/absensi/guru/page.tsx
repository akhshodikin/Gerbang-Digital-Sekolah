"use client";

import React, { useEffect, useState } from "react";
import { Calendar, RefreshCw, Printer, Clock, UserCheck, Shield } from "lucide-react";

export default function AdminTeacherAttendancePage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/recap?type=teacher&date=${date}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.records);
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
            Absensi Dewan Guru & Tenaga Kependidikan
          </h1>
          <p className="text-xs text-slate-500">
            Pencatatan kehadiran jam datang dan jam pulang guru SDN Kandangan I Tosari
          </p>
        </div>

        <a
          href={`/api/reports/export-pdf?type=teacher&date=${date}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition"
        >
          <Printer size={15} /> Cetak Rekap Guru PDF
        </a>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Calendar size={15} className="text-blue-600" />
          <span>Tanggal:</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={fetchData}
          className="ml-auto text-xs text-blue-700 font-semibold hover:underline flex items-center gap-1"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#0F2744] text-white text-[11px] uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">No</th>
                <th className="py-3 px-4">Nama Guru</th>
                <th className="py-3 px-4">NIP</th>
                <th className="py-3 px-4">Tugas / Jabatan</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Jam Masuk (Datang)</th>
                <th className="py-3 px-4">Jam Pulang</th>
                <th className="py-3 px-4">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Memuat absensi dewan guru...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Belum ada rekaman absensi guru pada tanggal ini.
                  </td>
                </tr>
              ) : (
                records.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-500 font-semibold">{idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{r.teacherName}</td>
                    <td className="py-3 px-4 text-slate-600">{r.nip || "-"}</td>
                    <td className="py-3 px-4 text-slate-600">{r.position || "Guru"}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-emerald-700">
                      {r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString("id-ID") + " WIB" : "-"}
                    </td>
                    <td className="py-3 px-4 font-semibold text-blue-700">
                      {r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString("id-ID") + " WIB" : "-"}
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
