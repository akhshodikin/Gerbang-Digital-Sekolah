"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { QrCode, Clock, AlertTriangle, UserCheck, FileText, CheckCircle2, RefreshCw } from "lucide-react";

export default function PiketDashboardPage() {
  const [stats, setStats] = useState<any>({
    total: 0,
    hadir: 0,
    terlambat: 0,
    izin: 0,
    sakit: 0,
    alpa: 0,
    belumHadir: 0,
    persentaseKehadiran: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/attendance/recap");
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const todayStr = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Banner Guru Piket */}
      <div className="bg-gradient-to-r from-[#0F2744] via-[#1E3A8A] to-[#0F2744] rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="inline-block text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-2.5 py-0.5 rounded-full mb-2">
            Posko Guru Piket Gerbang Sekolah
          </span>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Dashboard Petugas Piket Presensi
          </h1>
          <p className="text-xs sm:text-sm text-blue-200 mt-1">
            {todayStr} • Gerbang SDN Kandangan I Tosari
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/piket/absensi"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow transition flex items-center gap-2"
          >
            <QrCode size={18} /> Pindai QR Sekarang
          </Link>
          <Link
            href="/piket/keterlambatan"
            className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs px-4 py-2.5 rounded-xl shadow transition flex items-center gap-1.5"
          >
            <Clock size={16} /> Daftar Terlambat
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Total Siswa Sekolah</span>
          <div className="text-3xl font-black text-slate-800 mt-2">{stats.total}</div>
        </div>

        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 shadow-sm">
          <span className="text-xs font-medium text-emerald-800">Tercatat Hadir</span>
          <div className="text-3xl font-black text-emerald-700 mt-2">{stats.hadir}</div>
          <span className="text-[10px] text-emerald-600">Sebelum pukul 07.00 WIB</span>
        </div>

        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 shadow-sm">
          <span className="text-xs font-medium text-amber-800">Siswa Terlambat</span>
          <div className="text-3xl font-black text-amber-700 mt-2">{stats.terlambat}</div>
          <span className="text-[10px] text-amber-600">Dicatat petugas piket</span>
        </div>

        <div className="bg-slate-100 rounded-xl p-4 border border-slate-300 shadow-sm">
          <span className="text-xs font-medium text-slate-700">Belum Hadir di Gerbang</span>
          <div className="text-3xl font-black text-slate-700 mt-2">{stats.belumHadir}</div>
          <span className="text-[10px] text-slate-500">Menunggu di gerbang</span>
        </div>
      </div>

      {/* Quick Action Info */}
      <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-5 text-xs text-blue-900 space-y-2">
        <h3 className="font-bold text-sm text-blue-950">Petunjuk Tugas Guru Piket:</h3>
        <ul className="list-disc list-inside space-y-1 text-slate-700">
          <li>Aktifkan kamera ponsel Android Anda di menu <strong>Pindai QR Absensi</strong> pada jam 06.30 - 07.30 WIB.</li>
          <li>Setiap pemindaian berhasil otomatis memvalidasi waktu server WIB dan mencegah pemindaian ganda.</li>
          <li>Siswa yang datang setelah pukul 07.00 WIB otomatis tercatat <strong>TERLAMBAT</strong> dan orang tua menerima pemberitahuan.</li>
          <li>Jika QR siswa tertinggal atau rusak, gunakan tab <strong>Cari Manual</strong> untuk mencatat berdasarkan NIS atau nama siswa.</li>
        </ul>
      </div>
    </div>
  );
}
