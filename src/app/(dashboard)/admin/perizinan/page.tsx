"use client";

import React, { useEffect, useState } from "react";
import { FileCheck2, CheckCircle, XCircle, AlertCircle, FileText, ExternalLink, RefreshCw } from "lucide-react";

export default function AdminPermissionsPage() {
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingItem, setReviewingItem] = useState<any | null>(null);
  const [reviewStatus, setReviewStatus] = useState<"DISETUJUI" | "DITOLAK">("DISETUJUI");
  const [reviewNotes, setReviewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/permissions");
      const data = await res.json();
      if (data.success) {
        setPermissions(data.permissions);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingItem) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/permissions/${reviewingItem.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: reviewStatus,
          reviewNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setReviewingItem(null);
        setReviewNotes("");
        fetchPermissions();
      } else {
        alert(data.message || "Gagal memproses peninjauan.");
      }
    } catch (e) {
      alert("Terjadi kesalahan sistem.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-black text-slate-800">
            Kelola Pengajuan Izin & Sakit Siswa
          </h1>
          <p className="text-xs text-slate-500">
            Peninjauan pengajuan izin resmi dari wali murid dengan pembaruan otomatis absensi
          </p>
        </div>

        <button
          onClick={fetchPermissions}
          className="text-xs text-blue-700 font-semibold hover:underline flex items-center gap-1"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Muat Ulang
        </button>
      </div>

      {/* Permissions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#0F2744] text-white text-[11px] uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Tanggal Pengajuan</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Wali Murid</th>
                <th className="py-3 px-4">Jenis</th>
                <th className="py-3 px-4">Rentang Tanggal</th>
                <th className="py-3 px-4">Alasan</th>
                <th className="py-3 px-4">Lampiran</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Memuat data perizinan...
                  </td>
                </tr>
              ) : permissions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Belum ada pengajuan perizinan siswa.
                  </td>
                </tr>
              ) : (
                permissions.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(p.createdAt).toLocaleDateString("id-ID")}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{p.studentName}</td>
                    <td className="py-3 px-4 text-slate-600">{p.className || "-"}</td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{p.guardianName}</div>
                      <div className="text-[10px] text-slate-400">{p.guardianPhone}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                          p.type === "SAKIT" ? "bg-purple-100 text-purple-800" : "bg-sky-100 text-sky-800"
                        }`}
                      >
                        {p.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      {p.startDate} s/d {p.endDate}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={p.reason}>
                      {p.reason}
                    </td>
                    <td className="py-3 px-4">
                      {p.attachmentUrl ? (
                        <a
                          href={p.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold"
                        >
                          <FileText size={14} /> Berkas
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
                    <td className="py-3 px-4 text-center">
                      {p.status === "MENUNGGU" ? (
                        <button
                          onClick={() => {
                            setReviewingItem(p);
                            setReviewStatus("DISETUJUI");
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2.5 py-1 rounded font-semibold shadow-sm transition"
                        >
                          Tinjau
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs">Selesai</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {reviewingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-slate-800 text-base mb-1">
              Tinjau Pengajuan {reviewingItem.type}
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Siswa: <strong>{reviewingItem.studentName}</strong> ({reviewingItem.className})
            </p>
            <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 mb-4 border border-slate-200">
              <p>
                <strong>Periode:</strong> {reviewingItem.startDate} s/d {reviewingItem.endDate}
              </p>
              <p>
                <strong>Alasan:</strong> {reviewingItem.reason}
              </p>
              {reviewingItem.attachmentUrl && (
                <p>
                  <strong>Lampiran:</strong>{" "}
                  <a
                    href={reviewingItem.attachmentUrl}
                    target="_blank"
                    className="text-blue-600 underline font-semibold"
                  >
                    Buka Berkas Bukti
                  </a>
                </p>
              )}
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keputusan Peninjauan
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewStatus("DISETUJUI")}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      reviewStatus === "DISETUJUI"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <CheckCircle size={15} /> Setujui Izin
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewStatus("DITOLAK")}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      reviewStatus === "DITOLAK"
                        ? "bg-rose-600 text-white border-rose-600 shadow"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <XCircle size={15} /> Tolak Pengajuan
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Tindak Lanjut / Alasan Penolakan
                </label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Catatan resmi untuk orang tua..."
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-600"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewingItem(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow disabled:opacity-50"
                >
                  {submitting ? "Memproses..." : "Konfirmasi Keputusan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
