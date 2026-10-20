"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  Clock,
  AlertTriangle,
  FileCheck2,
  QrCode,
  FileText,
  Calendar,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";

export default function AdminDashboardPage() {
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
  const [pendingPermissions, setPendingPermissions] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [recapRes, permRes, classRes] = await Promise.all([
          fetch("/api/attendance/recap"),
          fetch("/api/permissions?status=MENUNGGU"),
          fetch("/api/master/classes"),
        ]);

        const recapData = await recapRes.json();
        const permData = await permRes.json();
        const classData = await classRes.json();

        if (recapData.success) setStats(recapData.stats);
        if (permData.success) setPendingPermissions(permData.permissions);
        if (classData.success) setClasses(classData.classes);
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const todayFormatted = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#0F2744] via-[#1E3A8A] to-[#0F2744] rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-sky-400/40 p-1.5 flex items-center justify-center shrink-0 shadow-lg">
            <img
              src="/images/logo-gds.png"
              alt="Logo GDS"
              className="w-full h-full object-contain filter drop-shadow"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] sm:text-[10.5px] font-black uppercase tracking-wider bg-sky-500/30 text-sky-200 border border-sky-400/30 px-2.5 py-0.5 rounded-full">
                GDS : GERBANG DIGITAL SEKOLAH
              </span>
              <span className="text-[11px] font-semibold text-blue-200 hidden sm:inline">
                Panel Administrator Sekolah
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Dashboard Kehadiran SDN Kandangan I Tosari
            </h1>
            <p className="text-xs sm:text-sm text-blue-200 mt-1 flex items-center gap-1.5">
              <Calendar size={14} /> {todayFormatted} (Zona Waktu Asia/Jakarta WIB)
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            href="/piket/absensi"
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow transition flex items-center gap-1.5"
          >
            <QrCode size={16} /> Buka Scanner QR
          </Link>
          <Link
            href="/admin/laporan"
            className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-4 py-2.5 rounded-xl border border-white/20 transition flex items-center gap-1.5"
          >
            <FileText size={16} /> Cetak Laporan
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-500">Total Siswa</span>
          <div className="text-2xl font-black text-slate-800 mt-2">{stats.total}</div>
          <span className="text-[10px] text-slate-400 mt-1">Terdaftar aktif</span>
        </div>

        <div className="bg-emerald-50/70 rounded-xl p-4 border border-emerald-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-medium text-emerald-800">Hadir Tepat Waktu</span>
          <div className="text-2xl font-black text-emerald-700 mt-2">{stats.hadir}</div>
          <span className="text-[10px] text-emerald-600 mt-1">Sebelum jam 07.00</span>
        </div>

        <div className="bg-amber-50/70 rounded-xl p-4 border border-amber-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-medium text-amber-800">Terlambat</span>
          <div className="text-2xl font-black text-amber-700 mt-2">{stats.terlambat}</div>
          <span className="text-[10px] text-amber-600 mt-1">Dicatat piket</span>
        </div>

        <div className="bg-sky-50/70 rounded-xl p-4 border border-sky-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-medium text-sky-800">Izin & Sakit</span>
          <div className="text-2xl font-black text-sky-700 mt-2">{stats.izin + stats.sakit}</div>
          <span className="text-[10px] text-sky-600 mt-1">Izin: {stats.izin} | Sakit: {stats.sakit}</span>
        </div>

        <div className="bg-rose-50/70 rounded-xl p-4 border border-rose-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-medium text-rose-800">Alpa</span>
          <div className="text-2xl font-black text-rose-700 mt-2">{stats.alpa}</div>
          <span className="text-[10px] text-rose-600 mt-1">Tanpa keterangan</span>
        </div>

        <div className="bg-blue-900 rounded-xl p-4 text-white shadow-sm flex flex-col justify-between">
          <span className="text-xs font-medium text-blue-200">Persentase Hadir</span>
          <div className="text-2xl font-black text-white mt-2">{stats.persentaseKehadiran}%</div>
          <span className="text-[10px] text-blue-300 mt-1 flex items-center gap-1">
            <TrendingUp size={11} /> Hadir + Terlambat
          </span>
        </div>
      </div>

      {/* Two Column Layout: Class Breakdown & Pending Permissions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom 1 & 2: Statistik per Kelas */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-slate-800 text-sm sm:text-base">
                Distribusi Kelas SDN Kandangan I Tosari
              </h2>
              <p className="text-xs text-slate-500">Status rombongan belajar dan wali kelas</p>
            </div>
            <Link
              href="/admin/data-induk/siswa"
              className="text-xs font-semibold text-blue-700 hover:underline"
            >
              Kelola Siswa →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {classes.map((cls) => (
              <div
                key={cls.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-blue-300 transition"
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-slate-800 text-sm">{cls.name}</span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                    Tingkat {cls.gradeLevel}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 truncate">
                  Wali: {cls.teacherName || "Belum ditentukan"}
                </p>
                <div className="mt-3 pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                  <span className="text-slate-500">Siswa Aktif:</span>
                  <span className="font-bold text-blue-900">{cls.totalStudents || 0} Siswa</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Kolom 3: Pengajuan Izin Menunggu Verifikasi */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-slate-800 text-sm sm:text-base">
                Izin Perlu Ditinjau
              </h2>
              <p className="text-xs text-slate-500">{pendingPermissions.length} pengajuan menunggu</p>
            </div>
            <Link
              href="/admin/perizinan"
              className="text-xs font-semibold text-blue-700 hover:underline"
            >
              Lihat Semua →
            </Link>
          </div>

          {pendingPermissions.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-2" />
              Tidak ada pengajuan izin yang tertunda saat ini.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingPermissions.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-lg border border-amber-200 bg-amber-50/60 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{p.studentName}</span>
                    <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold uppercase text-[10px]">
                      {p.type}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] line-clamp-1">{p.reason}</p>
                  <div className="flex justify-between items-center pt-1 text-[10px] text-slate-500 border-t border-amber-200/60">
                    <span>{p.startDate} s/d {p.endDate}</span>
                    <Link
                      href={`/admin/perizinan`}
                      className="font-bold text-blue-700 hover:underline"
                    >
                      Tinjau
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
