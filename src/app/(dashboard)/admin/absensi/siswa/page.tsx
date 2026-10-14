"use client";

import React, { useEffect, useState } from "react";
import {
  Calendar,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck2,
  Edit3,
  RefreshCw,
  Printer,
} from "lucide-react";

export default function AdminStudentAttendancePage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [classId, setClassId] = useState("");
  const [classes, setClasses] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [records, setRecords] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    total: 0,
    hadir: 0,
    terlambat: 0,
    izin: 0,
    sakit: 0,
    alpa: 0,
    belumHadir: 0,
  });
  const [loading, setLoading] = useState(true);

  // Modal Koreksi
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState("HADIR");
  const [correctionReason, setCorrectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `/api/attendance/recap?date=${date}`;
      if (classId) url += `&classId=${classId}`;
      if (statusFilter) url += `&status=${statusFilter}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setRecords(data.records);
        setStats(data.stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Ambil kelas
    fetch("/api/master/classes")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setClasses(d.classes);
      });
  }, []);

  useEffect(() => {
    fetchData();
  }, [date, classId, statusFilter]);

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !correctionReason.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/attendance/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent.studentId,
          date,
          status: newStatus,
          reason: correctionReason,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setSelectedStudent(null);
        setCorrectionReason("");
        fetchData();
      } else {
        alert(data.message || "Gagal melakukan koreksi.");
      }
    } catch (err) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "HADIR":
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-bold">HADIR</span>;
      case "TERLAMBAT":
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 text-xs px-2.5 py-0.5 rounded-full font-bold">TERLAMBAT</span>;
      case "IZIN":
        return <span className="bg-sky-100 text-sky-800 border border-sky-300 text-xs px-2.5 py-0.5 rounded-full font-bold">IZIN</span>;
      case "SAKIT":
        return <span className="bg-purple-100 text-purple-800 border border-purple-300 text-xs px-2.5 py-0.5 rounded-full font-bold">SAKIT</span>;
      case "ALPA":
        return <span className="bg-rose-100 text-rose-800 border border-rose-300 text-xs px-2.5 py-0.5 rounded-full font-bold">ALPA</span>;
      default:
        return <span className="bg-slate-100 text-slate-600 border border-slate-300 text-xs px-2.5 py-0.5 rounded-full font-semibold">BELUM HADIR</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-black text-slate-800">
            Monitoring Absensi Siswa
          </h1>
          <p className="text-xs text-slate-500">
            Pencatatan kehadiran harian siswa berbasis QR Code SDN Kandangan I Tosari
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/api/reports/export-pdf?type=student&date=${date}${classId ? `&classId=${classId}` : ""}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition"
          >
            <Printer size={15} /> Cetak Rekap PDF
          </a>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
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

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Filter size={15} className="text-blue-600" />
          <span>Kelas:</span>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Semua Kelas</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <span>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Semua Status</option>
            <option value="HADIR">Hadir</option>
            <option value="TERLAMBAT">Terlambat</option>
            <option value="IZIN">Izin</option>
            <option value="SAKIT">Sakit</option>
            <option value="ALPA">Alpa</option>
          </select>
        </div>

        <button
          onClick={fetchData}
          className="ml-auto text-xs text-blue-700 font-semibold hover:underline flex items-center gap-1"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh Data
        </button>
      </div>

      {/* Mini Stats Bar */}
      <div className="flex flex-wrap gap-2 text-xs font-medium">
        <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg">
          Total: <strong>{stats.total}</strong>
        </span>
        <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-lg">
          Hadir: <strong>{stats.hadir}</strong>
        </span>
        <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-lg">
          Terlambat: <strong>{stats.terlambat}</strong>
        </span>
        <span className="bg-sky-100 text-sky-800 px-3 py-1 rounded-lg">
          Izin: <strong>{stats.izin}</strong>
        </span>
        <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-lg">
          Sakit: <strong>{stats.sakit}</strong>
        </span>
        <span className="bg-rose-100 text-rose-800 px-3 py-1 rounded-lg">
          Alpa: <strong>{stats.alpa}</strong>
        </span>
        <span className="bg-slate-200 text-slate-700 px-3 py-1 rounded-lg">
          Belum Hadir: <strong>{stats.belumHadir}</strong>
        </span>
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
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4 text-center">Status Kehadiran</th>
                <th className="py-3 px-4">Waktu Scan (WIB)</th>
                <th className="py-3 px-4">Metode</th>
                <th className="py-3 px-4 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <RefreshCw className="animate-spin inline mr-2 text-blue-600" size={18} />
                    Memuat data kehadiran...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Tidak ada catatan kehadiran yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                records.map((r, idx) => (
                  <tr key={r.studentId} className="hover:bg-blue-50/40 transition">
                    <td className="py-3 px-4 text-slate-500 font-semibold">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{r.nis}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{r.fullName}</td>
                    <td className="py-3 px-4 text-slate-600">{r.className}</td>
                    <td className="py-3 px-4 text-center">{getStatusBadge(r.status)}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {r.recordedAt
                        ? new Date(r.recordedAt).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })
                        : "-"}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs">
                      {r.scanMethod ? (
                        <span className="bg-slate-100 px-2 py-0.5 rounded font-medium">{r.scanMethod}</span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedStudent(r);
                          setNewStatus(r.status === "BELUM_HADIR" ? "HADIR" : r.status);
                        }}
                        className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition"
                        title="Koreksi status kehadiran"
                      >
                        <Edit3 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Koreksi Kehadiran Siswa */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-slate-800 text-base mb-1">
              Koreksi Status Kehadiran Siswa
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {selectedStudent.fullName} (NIS: {selectedStudent.nis} - {selectedStudent.className})
            </p>

            <form onSubmit={handleCorrectionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status Baru
                </label>
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
                  <option value="PULANG_CEPAT">Pulang Lebih Awal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Koreksi / Catatan Audit <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="Contoh: Siswa melapor ke ruang guru membawa surat keterangan wali murid..."
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-600"
                ></textarea>
                <p className="text-[10px] text-slate-400 mt-1">
                  Semua koreksi dicatat secara permanen di audit log dengan identitas Anda.
                </p>
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
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Koreksi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
