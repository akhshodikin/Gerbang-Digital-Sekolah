"use client";

import React, { useEffect, useState } from "react";
import { Calendar, RefreshCw, Printer, Edit3 } from "lucide-react";

export default function WaliKelasAbsensiPage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [records, setRecords] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpa: 0 });
  const [loading, setLoading] = useState(true);

  // Koreksi status
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState("HADIR");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/recap?date=${date}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.records);
        setStats(data.stats);
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

  const handleCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !reason.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/attendance/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent.studentId,
          date,
          status: newStatus,
          reason,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setSelectedStudent(null);
        setReason("");
        fetchData();
      } else {
        alert(data.message || "Gagal memperbarui status.");
      }
    } catch (e) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-black text-slate-800">
            Daftar Kehadiran Siswa Kelas
          </h1>
          <p className="text-xs text-slate-500">
            Pemantauan presensi harian kelas binaan SDN Kandangan I Tosari
          </p>
        </div>

        <a
          href={`/api/reports/export-pdf?type=student&date=${date}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition"
        >
          <Printer size={15} /> Cetak Rekap Harian PDF
        </a>
      </div>

      {/* Date bar */}
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
                <th className="py-3 px-4">NIS</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4 text-center">Status Kehadiran</th>
                <th className="py-3 px-4">Waktu Scan (WIB)</th>
                <th className="py-3 px-4">Catatan</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Memuat presensi siswa kelas...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Tidak ada siswa terdaftar pada kelas binaan Anda.
                  </td>
                </tr>
              ) : (
                records.map((r, idx) => (
                  <tr key={r.studentId} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{r.nis}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{r.fullName}</td>
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
                      {r.recordedAt
                        ? new Date(r.recordedAt).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs">{r.notes || "-"}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedStudent(r);
                          setNewStatus(r.status === "BELUM_HADIR" ? "HADIR" : r.status);
                        }}
                        className="p-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                        title="Koreksi status"
                      >
                        <Edit3 size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Koreksi */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-slate-800 text-base mb-1">
              Koreksi Status Kehadiran
            </h3>
            <p className="text-xs text-slate-500 mb-4">{selectedStudent.fullName}</p>

            <form onSubmit={handleCorrection} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status Baru</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-600"
                >
                  <option value="HADIR">Hadir</option>
                  <option value="TERLAMBAT">Terlambat</option>
                  <option value="IZIN">Izin</option>
                  <option value="SAKIT">Sakit</option>
                  <option value="ALPA">Alpa</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Koreksi <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Keterangan sah dari wali kelas..."
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-600"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
