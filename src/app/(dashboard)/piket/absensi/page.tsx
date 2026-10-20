"use client";

import React, { useEffect, useState, useCallback } from "react";
import QrScanner from "@/components/qr/QrScanner";
import {
  UserCheck,
  Clock,
  RefreshCw,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Monitor,
  Layout,
  GraduationCap,
  Sparkles,
  Calendar,
} from "lucide-react";

export default function PiketAbsensiPage() {
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");

  const fetchRecent = useCallback(async () => {
    try {
      const res = await fetch("/api/attendance/recap");
      const data = await res.json();
      if (data.success) {
        // Filter yang sudah ada absensinya (HADIR atau TERLAMBAT)
        const scanned = (data.records || []).filter((r: any) => r.status !== "BELUM_HADIR");
        setRecentScans(scanned);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);

  // Live Digital Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " WIB"
      );
      setCurrentDate(
        now.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen for fullscreen change events (e.g. user presses ESC key)
  useEffect(() => {
    const handleFsChange = () => {
      const fsElement = document.fullscreenElement || (document as any).webkitFullscreenElement;
      setIsFullscreen(Boolean(fsElement));
    };

    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
    };
  }, []);

  // Toggle Fullscreen / Window Mode
  const toggleFullscreen = async () => {
    try {
      if (!isFullscreen) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if ((document.documentElement as any).webkitRequestFullscreen) {
          await (document.documentElement as any).webkitRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen && document.fullscreenElement) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen && (document as any).webkitFullscreenElement) {
          await (document as any).webkitExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn("Fullscreen toggle error:", err);
      // Fallback toggle state if browser blocks request
      setIsFullscreen(!isFullscreen);
    }
  };

  const handleScanSuccess = () => {
    fetchRecent();
  };

  const hadirCount = recentScans.filter((s) => s.status === "HADIR").length;
  const terlambatCount = recentScans.filter((s) => s.status === "TERLAMBAT").length;

  // =========================================================================
  // TAMPILAN 1: MODE FULL LAYAR (KIOSK GERBANG SEKOLAH)
  // =========================================================================
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[99990] bg-gradient-to-br from-[#071324] via-[#0F2744] to-[#0A192F] text-white flex flex-col overflow-hidden select-none">
        {/* Kiosk Top Bar */}
        <header className="px-6 py-4 bg-[#0B1E36]/90 border-b border-blue-500/20 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-sky-400/50 flex items-center justify-center p-1 shadow-lg shrink-0 overflow-hidden">
              <img
                src="/images/logo-gds.png"
                alt="Logo GDS"
                className="w-full h-full object-contain filter drop-shadow"
              />
            </div>
            <div>
              {/* GDS di atas ABSENSI QR CODE SDN KANDANGAN I TOSARI */}
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black bg-sky-500/30 text-sky-200 border border-sky-400/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  GDS : GERBANG DIGITAL SEKOLAH
                </span>
                <span className="text-[11px] text-blue-200/90 hidden sm:inline">
                  — Sistem Presensi & Keamanan Gerbang Sekolah
                </span>
              </div>
              <h1 className="font-black text-base sm:text-lg tracking-wide text-white">
                ABSENSI QR CODE SDN KANDANGAN I TOSARI
              </h1>
              <p className="text-xs text-blue-300">
                Kecamatan Tosari, Kabupaten Pasuruan • Jawa Timur
              </p>
            </div>
          </div>

          {/* Jam Real-time Digital di Tengah */}
          <div className="text-center px-4 py-1.5 rounded-2xl bg-black/30 border border-blue-400/20 shadow-inner">
            <div className="text-2xl sm:text-3xl font-mono font-black text-sky-300 tracking-wider">
              {currentTime}
            </div>
            <div className="text-[11px] text-blue-200 font-medium">
              {currentDate}
            </div>
          </div>

          {/* Statistik Cepat & Tombol Keluar Fullscreen */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2.5 bg-black/20 p-1.5 rounded-xl border border-white/10 text-xs">
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg font-bold flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Hadir: {hadirCount}
              </span>
              <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg font-bold flex items-center gap-1.5">
                <Clock size={14} /> Terlambat: {terlambatCount}
              </span>
            </div>

            {/* Tombol Kembali ke Mode Window */}
            <button
              onClick={toggleFullscreen}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-white/20 transition active:scale-95 shadow-sm"
              title="Keluar dari mode layar penuh (atau tekan tombol Esc)"
            >
              <Minimize2 size={16} className="text-amber-300" />
              <span>Keluar Full Layar (Esc)</span>
            </button>
          </div>
        </header>

        {/* Kiosk Content Grid */}
        <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
          {/* Kolom Pemindai QR & Simulasi (7 Kolom) */}
          <div className="lg:col-span-7 flex flex-col justify-center overflow-y-auto max-h-full pr-1">
            <QrScanner
              onScanSuccess={handleScanSuccess}
              title="Pemindai Kamera Gerbang Sekolah"
              isFullscreenMode={true}
              onToggleFullscreen={toggleFullscreen}
            />
          </div>

          {/* Kolom Live Ticker Presensi Terkini (5 Kolom) */}
          <div className="lg:col-span-5 bg-[#0B1E36]/80 rounded-2xl border border-blue-500/20 flex flex-col overflow-hidden shadow-2xl backdrop-blur-md">
            <div className="p-4 border-b border-blue-500/20 bg-blue-950/40 flex items-center justify-between">
              <span className="font-bold text-sm text-blue-100 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-400" />
                Live Presensi Hari Ini ({recentScans.length})
              </span>
              <button
                onClick={fetchRecent}
                className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1.5 transition"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-blue-500/10 p-2 space-y-1">
              {recentScans.length === 0 ? (
                <div className="p-12 text-center text-blue-300/60 text-sm">
                  Belum ada presensi siswa yang dicatat hari ini.
                  <br />
                  <span className="text-xs text-blue-400/50 mt-1 block">
                    Gunakan tab <strong>Simulasi Presensi</strong> di samping untuk menguji.
                  </span>
                </div>
              ) : (
                recentScans.map((s) => (
                  <div
                    key={s.studentId}
                    className="p-3 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-between text-xs sm:text-sm transition"
                  >
                    <div>
                      <div className="font-bold text-white text-sm">{s.fullName}</div>
                      <div className="text-blue-300 text-xs flex items-center gap-2 mt-0.5">
                        <span className="font-mono">NIS: {s.nis}</span>
                        <span>•</span>
                        <span>{s.className || "Siswa"}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                          s.status === "HADIR"
                            ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
                            : "bg-amber-500/30 text-amber-300 border border-amber-500/40"
                        }`}
                      >
                        {s.status}
                      </span>
                      <div className="text-[11px] text-blue-300 font-mono mt-1">
                        {s.recordedAt
                          ? new Date(s.recordedAt).toLocaleTimeString("id-ID") + " WIB"
                          : "-"}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // =========================================================================
  // TAMPILAN 2: MODE WINDOW (STANDAR DASHBOARD)
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Top Header Bar with Mode Window / Fullscreen Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 p-1 flex items-center justify-center shrink-0">
            <img
              src="/images/logo-gds.png"
              alt="Logo GDS"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            {/* GDS di atas ABSENSI QR CODE SDN KANDANGAN I TOSARI */}
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-600 text-white tracking-wider">
                GDS
              </span>
              <span className="text-xs font-bold text-blue-900">
                : Gerbang Digital Sekolah
              </span>
              <span className="text-[11px] text-slate-500 hidden md:inline">
                — Sistem Presensi & Keamanan Pintu Gerbang Sekolah
              </span>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-800">
                ABSENSI QR CODE SDN KANDANGAN I TOSARI
              </h1>
              <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Live Gateway
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Arahkan kamera ke QR Code kartu, gunakan pencarian manual, atau uji dengan simulasi suara perempuan
            </p>
          </div>
        </div>

        {/* View Switcher: Mode Window vs Full Layar */}
        <div className="flex items-center gap-2">
          {/* Realtime Clock Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700">
            <Clock size={14} className="text-blue-600" />
            <span>{currentTime}</span>
          </div>

          {/* Toggle Button Group */}
          <div className="flex bg-slate-200 p-1 rounded-xl">
            <button
              onClick={() => setIsFullscreen(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-white text-blue-900 shadow-sm"
              title="Tampilan di dalam dashboard reguler"
            >
              <Layout size={14} /> Mode Window
            </button>
            <button
              onClick={toggleFullscreen}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              title="Buka tampilan layar penuh untuk monitor gerbang sekolah"
            >
              <Maximize2 size={14} className="text-blue-600" /> Mode Full Layar
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout: Scanner / Simulator & Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Kolom 1: Scanner & Simulation Component (7 Kolom) */}
        <div className="lg:col-span-7">
          <QrScanner
            onScanSuccess={handleScanSuccess}
            title="Kamera Pemindai Gerbang Sekolah"
            isFullscreenMode={false}
            onToggleFullscreen={toggleFullscreen}
          />
        </div>

        {/* Kolom 2: Live Feed Presensi Terkini (5 Kolom) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="font-bold text-xs sm:text-sm text-slate-800 flex items-center gap-2">
              <CheckCircle2 size={17} className="text-emerald-600" />
              Siswa Tercatat Hari Ini ({recentScans.length})
            </span>
            <button
              onClick={fetchRecent}
              className="text-xs text-blue-700 font-semibold hover:underline flex items-center gap-1 transition"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>

          {/* Summary Badges */}
          <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50/70 border-b border-slate-100 text-xs">
            <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex items-center justify-between">
              <span className="text-emerald-800 font-medium">Hadir Tepat Waktu</span>
              <span className="font-bold text-emerald-900 text-sm">{hadirCount}</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl flex items-center justify-between">
              <span className="text-amber-800 font-medium">Terlambat</span>
              <span className="font-bold text-amber-900 text-sm">{terlambatCount}</span>
            </div>
          </div>

          {/* List of Recent Scans */}
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {recentScans.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs space-y-1">
                <p>Belum ada pemindaian yang dicatat hari ini.</p>
                <p className="text-[11px] text-slate-400">
                  Arahkan QR Code ke kamera atau uji tab <strong>Simulasi Presensi</strong> di samping.
                </p>
              </div>
            ) : (
              recentScans.map((s) => (
                <div
                  key={s.studentId}
                  className="p-3.5 hover:bg-slate-50 flex items-center justify-between text-xs sm:text-sm transition"
                >
                  <div>
                    <div className="font-bold text-slate-900">{s.fullName}</div>
                    <div className="text-slate-500 text-xs mt-0.5">
                      NIS: <span className="font-mono">{s.nis}</span> | Kelas:{" "}
                      <span className="font-semibold text-slate-700">{s.className || "-"}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                        s.status === "HADIR"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {s.status}
                    </span>
                    <div className="text-[11px] text-slate-400 font-mono mt-1">
                      {s.recordedAt
                        ? new Date(s.recordedAt).toLocaleTimeString("id-ID") + " WIB"
                        : "-"}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
