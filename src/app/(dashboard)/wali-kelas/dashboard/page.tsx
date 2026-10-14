"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Users, UserCheck, Clock, FileCheck2, AlertTriangle, FileText, Calendar, CheckCircle2 } from "lucide-react";

export default function WaliKelasDashboardPage() {
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [recapRes, permRes] = await Promise.all([
          fetch("/api/attendance/recap"),
          fetch("/api/permissions?status=MENUNGGU"),
        ]);
        const recapData = await recapRes.json();
        const permData = await permRes.json();

        if (recapData.success) setStats(recapData.stats);
        if (permData.success) setPendingPermissions(permData.permissions);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Banner Wali Kelas */}
      <div className="bg-gradient-to-r from-[#0F2744] via-[#1E3A8A] to-[#0F2744] rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="inline-block text-[11px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-200 border border-sky-400/30 px-2.5 py-0.5 rounded-full mb-2">
            Portal Wali Kelas Binaan
          </span>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Monitoring Kehadiran Siswa Kelas
          </h1>
          <p className="text-xs sm:text-sm text-blue-200 mt-1">
            Data khusus siswa binaan Anda di SDN Kandangan I Tosari
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/wali-kelas/absensi"
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow transition"
          >
            Lihat Kehadiran Kelas
          </Link>
          <Link
            href="/wali-kelas/laporan"
            className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-4 py-2.5 rounded-xl border border-white/20 transition"
          >
            Cetak Rekap Kelas
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Total Siswa Kelas</span>
          <div className="text-2xl font-black text-slate-800 mt-2">{stats.total}</div>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 shadow-sm">
          <span className="text-xs font-medium text-emerald-800">Hadir</span>
          <div className="text-2xl font-black text-emerald-700 mt-2">{stats.hadir}</div>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 shadow-sm">
          <span className="text-xs font-medium text-amber-800">Terlambat</span>
          <div className="text-2xl font-black text-amber-700 mt-2">{stats.terlambat}</div>
        </div>
        <div className="bg-sky-50 rounded-xl p-4 border border-sky-200 shadow-sm">
          <span className="text-xs font-medium text-sky-800">Izin & Sakit</span>
          <div className="text-2xl font-black text-sky-700 mt-2">{stats.izin + stats.sakit}</div>
        </div>
        <div className="bg-rose-50 rounded-xl p-4 border border-rose-200 shadow-sm">
          <span className="text-xs font-medium text-rose-800">Alpa</span>
          <div className="text-2xl font-black text-rose-700 mt-2">{stats.alpa}</div>
        </div>
        <div className="bg-blue-900 rounded-xl p-4 text-white shadow-sm">
          <span className="text-xs font-medium text-blue-200">Kehadiran</span>
          <div className="text-2xl font-black text-white mt-2">{stats.persentaseKehadiran}%</div>
        </div>
      </div>

      {/* Pending Reviews in Class */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800 text-sm sm:text-base">
              Pengajuan Izin Siswa Kelas Menunggu Persetujuan
            </h2>
            <p className="text-xs text-slate-500">{pendingPermissions.length} pengajuan belum ditinjau</p>
          </div>
          <Link href="/wali-kelas/perizinan" className="text-xs font-bold text-blue-700 hover:underline">
            Tinjau Semua Izin →
          </Link>
        </div>

        {pendingPermissions.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-2" />
            Semua pengajuan izin siswa kelas telah ditinjau.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingPermissions.map((p) => (
              <div key={p.id} className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">{p.studentName}</span>
                  <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold uppercase text-[10px]">
                    {p.type}
                  </span>
                </div>
                <p className="text-slate-600 line-clamp-2">{p.reason}</p>
                <div className="pt-2 border-t border-amber-200/60 flex justify-between items-center text-[10px] text-slate-500">
                  <span>Wali: {p.guardianName} ({p.guardianPhone})</span>
                  <Link href="/wali-kelas/perizinan" className="font-bold text-blue-700 hover:underline">
                    Tinjau Sekarang
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
