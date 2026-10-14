"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, Plus, CheckCircle2, Clock, User, FileText, RefreshCw } from "lucide-react";

export default function AdminViolationsPage() {
  const [violations, setViolations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([
    { id: "cat-01", name: "Kedisiplinan Waktu (Keterlambatan)" },
    { id: "cat-02", name: "Kerapian Seragam & Atribut" },
    { id: "cat-03", name: "Ketertiban Lingkungan & Kelas" },
    { id: "cat-04", name: "Sopan Santun & Perilaku" },
  ]);

  // Form
  const [studentId, setStudentId] = useState("");
  const [categoryId, setCategoryId] = useState("cat-01");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("07:05");
  const [location, setLocation] = useState("Pintu Gerbang Utama");
  const [description, setDescription] = useState("");
  const [initialAction, setInitialAction] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchViolations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/violations");
      const data = await res.json();
      if (data.success) {
        setViolations(data.violations);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchViolations();
    fetch("/api/master/students")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStudents(d.students);
      });
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !description || !initialAction) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/violations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          categoryId,
          date,
          time,
          location,
          description,
          initialAction,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setShowAddModal(false);
        setDescription("");
        setInitialAction("");
        fetchViolations();
      } else {
        alert(data.message || "Gagal mencatat kejadian.");
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
            Kedisiplinan & Pembinaan Siswa
          </h1>
          <p className="text-xs text-slate-500">
            Pencatatan faktual dan penanganan edukatif bermartabat SDN Kandangan I Tosari
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition"
        >
          <Plus size={16} /> Catat Kejadian Baru
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#0F2744] text-white text-[11px] uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Tanggal & Waktu</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Kategori Pelanggaran</th>
                <th className="py-3 px-4">Lokasi</th>
                <th className="py-3 px-4">Deskripsi Faktual</th>
                <th className="py-3 px-4">Tindakan Awal</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Pencatat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Memuat catatan kedisiplinan...
                  </td>
                </tr>
              ) : violations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Belum ada catatan pelanggaran.
                  </td>
                </tr>
              ) : (
                violations.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      <div>{v.date}</div>
                      <div className="text-[10px] text-slate-400">{v.time} WIB</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{v.studentName}</td>
                    <td className="py-3 px-4 text-slate-600">{v.className || "-"}</td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{v.categoryName}</td>
                    <td className="py-3 px-4 text-slate-600">{v.location}</td>
                    <td className="py-3 px-4 text-slate-700 max-w-xs">{v.description}</td>
                    <td className="py-3 px-4 text-slate-700 max-w-xs">{v.initialAction}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="bg-amber-100 text-amber-800 border border-amber-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
                        {v.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs">{v.recordedByName}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add Violation */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-slate-800 text-base mb-1">
              Catat Kejadian Pelanggaran Disiplin
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Gunakan bahasa faktual, mendidik, dan menjaga martabat anak.
            </p>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Siswa <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">-- Pilih Siswa --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.nis} - {s.className || "Tanpa Kelas"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori Kejadian
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-600"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lokasi Kejadian
                  </label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Waktu (WIB)</label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi Faktual Kejadian <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Deskripsikan fakta apa yang terjadi tanpa kalimat menghakimi atau merendahkan siswa..."
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-600"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tindakan Penanganan Awal <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={initialAction}
                  onChange={(e) => setInitialAction(e.target.value)}
                  placeholder="Contoh: Diberikan teguran lisan secara ramah dan diarahkan merapikan atribut..."
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-600"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan Catatan Kejadian"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
