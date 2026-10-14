"use client";

import React, { useEffect, useState } from "react";
import { FileCheck2, Plus, Upload, CheckCircle2, Clock, FileText, AlertCircle } from "lucide-react";

export default function WaliMuridPerizinanPage() {
  const [permissions, setPermissions] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [studentId, setStudentId] = useState("");
  const [type, setType] = useState<"IZIN" | "SAKIT">("IZIN");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/permissions");
      const data = await res.json();
      if (data.success) setPermissions(data.permissions);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
    // Ambil anak terverifikasi
    fetch("/api/attendance/recap")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.records) {
          setChildren(d.records);
          if (d.records.length > 0) {
            setStudentId(d.records[0].studentId);
          }
        }
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !reason.trim()) return;

    setSubmitting(true);
    let attachmentUrl = null;

    try {
      // 1. Unggah berkas jika ada
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        const uploadRes = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          attachmentUrl = uploadData.fileUrl;
        } else {
          alert(`Gagal mengunggah berkas: ${uploadData.message}`);
          setSubmitting(false);
          return;
        }
      }

      // 2. Kirim pengajuan perizinan
      const res = await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          type,
          startDate,
          endDate,
          reason,
          attachmentUrl,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setShowForm(false);
        setReason("");
        setSelectedFile(null);
        fetchPermissions();
      } else {
        alert(data.message || "Gagal mengajukan izin.");
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
            Pengajuan Izin & Sakit Resmi
          </h1>
          <p className="text-xs text-slate-500">
            Formulir perizinan tidak masuk sekolah disertai unggah bukti surat atau resep dokter
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition"
        >
          <Plus size={16} /> {showForm ? "Tutup Formulir" : "Ajukan Izin Baru"}
        </button>
      </div>

      {/* Formulir Pengajuan Baru */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-blue-200 shadow-md p-6 max-w-2xl space-y-4">
          <h2 className="font-bold text-slate-800 text-sm sm:text-base">
            Formulir Pengajuan Surat Izin / Sakit
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pilih Ananda <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-600"
              >
                {children.map((c) => (
                  <option key={c.studentId} value={c.studentId}>
                    {c.fullName} ({c.className || "Siswa"})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Ketidakhadiran</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as "IZIN" | "SAKIT")}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-600"
                >
                  <option value="IZIN">Izin (Keperluan Keluarga/Mendesak)</option>
                  <option value="SAKIT">Sakit (Kondisi Kesehatan)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Unggah Lampiran Bukti</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600"
                />
                <span className="text-[10px] text-slate-400">PDF, JPG, PNG (Maks 5MB)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Mulai</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Selesai</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alasan / Keterangan Lengkap <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Jelaskan keperluan izin atau gejala sakit yang dialami ananda..."
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-600"
              ></textarea>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow disabled:opacity-50"
              >
                {submitting ? "Mengirimkan Pengajuan..." : "Kirim Pengajuan Izin"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Daftar Pengajuan */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-xs sm:text-sm text-slate-800">
          Riwayat Status Pengajuan Izin
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#0F2744] text-white text-[11px] uppercase font-bold">
              <tr>
                <th className="py-3 px-4">Tanggal Pengajuan</th>
                <th className="py-3 px-4">Nama Anak</th>
                <th className="py-3 px-4">Jenis</th>
                <th className="py-3 px-4">Rentang Tanggal</th>
                <th className="py-3 px-4">Alasan</th>
                <th className="py-3 px-4">Bukti</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Catatan Sekolah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Memuat riwayat perizinan...
                  </td>
                </tr>
              ) : permissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Belum ada pengajuan izin yang dikirimkan.
                  </td>
                </tr>
              ) : (
                permissions.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(p.createdAt).toLocaleDateString("id-ID")}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{p.studentName}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                          p.type === "SAKIT" ? "bg-purple-100 text-purple-800" : "bg-sky-100 text-sky-800"
                        }`}
                      >
                        {p.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                      {p.startDate} s/d {p.endDate}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs">{p.reason}</td>
                    <td className="py-3 px-4">
                      {p.attachmentUrl ? (
                        <a
                          href={p.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline font-semibold flex items-center gap-1"
                        >
                          <FileText size={13} /> Lampiran
                        </a>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                          p.status === "DISETUJUI"
                            ? "bg-emerald-100 text-emerald-800"
                            : p.status === "DITOLAK"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-xs italic">
                      {p.reviewNotes || "-"}
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
