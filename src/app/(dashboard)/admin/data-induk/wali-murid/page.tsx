"use client";

import React, { useEffect, useState } from "react";
import { Users, ShieldCheck, CheckCircle2, AlertCircle, Plus, RefreshCw, Link as LinkIcon } from "lucide-react";

export default function AdminGuardiansPage() {
  const [guardians, setGuardians] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLinkModal, setShowLinkModal] = useState(false);

  const [selectedGuardianId, setSelectedGuardianId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [verificationNotes, setVerificationNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchGuardians = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/master/guardians");
      const data = await res.json();
      if (data.success) setGuardians(data.guardians);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuardians();
    fetch("/api/master/students")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStudents(d.students);
      });
  }, []);

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuardianId || !selectedStudentId) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/master/guardians", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guardianId: selectedGuardianId,
          studentId: selectedStudentId,
          notes: verificationNotes || "Diverifikasi pihak sekolah",
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setShowLinkModal(false);
        setVerificationNotes("");
        fetchGuardians();
      } else {
        alert(data.message || "Gagal menghubungkan relasi.");
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
            Wali Murid & Verifikasi Relasi Siswa
          </h1>
          <p className="text-xs text-slate-500">
            Verifikasi resmi hubungan orang tua/wali murid dengan siswa SDN Kandangan I Tosari (Mencegah IDOR)
          </p>
        </div>

        <button
          onClick={() => setShowLinkModal(true)}
          className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition"
        >
          <LinkIcon size={16} /> Verifikasi Relasi Baru
        </button>
      </div>

      {/* Grid of Guardians and their verified children */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 py-8 text-center text-slate-400 text-xs">
            Memuat data wali murid...
          </div>
        ) : guardians.length === 0 ? (
          <div className="col-span-2 py-8 text-center text-slate-400 text-xs">
            Belum ada data wali murid terdaftar.
          </div>
        ) : (
          guardians.map((g) => (
            <div
              key={g.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{g.fullName}</h3>
                  <p className="text-xs text-slate-500">
                    Hubungan: <strong>{g.relationship}</strong> | Telp/WA: {g.phone}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Alamat: {g.address || "-"}</p>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck size={11} /> Akun Terverifikasi
                </span>
              </div>

              {/* Children List */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="text-xs font-semibold text-slate-700 block">
                  Siswa Terhubung & Diverifikasi:
                </span>
                {g.children && g.children.length > 0 ? (
                  <div className="space-y-1.5">
                    {g.children.map((child: any) => (
                      <div
                        key={child.studentId}
                        className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-200/60 text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{child.studentName}</div>
                          <div className="text-[11px] text-slate-500">
                            NIS: {child.studentNis} | Kelas: {child.className || "-"}
                          </div>
                          {child.notes && (
                            <div className="text-[10px] text-blue-700 italic mt-0.5">
                              Catatan: {child.notes}
                            </div>
                          )}
                        </div>
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg flex items-center gap-2">
                    <AlertCircle size={15} />
                    <span>Belum ada siswa yang diverifikasi ke akun ini.</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Link Guardian to Student */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-slate-800 text-base mb-1">
              Verifikasi Hubungan Wali Murid & Siswa
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Akses portal wali murid hanya dapat membuka anak yang secara sah telah diverifikasi oleh sekolah.
            </p>

            <form onSubmit={handleLinkSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Akun Wali Murid <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedGuardianId}
                  onChange={(e) => setSelectedGuardianId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">-- Pilih Wali Murid --</option>
                  {guardians.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.fullName} ({g.relationship} - {g.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Siswa SDN Kandangan I <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">-- Pilih Siswa --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} (NIS: {s.nis} - {s.className || "Tanpa Kelas"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Dokumen Verifikasi (Contoh: No. KK / Surat Kuasa)
                </label>
                <input
                  type="text"
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="Verifikasi Kartu Keluarga No. 351405012345..."
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Verifikasi & Hubungkan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
