"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, Plus, RefreshCw } from "lucide-react";

export default function WaliKelasPembinaanPage() {
  const [violations, setViolations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedViolation, setSelectedViolation] = useState<any | null>(null);
  const [actionTaken, setActionTaken] = useState("");
  const [studentResponse, setStudentResponse] = useState("");
  const [parentCommunicationNotes, setParentCommunicationNotes] = useState("");
  const [status, setStatus] = useState<"DALAM_PENANGANAN" | "MENUNGGU_TINDAK_LANJUT" | "SELESAI">("SELESAI");
  const [submitting, setSubmitting] = useState(false);

  const fetchViolations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/violations");
      const data = await res.json();
      if (data.success) setViolations(data.violations);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchViolations();
  }, []);

  const handleFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedViolation || !actionTaken.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/violations/${selectedViolation.id}/followup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionTaken,
          studentResponse,
          parentCommunicationNotes,
          status,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setSelectedViolation(null);
        setActionTaken("");
        setStudentResponse("");
        setParentCommunicationNotes("");
        fetchViolations();
      } else {
        alert(data.message || "Gagal menyimpan.");
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
            Catatan Pembinaan Siswa Kelas
          </h1>
          <p className="text-xs text-slate-500">
            Tindak lanjut edukatif dan komunikasi dengan orang tua untuk siswa kelas binaan
          </p>
        </div>

        <button
          onClick={fetchViolations}
          className="text-xs text-blue-700 font-semibold hover:underline flex items-center gap-1"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#0F2744] text-white text-[11px] uppercase font-bold">
              <tr>
                <th className="py-3 px-4">Tanggal Kejadian</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">Kategori Pelanggaran</th>
                <th className="py-3 px-4">Deskripsi</th>
                <th className="py-3 px-4">Tindakan Awal Piket</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Tindak Lanjut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Memuat catatan...
                  </td>
                </tr>
              ) : violations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Tidak ada catatan kejadian untuk siswa kelas binaan Anda.
                  </td>
                </tr>
              ) : (
                violations.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {v.date} ({v.time} WIB)
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{v.studentName}</td>
                    <td className="py-3 px-4 text-slate-700 font-semibold">{v.categoryName}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs">{v.description}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs">{v.initialAction}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="bg-amber-100 text-amber-800 border border-amber-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
                        {v.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedViolation(v)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2.5 py-1 rounded font-semibold"
                      >
                        Bina / Tindak Lanjut
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tindak Lanjut Pembinaan */}
      {selectedViolation && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-slate-800 text-base mb-1">
              Catatan Tindak Lanjut Pembinaan Siswa
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Siswa: <strong>{selectedViolation.studentName}</strong> ({selectedViolation.categoryName})
            </p>

            <form onSubmit={handleFollowup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tindakan Pembinaan Edukatif Wali Kelas <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  placeholder="Contoh: Konseling personal mengenai kedisiplinan dan pemberian tugas positif..."
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-600"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Respon / Refleksi Siswa
                </label>
                <textarea
                  rows={2}
                  value={studentResponse}
                  onChange={(e) => setStudentResponse(e.target.value)}
                  placeholder="Siswa menyadari kesalahannya dan berjanji..."
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-600"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Komunikasi dengan Orang Tua
                </label>
                <textarea
                  rows={2}
                  value={parentCommunicationNotes}
                  onChange={(e) => setParentCommunicationNotes(e.target.value)}
                  placeholder="Menghubungi wali murid via telepon / chat perihal kesepakatan bimbingan..."
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-600"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status Penanganan Kasus
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-600"
                >
                  <option value="SELESAI">Selesai (Tuntas Dibina)</option>
                  <option value="DALAM_PENANGANAN">Dalam Penanganan</option>
                  <option value="MENUNGGU_TINDAK_LANJUT">Menunggu Tindak Lanjut</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedViolation(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan Catatan Pembinaan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
