"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User, Clock, Shield, Bell, Menu } from "lucide-react";

interface HeaderProps {
  user?: {
    fullName: string;
    username: string;
    roles: string[];
  } | null;
  onMenuToggle?: () => void;
}

export default function Header({ user, onMenuToggle }: HeaderProps) {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "Asia/Jakarta",
        }) + " WIB"
      );
      setCurrentDate(
        now.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "Asia/Jakarta",
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    if (confirm("Apakah Anda yakin ingin keluar dari sistem?")) {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      } catch (err) {
        console.error("Logout error:", err);
      }
    }
  };

  const getRoleBadge = (roles: string[] = []) => {
    if (roles.includes("ADMIN")) {
      return <span className="bg-red-600/90 text-white text-[11px] px-2 py-0.5 rounded-full font-semibold">ADMIN</span>;
    }
    if (roles.includes("GURU_PIKET")) {
      return <span className="bg-emerald-600/90 text-white text-[11px] px-2 py-0.5 rounded-full font-semibold">GURU PIKET</span>;
    }
    if (roles.includes("WALI_KELAS")) {
      return <span className="bg-sky-600/90 text-white text-[11px] px-2 py-0.5 rounded-full font-semibold">WALI KELAS</span>;
    }
    if (roles.includes("WALI_MURID")) {
      return <span className="bg-amber-600/90 text-white text-[11px] px-2 py-0.5 rounded-full font-semibold">WALI MURID</span>;
    }
    return <span className="bg-blue-600/90 text-white text-[11px] px-2 py-0.5 rounded-full font-semibold">PENGGUNA</span>;
  };

  return (
    <header className="no-print sticky top-0 z-40 bg-gradient-to-r from-[#0F2744] via-[#1E3A8A] to-[#0F2744] text-white shadow-md border-b border-blue-900/40">
      {/* Top Banner Judul Header */}
      <div className="px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition focus:outline-none"
              aria-label="Toggle menu"
            >
              <Menu size={20} />
            </button>
          )}

          {/* Logo & School Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-sky-400/40 flex items-center justify-center p-1 shadow-inner shrink-0 overflow-hidden">
              <img
                src="/images/logo-gds.png"
                alt="Logo GDS"
                className="w-full h-full object-contain filter drop-shadow"
              />
            </div>
            <div>
              {/* GDS: Gerbang Digital Sekolah diletakkan DI ATAS "ABSENSI QR CODE SDN KANDANGAN I TOSARI" */}
              <div className="flex items-center gap-1.5 flex-wrap leading-none mb-0.5">
                <span className="text-[10.5px] font-black tracking-wider text-sky-300 bg-blue-500/30 px-1.5 py-0.5 rounded border border-sky-400/30">
                  GDS
                </span>
                <span className="text-[10px] font-bold text-blue-100">
                  : Gerbang Digital Sekolah
                </span>
                <span className="text-[9.5px] text-sky-200/80 hidden lg:inline">
                  — Presensi & Keamanan Gerbang Sekolah
                </span>
              </div>
              <h1 className="text-xs sm:text-sm font-bold tracking-wide text-white leading-tight">
                ABSENSI QR CODE SDN KANDANGAN I TOSARI
              </h1>
              <p className="text-[10px] text-blue-200 hidden sm:block leading-none mt-0.5">
                Kecamatan Tosari, Kabupaten Pasuruan, Jawa Timur
              </p>
            </div>
          </div>
        </div>

        {/* Live Clock & User Action */}
        <div className="flex items-center gap-3">
          {/* Clock */}
          <div className="hidden md:flex flex-col items-end text-right">
            <span className="text-xs font-semibold text-blue-100 flex items-center gap-1.5">
              <Clock size={13} className="text-sky-300" />
              {currentTime}
            </span>
            <span className="text-[10px] text-blue-200/80">{currentDate}</span>
          </div>

          {/* User Profile & Logout */}
          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-white/15">
              <div className="hidden sm:flex flex-col items-end text-right">
                <span className="text-xs font-medium text-white max-w-[130px] truncate">{user.fullName}</span>
                <div className="mt-0.5">{getRoleBadge(user.roles)}</div>
              </div>

              <button
                onClick={handleLogout}
                title="Keluar dari sistem"
                className="p-1.5 sm:p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-400/30 transition flex items-center gap-1 text-xs"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
