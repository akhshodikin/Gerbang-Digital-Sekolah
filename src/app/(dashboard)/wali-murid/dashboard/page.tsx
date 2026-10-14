"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { User, CheckCircle2, Clock, FileCheck2, AlertCircle, MessageSquare, Bell, Calendar } from "lucide-react";

export default function WaliMuridDashboardPage() {
  const [childrenData, setChildrenData] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/attendance/recap");
        const data = await res.json();
        if (data.success) {
          setChildrenData(data.records || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const todayStr = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Banner Orang Tua */}
      <div className="bg-gradient-to-r from-[#0F2744] via-[#1E3A8A] to-[#0F2744] rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="inline-block text-[11px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-200 border border-amber-400/30 px-2.5 py-0.5 rounded-full mb-2">
            Portal Resmi Wali Murid Terverifikasi
          </span>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Pemantauan Kehadiran Ananda Tercinta
          </h1>
          <p className="text-xs sm:text-sm text-blue-200 mt-1 flex items-center gap-1.5">
            <Calendar size={14} /> {todayStr}
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/wali-murid/perizinan"
            className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs px-4 py-2.5 rounded-xl shadow transition flex items-center gap-1.5"
          >
            <FileCheck2 size={16} /> Ajukan Izin / Sakit
          </Link>
          <Link
            href="/chat"
            className="bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-4 py-2.5 rounded-xl border border-white/20 transition flex items-center gap-1.5"
          >
            <MessageSquare size={16} /> Hubungi Wali Kelas
          </Link>
        </div>
      </div>

      {/* Children Realtime Attendance Cards */}
      <div className="space-y-4">
        <h2 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
          <User size={18} className="text-blue-600" /> Status Kehadiran Hari Ini
        </h2>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
            Memuat status anak...
          </div>
        ) : childrenData.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
            <AlertCircle size={32} className="mx-auto text-amber-500 mb-2" />
            <p className="font-bold text-slate-700">Belum Ada Anak Terverifikasi</p>
            <p className="mt-1">
              Akun Anda belum dihubungkan dengan data siswa oleh pihak sekolah. Silakan hubungi admin sekolah membawa Kartu Keluarga.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {childrenData.map((c) => (
              <div
                key={c.studentId}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">{c.fullName}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      NIS: <strong>{c.nis}</strong> | {c.className}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                      c.status === "HADIR"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : c.status === "TERLAMBAT"
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : c.status === "IZIN"
                        ? "bg-sky-100 text-sky-800 border border-sky-300"
                        : c.status === "SAKIT"
                        ? "bg-purple-100 text-purple-800 border border-purple-300"
                        : c.status === "ALPA"
                        ? "bg-rose-100 text-rose-800 border border-rose-300"
                        : "bg-slate-100 text-slate-700 border border-slate-300"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Waktu Masuk Tercatat:</span>
                    <strong className="text-slate-800">
                      {c.recordedAt
                        ? new Date(c.recordedAt).toLocaleTimeString("id-ID") + " WIB"
                        : "Belum tercatat (Sebelum batas cutoff)"}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Metode Verifikasi:</span>
                    <span className="text-slate-700">{c.scanMethod || "-"}</span>
                  </div>
                  {c.notes && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Keterangan:</span>
                      <span className="text-slate-700 italic">{c.notes}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                  <Link
                    href="/wali-murid/absensi"
                    className="font-bold text-blue-700 hover:underline"
                  >
                    Lihat Riwayat Lengkap →
                  </Link>
                  <Link
                    href="/wali-murid/perizinan"
                    className="font-bold text-amber-700 hover:underline"
                  >
                    Kirim Surat Izin
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pengumuman Sekolah */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <Bell size={16} className="text-blue-600" /> Pengumuman Resmi SDN Kandangan I Tosari
        </h3>
        <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200/60 text-xs space-y-1 text-slate-700">
          <p className="font-bold text-blue-900">
            Jadwal Penilaian Tengah Semester (PTS) Ganjil Tahun Ajaran 2026/2027
          </p>
          <p>
            Kepada seluruh Bapak/Ibu wali murid, dimohon memastikan kehadiran ananda tepat waktu di gerbang sekolah sebelum pukul 06.45 WIB dengan membawa kartu QR Code masing-masing.
          </p>
        </div>
      </div>
    </div>
  );
}
