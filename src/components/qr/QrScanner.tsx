"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Camera,
  Search,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  Volume2,
  VolumeX,
  Play,
  Dices,
  Sparkles,
  Maximize2,
  Minimize2,
  GraduationCap,
  Clock,
  UserCheck,
} from "lucide-react";
import { speakAttendanceGreeting, testFemaleVoice } from "@/lib/audio/voice-announcer";
import AttendanceSuccessModal, { AttendanceSuccessData } from "./AttendanceSuccessModal";

interface QrScannerProps {
  onScanSuccess?: (result: any) => void;
  title?: string;
  isFullscreenMode?: boolean;
  onToggleFullscreen?: () => void;
}

export default function QrScanner({
  onScanSuccess,
  title = "Pemindai QR Code Absensi",
  isFullscreenMode = false,
  onToggleFullscreen,
}: QrScannerProps) {
  const [activeTab, setActiveTab] = useState<"camera" | "manual" | "simulation">("camera");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Manual search state
  const [manualQuery, setManualQuery] = useState("");
  const [manualStudents, setManualStudents] = useState<any[]>([]);

  // Simulation state
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [selectedSimStudentId, setSelectedSimStudentId] = useState<string>("");
  const [simStatus, setSimStatus] = useState<"HADIR" | "TERLAMBAT">("HADIR");
  const [simPersistDb, setSimPersistDb] = useState(true);
  const [simLoading, setSimLoading] = useState(false);

  // Pop-up Modal State
  const [modalData, setModalData] = useState<AttendanceSuccessData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const scannerRef = useRef<any>(null);
  const lastScannedTokenRef = useRef<string>("");
  const lastScanTimestampRef = useRef<number>(0);

  // Load all students for the simulation dropdown on mount
  useEffect(() => {
    const loadStudents = async () => {
      try {
        const res = await fetch("/api/master/students");
        const data = await res.json();
        if (data.success && Array.isArray(data.students)) {
          setAllStudents(data.students);
          if (data.students.length > 0) {
            setSelectedSimStudentId(data.students[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load students for simulation:", err);
      }
    };
    loadStudents();
  }, []);

  // Play audio beep fallback on scan
  const playBeep = (type: "success" | "warning" | "error") => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "success") {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === "warning") {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else {
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {}
  };

  // Helper untuk memicu pop-up dan suara selamat datang
  const triggerSuccessExperience = (data: {
    name: string;
    nickname?: string | null;
    className?: string | null;
    identifier?: string | null;
    status: string;
    recordedAt?: string | null;
    isTeacher?: boolean;
    photoUrl?: string | null;
  }) => {
    const successData: AttendanceSuccessData = {
      name: data.name,
      nickname: data.nickname,
      className: data.className,
      identifier: data.identifier,
      status: data.status,
      recordedAt: data.recordedAt || new Date().toISOString(),
      isTeacher: data.isTeacher || false,
      photoUrl: data.photoUrl,
    };

    setModalData(successData);
    setIsModalOpen(true);

    if (soundEnabled) {
      speakAttendanceGreeting({
        name: successData.name,
        nickname: successData.nickname,
        className: successData.className,
        status: successData.status,
        isTeacher: successData.isTeacher,
      });
    }
  };

  // 1. Pemindaian QR Kamera
  const handleTokenScanned = async (tokenString: string) => {
    const now = Date.now();
    if (lastScannedTokenRef.current === tokenString && now - lastScanTimestampRef.current < 3500) {
      return;
    }

    lastScannedTokenRef.current = tokenString;
    lastScanTimestampRef.current = now;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/attendance/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenString }),
      });

      const data = await res.json();
      setScanResult(data);

      if (data.success) {
        playBeep("success");
        triggerSuccessExperience({
          name: data.name,
          nickname: data.nickname,
          className: data.className,
          identifier: data.identifier,
          status: data.status,
          recordedAt: data.recordedAt,
          isTeacher: data.entityType === "TEACHER",
        });
      } else if (data.isAlreadyScanned) {
        playBeep("warning");
      } else {
        playBeep("error");
      }

      if (onScanSuccess) {
        onScanSuccess(data);
      }
    } catch (err: any) {
      setErrorMessage("Koneksi ke server gagal saat memproses pemindaian.");
      playBeep("error");
    } finally {
      setIsLoading(false);
    }
  };

  // Start html5-qrcode camera
  const startCamera = async () => {
    try {
      setErrorMessage(null);
      const { Html5Qrcode } = await import("html5-qrcode");

      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch (e) {}
      }

      const scanner = new Html5Qrcode("reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText: string) => {
          handleTokenScanned(decodedText);
        },
        () => {}
      );
      setIsScanning(true);
    } catch (err: any) {
      console.warn("Camera start failed:", err);
      setErrorMessage(
        "Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan atau gunakan tab Pencarian Manual / Simulasi di atas."
      );
      setIsScanning(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (e) {}
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (activeTab === "camera") {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop();
        } catch (e) {}
      }
    };
  }, [activeTab]);

  // 2. Pencarian Manual Alternatif
  const searchManual = async () => {
    if (!manualQuery.trim()) return;
    try {
      const res = await fetch(`/api/master/students?search=${encodeURIComponent(manualQuery)}`);
      const data = await res.json();
      if (data.success) {
        setManualStudents(data.students);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markManualAttendance = async (student: any, status: string = "HADIR") => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/attendance/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          date: new Date().toISOString().split("T")[0],
          status,
          reason: "Pencatatan manual petugas piket",
        }),
      });

      const data = await res.json();
      setScanResult({
        success: data.success,
        message: data.message,
        status,
        name: student.fullName,
        className: student.className,
        identifier: student.nis,
      });

      if (data.success) {
        playBeep("success");
        triggerSuccessExperience({
          name: student.fullName,
          nickname: student.nickname,
          className: student.className,
          identifier: student.nis,
          status,
          photoUrl: student.photoUrl,
        });
      } else {
        playBeep("error");
      }

      if (onScanSuccess) onScanSuccess(data);
    } catch (e) {
      setErrorMessage("Gagal mencatat kehadiran manual.");
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Simulasi Kehadiran
  const handleRandomStudent = () => {
    if (allStudents.length === 0) return;
    const randomIndex = Math.floor(Math.random() * allStudents.length);
    setSelectedSimStudentId(allStudents[randomIndex].id);
  };

  const executeSimulation = async () => {
    const student = allStudents.find((s) => s.id === selectedSimStudentId);
    if (!student) {
      alert("Pilih siswa untuk simulasi terlebih dahulu.");
      return;
    }

    setSimLoading(true);
    setErrorMessage(null);

    try {
      if (simPersistDb) {
        // Simpan langsung ke database absensi
        const res = await fetch("/api/attendance/manual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: student.id,
            date: new Date().toISOString().split("T")[0],
            status: simStatus,
            reason: `Simulasi kehadiran gerbang piket (${simStatus})`,
          }),
        });
        const data = await res.json();
        setScanResult({
          success: data.success,
          message: data.message,
          status: simStatus,
          name: student.fullName,
          className: student.className,
          identifier: student.nis,
        });

        if (onScanSuccess) onScanSuccess(data);
      } else {
        // Mode Demo Visual Saja
        setScanResult({
          success: true,
          message: `[Simulasi Demo] Siswa ${student.fullName} tercatat ${simStatus} berhasil disimulasikan.`,
          status: simStatus,
          name: student.fullName,
          className: student.className,
          identifier: student.nis,
        });
      }

      // Tampilkan Pop-up Kehadiran & Suara Perempuan
      triggerSuccessExperience({
        name: student.fullName,
        nickname: student.nickname,
        className: student.className,
        identifier: student.nis,
        status: simStatus,
        photoUrl: student.photoUrl,
      });
    } catch (err) {
      console.error("Simulation error:", err);
      setErrorMessage("Terjadi kesalahan saat mengeksekusi simulasi kehadiran.");
    } finally {
      setSimLoading(false);
    }
  };

  const selectedStudentObj = allStudents.find((s) => s.id === selectedSimStudentId);

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-[#0F2744] via-[#1E3A8A] to-[#0A192F] text-white px-4 py-3.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-200">
              <Camera size={18} />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base leading-tight">{title}</h2>
              <p className="text-[10px] text-blue-200">SDN Kandangan I Tosari</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tombol Uji Suara */}
            <button
              onClick={() => testFemaleVoice("Ahmad Dani", "Kelas 4")}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-blue-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
              title="Dengarkan contoh suara perempuan mengucapkan selamat datang"
            >
              <Sparkles size={13} className="text-amber-300" />
              <span className="hidden sm:inline">Uji Suara</span>
            </button>

            {/* Suara On/Off */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition ${
                soundEnabled
                  ? "bg-blue-600/40 text-blue-100 hover:bg-blue-600/60"
                  : "bg-red-500/30 text-red-200 hover:bg-red-500/50"
              }`}
              title={soundEnabled ? "Suara Aktif (Klik untuk membisukan)" : "Suara Bisu (Klik untuk mengaktifkan)"}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span className="hidden md:inline">{soundEnabled ? "Suara ON" : "Bisu"}</span>
            </button>

            {/* Tombol Fullscreen / Window Toggle */}
            {onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                className={`p-1.5 rounded-lg text-xs flex items-center gap-1 font-semibold transition ${
                  isFullscreenMode
                    ? "bg-amber-500/30 hover:bg-amber-500/50 text-amber-200"
                    : "bg-white/10 hover:bg-white/20 text-white"
                }`}
                title={isFullscreenMode ? "Kembali ke Tampilan Window" : "Buka Tampilan Full Layar Kiosk"}
              >
                {isFullscreenMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                <span className="hidden lg:inline">
                  {isFullscreenMode ? "Mode Window" : "Full Layar"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Mode Tabs: Kamera, Manual, Simulasi */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs sm:text-sm font-semibold">
          <button
            onClick={() => setActiveTab("camera")}
            className={`flex-1 py-3 flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === "camera"
                ? "bg-white text-blue-700 border-blue-600 font-bold"
                : "text-slate-600 border-transparent hover:text-slate-900"
            }`}
          >
            <Camera size={16} />
            <span>Kamera QR</span>
          </button>

          <button
            onClick={() => setActiveTab("manual")}
            className={`flex-1 py-3 flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === "manual"
                ? "bg-white text-blue-700 border-blue-600 font-bold"
                : "text-slate-600 border-transparent hover:text-slate-900"
            }`}
          >
            <Search size={16} />
            <span>Cari Manual</span>
          </button>

          <button
            onClick={() => setActiveTab("simulation")}
            className={`flex-1 py-3 flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === "simulation"
                ? "bg-white text-emerald-700 border-emerald-600 font-bold shadow-sm"
                : "text-slate-600 border-transparent hover:text-emerald-700"
            }`}
          >
            <Sparkles size={16} className="text-emerald-600" />
            <span>Simulasi Presensi</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="p-4 sm:p-5">
          {/* TAB 1: KAMERA PEMINDAI */}
          {activeTab === "camera" && (
            <div>
              <div className="relative mx-auto max-w-sm rounded-2xl overflow-hidden bg-black aspect-square flex items-center justify-center border-2 border-blue-600/40 shadow-inner">
                <div id="reader" className="w-full h-full"></div>

                {/* Target Guide Overlay */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div className="w-56 h-56 border-2 border-dashed border-sky-400 rounded-2xl opacity-80 shadow-lg"></div>
                  <p className="text-[11px] font-medium text-white/90 bg-black/70 px-3 py-1 rounded-full mt-3 shadow backdrop-blur-sm">
                    Arahkan QR Code Kartu ke dalam kotak
                  </p>
                </div>

                {isLoading && (
                  <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center text-white gap-2 z-10">
                    <RefreshCw className="animate-spin text-blue-400" size={36} />
                    <span className="text-xs font-semibold">Memverifikasi waktu server...</span>
                  </div>
                )}
              </div>

              {errorMessage && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start gap-2">
                  <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Informasi Kamera</p>
                    <p>{errorMessage}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PENCARIAN MANUAL */}
          {activeTab === "manual" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ketik NIS atau nama siswa..."
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchManual()}
                  className="flex-1 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={searchManual}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                >
                  <Search size={16} /> Cari
                </button>
              </div>

              {manualStudents.length > 0 && (
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {manualStudents.map((s) => (
                    <div
                      key={s.id}
                      className="p-3.5 flex items-center justify-between hover:bg-slate-50 text-xs sm:text-sm transition"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{s.fullName}</p>
                        <p className="text-slate-500 text-xs">
                          NIS: {s.nis} | Kelas: {s.className || "-"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => markManualAttendance(s, "HADIR")}
                          disabled={isLoading}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50"
                        >
                          Hadir
                        </button>
                        <button
                          onClick={() => markManualAttendance(s, "TERLAMBAT")}
                          disabled={isLoading}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50"
                        >
                          Terlambat
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SIMULASI KEHADIRAN DENGAN POP UP & SUARA PEREMPUAN */}
          {activeTab === "simulation" && (
            <div className="space-y-5 bg-slate-50/60 p-4 rounded-2xl border border-slate-200">
              <div className="border-b border-slate-200 pb-3 flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles size={16} className="text-emerald-600" />
                    Panel Simulasi Presensi Otomatis
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Uji pemindaian kartu, pop-up kehadiran, dan ucapan suara perempuan selamat datang
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRandomStudent}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition active:scale-95 shrink-0"
                  title="Pilih satu siswa acak dari data sekolah"
                >
                  <Dices size={14} className="text-emerald-600" /> Acak Siswa
                </button>
              </div>

              {/* Pilihan Siswa */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pilih Siswa SDN Kandangan I:
                </label>
                <select
                  value={selectedSimStudentId}
                  onChange={(e) => setSelectedSimStudentId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {allStudents.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.fullName} — Kelas: {st.className || "-"} (NIS: {st.nis})
                    </option>
                  ))}
                </select>
              </div>

              {/* Pratinjau Siswa Terpilih */}
              {selectedStudentObj && (
                <div className="bg-white p-3.5 rounded-xl border border-emerald-200/80 shadow-sm flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7F1D1D] to-[#450A0A] text-white flex items-center justify-center font-black text-lg shrink-0 shadow">
                    {(selectedStudentObj.fullName || "S").trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900 truncate">
                        {selectedStudentObj.fullName}
                      </h4>
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full">
                        {selectedStudentObj.className || "-"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      NIS: <span className="font-mono">{selectedStudentObj.nis}</span> | Orang Tua: {selectedStudentObj.parentName || "-"}
                    </p>
                  </div>
                </div>
              )}

              {/* Pengaturan Status & Penyimpanan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Status Kehadiran:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSimStatus("HADIR")}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        simStatus === "HADIR"
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <UserCheck size={14} /> Hadir Tepat Waktu
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimStatus("TERLAMBAT")}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        simStatus === "TERLAMBAT"
                          ? "bg-amber-500 text-white shadow-sm"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Clock size={14} /> Terlambat
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Opsi Database:
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition">
                    <input
                      type="checkbox"
                      checked={simPersistDb}
                      onChange={(e) => setSimPersistDb(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span>Simpan langsung ke rekap absensi hari ini</span>
                  </label>
                </div>
              </div>

              {/* Tombol Eksekusi Simulasi */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={executeSimulation}
                  disabled={simLoading || !selectedSimStudentId}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl font-bold text-sm shadow-md transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {simLoading ? (
                    <RefreshCw className="animate-spin" size={18} />
                  ) : (
                    <Play size={18} className="fill-white" />
                  )}
                  {simLoading ? "Memproses Presensi..." : "Jalankan Simulasi Presensi (Pop-Up & Suara)"}
                </button>
              </div>
            </div>
          )}

          {/* Feedback Result Card Bawah */}
          {scanResult && (
            <div
              className={`mt-4 p-4 rounded-2xl border transition-all ${
                scanResult.success
                  ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                  : scanResult.isAlreadyScanned
                  ? "bg-amber-50 border-amber-300 text-amber-900"
                  : "bg-red-50 border-red-300 text-red-900"
              }`}
            >
              <div className="flex items-start gap-3">
                {scanResult.success ? (
                  <CheckCircle2 size={24} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : scanResult.isAlreadyScanned ? (
                  <AlertCircle size={24} className="text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle size={24} className="text-red-600 shrink-0 mt-0.5" />
                )}

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm sm:text-base">
                      {scanResult.success
                        ? "Pencatatan Presensi Berhasil!"
                        : scanResult.isAlreadyScanned
                        ? "Sudah Pernah Dicatat!"
                        : "Pemindaian Gagal"}
                    </h3>
                    {scanResult.status && (
                      <span
                        className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                          scanResult.status === "HADIR"
                            ? "bg-emerald-200 text-emerald-900"
                            : scanResult.status === "TERLAMBAT"
                            ? "bg-amber-200 text-amber-900"
                            : "bg-blue-200 text-blue-900"
                        }`}
                      >
                        {scanResult.status}
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm mt-1">{scanResult.message}</p>

                  {scanResult.name && (
                    <div className="mt-2 pt-2 border-t border-black/10 text-xs flex justify-between">
                      <span>
                        <strong>Nama:</strong> {scanResult.name}
                      </span>
                      <span>
                        <strong>NIS/NIP:</strong> {scanResult.identifier || "-"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* POP-UP MODAL KEHADIRAN DENGAN SUARA PEREMPUAN */}
      <AttendanceSuccessModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        data={modalData}
        onReplayVoice={() => {
          if (modalData) {
            speakAttendanceGreeting({
              name: modalData.name,
              nickname: modalData.nickname,
              className: modalData.className,
              status: modalData.status,
              isTeacher: modalData.isTeacher,
            });
          }
        }}
      />
    </>
  );
}
