"use client";

import React, { useEffect, useState } from "react";
import { HeartHandshake, Shield, Lock, Plus, RefreshCw, Calendar, User } from "lucide-react";

export default function AdminCounselingPage() {
  const [counselingRecords, setCounselingRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [students, setStudents] = useState<any[]>([]);

  // Form
  const [studentId, setStudentId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [sessionSummary, setSessionSummary] = useState("");
  const [sensitiveNotes, setSensitiveNotes] = useState("");
  const [agreedActionPlan, setAgreedActionPlan] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchCounseling = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/counseling");
      const data = await res.json();
      if (data.success) {
        setCounselingRecords(data.counselingRecords);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounseling();
    fetch("/api/master/students")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStudents(d.students);
      });
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !sessionSummary || !sensitiveNotes) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/counseling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          date,
          sessionSummary,
          sensitiveNotes,
          agreedActionPlan,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setShowAddModal(false);
        setSessionSummary("");
        setSensitiveNotes("");
        setAgreedActionPlan("");
        fetchCounseling();
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
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-800">
              Bimbingan & Konseling Siswa (Rahasia)
            </h1>
            <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-red-300">
              <Lock size={10} /> AKSES TERBATAS
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Arsip penanganan konseling privat. Catatan sensitif dilindungi dan tidak dibagikan kepada publik.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition"
        >
          <Plus size={16} /> Catat Sesi Konseling Baru
        </button>
      </div>

      {/* Counseling Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 py-8 text-center text-slate-400 text-xs">
            Memuat arsip konseling...
          </div>
        ) : counselingRecords.length === 0 ? (
          <div className="col-span-2 py-8 text-center text-slate-400 text-xs">
            Belum ada arsip bimbingan konseling yang tercatat.
          </div>
        ) : (
          counselingRecords.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3 relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{c.studentName}</h3>
                  <p className="text-xs text-slate-500">
                    NIS: {c.studentNis} | Kelas: {c.className || "-"}
                  </p>
                </div>
                <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                  {c.date}
                </span>
              </div>

              <div className="text-xs space-y-2 pt-2 border-t border-slate-100">
                <div>
                  <strong className="text-slate-700">Ringkasan Sesi:</strong>
                  <p className="text-slate-600 mt-0.5">{c.sessionSummary}</p>
                </div>

                <div className="bg-red-50/70 p-2.5 rounded-lg border border-red-200">
                  <strong className="text-red-900 flex items-center gap-1">
                    <Lock size={12} /> Catatan Sensitif / Rahasia:
                  </strong>
                  <p className="text-red-800 text-[11px] mt-0.5">{c.sensitiveNotes}</p>
                </div>

                {c.agreedActionPlan && (
                  <div>
                    <strong className="text-slate-700">Rencana Tindak Lanjut:</strong>
                    <p className="text-slate-600 mt-0.5">{c.agreedActionPlan}</p>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400">
                <span>Konselor: {c.counselorName}</span>
                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase">
                  {c.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Add Counseling */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-slate-800 text-base mb-1">
              Catat Sesi Bimbingan Konseling Siswa
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Semua catatan sensitif ini terlindungi secara kriptografis dan berhak akses khusus.
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Sesi</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ringkasan Konseling Umum <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={sessionSummary}
                  onChange={(e) => setSessionSummary(e.target.value)}
                  placeholder="Ringkasan umum topik yang dibahas dalam sesi konseling..."
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-600"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-red-800 mb-1">
                  Catatan Sensitif / Rahasia <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={sensitiveNotes}
                  onChange={(e) => setSensitiveNotes(e.target.value)}
                  placeholder="Catatan psikologis, latar belakang keluarga, atau privasi siswa yang hanya dapat dibaca oleh konselor..."
                  className="w-full border border-red-300 bg-red-50/30 rounded-lg p-2 text-sm focus:ring-2 focus:ring-red-600"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rencana Tindakan / Kesepakatan
                </label>
                <textarea
                  rows={2}
                  value={agreedActionPlan}
                  onChange={(e) => setAgreedActionPlan(e.target.value)}
                  placeholder="Komitmen perubahan perilaku yang disepakati bersama siswa..."
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
                  {submitting ? "Menyimpan..." : "Simpan Catatan Rahasia"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
