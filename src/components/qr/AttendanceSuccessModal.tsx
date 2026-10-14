"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Clock, Volume2, X, Sparkles, GraduationCap } from "lucide-react";
import { extractCallName } from "@/lib/audio/voice-announcer";

export interface AttendanceSuccessData {
  name: string;
  nickname?: string | null;
  className?: string | null;
  identifier?: string | null; // NIS or NIP
  status: string; // "HADIR" | "TERLAMBAT"
  recordedAt?: string | null;
  isTeacher?: boolean;
  photoUrl?: string | null;
  notes?: string | null;
}

interface AttendanceSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AttendanceSuccessData | null;
  onReplayVoice?: () => void;
  autoCloseSeconds?: number;
}

export default function AttendanceSuccessModal({
  isOpen,
  onClose,
  data,
  onReplayVoice,
  autoCloseSeconds = 3.2, // Agak dipercepat agar cepat berganti antar siswa
}: AttendanceSuccessModalProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!isOpen || !data) {
      setProgress(100);
      return;
    }

    const intervalTime = 40;
    const totalSteps = (autoCloseSeconds * 1000) / intervalTime;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const remainingPercent = Math.max(0, 100 - (currentStep / totalSteps) * 100);
      setProgress(remainingPercent);

      if (currentStep >= totalSteps) {
        clearInterval(timer);
        onClose();
      }
    }, intervalTime);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearInterval(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, data, autoCloseSeconds, onClose]);

  if (!isOpen || !data) return null;

  const isLate = data.status === "TERLAMBAT";
  const callName = extractCallName(data.name, data.nickname);
  const timeFormatted = data.recordedAt
    ? new Date(data.recordedAt).toLocaleTimeString("id-ID") + " WIB"
    : new Date().toLocaleTimeString("id-ID") + " WIB";

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-150 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all duration-150 animate-in zoom-in-95"
        role="dialog"
        aria-modal="true"
      >
        {/* Progress Bar Atas (Timer Otomatis Dipercepat) */}
        <div className="w-full bg-slate-100 h-1.5">
          <div
            className={`h-full transition-all duration-75 ${
              isLate ? "bg-amber-500" : "bg-emerald-500"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Tombol Tutup X */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition z-10"
          title="Tutup (Esc)"
        >
          <X size={16} />
        </button>

        {/* Ilustrasi & Kartu Pop Up Nama Sederhana */}
        <div className="p-6 text-center space-y-4">
          {/* Ilustrasi Avatar Bulat dengan Cincin Denyut */}
          <div className="relative mx-auto w-20 h-20">
            <div
              className={`absolute inset-0 rounded-full animate-ping opacity-25 ${
                isLate ? "bg-amber-500" : "bg-emerald-500"
              }`}
            />
            <div
              className={`relative w-20 h-20 rounded-full flex items-center justify-center text-white font-black text-2xl shadow-lg border-4 border-white ${
                isLate
                  ? "bg-gradient-to-tr from-amber-600 to-orange-500"
                  : "bg-gradient-to-tr from-emerald-600 to-teal-500"
              }`}
            >
              {data.photoUrl ? (
                <img
                  src={data.photoUrl}
                  alt={callName}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                callName.charAt(0).toUpperCase()
              )}

              {/* Status Badge Icon Mini di Sudut */}
              <div
                className={`absolute -bottom-1 -right-1 p-1 rounded-full text-white shadow-md border-2 border-white ${
                  isLate ? "bg-amber-600" : "bg-emerald-600"
                }`}
              >
                {isLate ? <Clock size={14} /> : <CheckCircle2 size={14} />}
              </div>
            </div>
          </div>

          {/* Badge Status & Kelas */}
          <div className="flex items-center justify-center gap-2">
            <span
              className={`text-[11px] font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider ${
                isLate
                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                  : "bg-emerald-100 text-emerald-900 border border-emerald-300"
              }`}
            >
              {isLate ? "TERLAMBAT" : "HADIR"}
            </span>

            {data.className && (
              <span className="text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-200 px-3 py-0.5 rounded-full flex items-center gap-1">
                <GraduationCap size={12} /> {data.className}
              </span>
            )}
          </div>

          {/* Sorotan Nama Panggilan & Nama Lengkap */}
          <div>
            <div className="text-xs uppercase font-extrabold tracking-widest text-slate-400 mb-0.5">
              Selamat Datang,
            </div>
            {/* Nama Panggilan Utama (Besar & Jelas) */}
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none text-emerald-800">
              {callName}
            </h2>
            {/* Nama Lengkap & NIS di Bawah */}
            <p className="text-xs text-slate-500 mt-1.5 font-medium truncate">
              {data.name} {data.identifier ? `• NIS: ${data.identifier}` : ""}
            </p>
          </div>

          {/* Gelembung Suara: "Selamat datang, Nama Panggilan, Kelas" */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-center gap-2.5 shadow-sm text-xs text-slate-700">
            <Volume2 size={16} className="text-blue-600 shrink-0 animate-pulse" />
            <span className="font-semibold text-slate-800 truncate">
              &ldquo;Selamat datang, {callName}, {data.className || "Siswa"}&rdquo;
            </span>
          </div>

          {/* Footer Info Waktu */}
          <div className="pt-1 text-[11px] text-slate-400 font-mono flex items-center justify-between border-t border-slate-100">
            <span>SDN Kandangan I Tosari</span>
            <span>{timeFormatted}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
