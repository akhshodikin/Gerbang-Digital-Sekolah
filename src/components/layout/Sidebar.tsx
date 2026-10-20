"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  QrCode,
  Users,
  GraduationCap,
  FileCheck2,
  AlertTriangle,
  HeartHandshake,
  FileText,
  MessageSquare,
  Settings,
  History,
  Send,
  UserCheck,
  Clock,
  BookOpen,
  Database,
  Camera,
} from "lucide-react";

interface SidebarProps {
  roles?: string[];
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ roles = [], isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  // Role primary check
  const isAdmin = roles.includes("ADMIN");
  const isWaliKelas = roles.includes("WALI_KELAS") && !isAdmin;
  const isWaliMurid = roles.includes("WALI_MURID") && !isAdmin;
  const isGuruPiket = roles.includes("GURU_PIKET") && !isAdmin;

  const isActive = (path: string) => {
    if (path === "/admin/dashboard" || path === "/wali-kelas/dashboard" || path === "/wali-murid/dashboard" || path === "/piket/dashboard") {
      return pathname === path;
    }
    return pathname.startsWith(path);
  };

  const navItemClass = (path: string) => `
    flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all
    ${
      isActive(path)
        ? "bg-blue-600 text-white shadow-sm font-semibold"
        : "text-slate-600 hover:text-blue-900 hover:bg-blue-50"
    }
  `;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          no-print fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col justify-between
          transition-transform duration-200 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Brand Header Sidebar */}
          <div className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 p-0.5 flex items-center justify-center shrink-0">
                  <img
                    src="/images/logo-gds.png"
                    alt="Logo GDS"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-blue-600 text-white tracking-wider">
                      GDS
                    </span>
                    <span className="text-xs font-bold text-slate-800">Gerbang Digital</span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="lg:hidden text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                Tutup
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5 leading-tight">
              Sistem Presensi & Keamanan Pintu Gerbang
            </p>
            <p className="text-[10px] font-bold text-blue-900 mt-0.5">
              SDN Kandangan I Tosari
            </p>
          </div>

          {/* ADMIN MENU */}
          {isAdmin && (
            <div className="space-y-1">
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Menu Utama Admin
              </p>
              <Link href="/admin/dashboard" onClick={onClose} className={navItemClass("/admin/dashboard")}>
                <LayoutDashboard size={18} /> Dashboard
              </Link>
              <Link href="/admin/absensi/siswa" onClick={onClose} className={navItemClass("/admin/absensi/siswa")}>
                <UserCheck size={18} /> Absensi Siswa
              </Link>
              <Link href="/admin/absensi/guru" onClick={onClose} className={navItemClass("/admin/absensi/guru")}>
                <Clock size={18} /> Absensi Guru
              </Link>
              <Link href="/admin/perizinan" onClick={onClose} className={navItemClass("/admin/perizinan")}>
                <FileCheck2 size={18} /> Pengajuan Izin
              </Link>
              <Link href="/admin/pelanggaran" onClick={onClose} className={navItemClass("/admin/pelanggaran")}>
                <AlertTriangle size={18} /> Pelanggaran & Bina
              </Link>
              <Link href="/admin/konseling" onClick={onClose} className={navItemClass("/admin/konseling")}>
                <HeartHandshake size={18} /> Konseling (Rahasia)
              </Link>
              <Link href="/admin/qr-code" onClick={onClose} className={navItemClass("/admin/qr-code")}>
                <QrCode size={18} /> Kelola QR & Kartu
              </Link>
              <Link href="/piket/absensi" onClick={onClose} className={navItemClass("/piket/absensi")}>
                <Camera size={18} /> Pindai QR Gerbang
              </Link>

              <p className="pt-3 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Data Induk
              </p>
              <Link href="/admin/data-induk/siswa" onClick={onClose} className={navItemClass("/admin/data-induk/siswa")}>
                <GraduationCap size={18} /> Data Kelas & Siswa
              </Link>
              <Link href="/admin/data-induk/guru" onClick={onClose} className={navItemClass("/admin/data-induk/guru")}>
                <Users size={18} /> Data Dewan Guru
              </Link>
              <Link href="/admin/data-induk/wali-murid" onClick={onClose} className={navItemClass("/admin/data-induk/wali-murid")}>
                <BookOpen size={18} /> Data Wali Murid
              </Link>

              <p className="pt-3 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Laporan & Sistem
              </p>
              <Link href="/admin/laporan" onClick={onClose} className={navItemClass("/admin/laporan")}>
                <FileText size={18} /> Laporan & Cetak PDF
              </Link>
              <Link href="/chat" onClick={onClose} className={navItemClass("/chat")}>
                <MessageSquare size={18} /> Chat Internal
              </Link>
              <Link href="/admin/notifikasi" onClick={onClose} className={navItemClass("/admin/notifikasi")}>
                <Send size={18} /> Notifikasi WhatsApp
              </Link>
              <Link href="/admin/audit-log" onClick={onClose} className={navItemClass("/admin/audit-log")}>
                <History size={18} /> Audit Log
              </Link>
              <Link href="/admin/pengaturan" onClick={onClose} className={navItemClass("/admin/pengaturan")}>
                <Settings size={18} /> Pengaturan Sekolah
              </Link>
              <Link href="/admin/backup" onClick={onClose} className={navItemClass("/admin/backup")}>
                <Database size={18} /> Backup & Restore
              </Link>
            </div>
          )}

          {/* GURU PIKET MENU */}
          {isGuruPiket && (
            <div className="space-y-1">
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Menu Guru Piket
              </p>
              <Link href="/piket/dashboard" onClick={onClose} className={navItemClass("/piket/dashboard")}>
                <LayoutDashboard size={18} /> Dashboard Piket
              </Link>
              <Link href="/piket/absensi" onClick={onClose} className={navItemClass("/piket/absensi")}>
                <QrCode size={18} /> Pindai QR Absensi
              </Link>
              <Link href="/piket/keterlambatan" onClick={onClose} className={navItemClass("/piket/keterlambatan")}>
                <Clock size={18} /> Catat Terlambat
              </Link>
              <Link href="/piket/laporan" onClick={onClose} className={navItemClass("/piket/laporan")}>
                <FileText size={18} /> Laporan Harian Piket
              </Link>
              <Link href="/chat" onClick={onClose} className={navItemClass("/chat")}>
                <MessageSquare size={18} /> Chat Internal
              </Link>
            </div>
          )}

          {/* WALI KELAS MENU */}
          {isWaliKelas && (
            <div className="space-y-1">
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Menu Wali Kelas
              </p>
              <Link href="/wali-kelas/dashboard" onClick={onClose} className={navItemClass("/wali-kelas/dashboard")}>
                <LayoutDashboard size={18} /> Dashboard Kelas
              </Link>
              <Link href="/wali-kelas/absensi" onClick={onClose} className={navItemClass("/wali-kelas/absensi")}>
                <UserCheck size={18} /> Kehadiran Harian
              </Link>
              <Link href="/wali-kelas/perizinan" onClick={onClose} className={navItemClass("/wali-kelas/perizinan")}>
                <FileCheck2 size={18} /> Tinjau Pengajuan Izin
              </Link>
              <Link href="/wali-kelas/pembinaan" onClick={onClose} className={navItemClass("/wali-kelas/pembinaan")}>
                <AlertTriangle size={18} /> Pembinaan Siswa
              </Link>
              <Link href="/wali-kelas/laporan" onClick={onClose} className={navItemClass("/wali-kelas/laporan")}>
                <FileText size={18} /> Rekap Kelas (PDF/CSV)
              </Link>
              <Link href="/chat" onClick={onClose} className={navItemClass("/chat")}>
                <MessageSquare size={18} /> Chat Wali Murid
              </Link>
            </div>
          )}

          {/* WALI MURID MENU */}
          {isWaliMurid && (
            <div className="space-y-1">
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Portal Wali Murid
              </p>
              <Link href="/wali-murid/dashboard" onClick={onClose} className={navItemClass("/wali-murid/dashboard")}>
                <LayoutDashboard size={18} /> Beranda Anak
              </Link>
              <Link href="/wali-murid/absensi" onClick={onClose} className={navItemClass("/wali-murid/absensi")}>
                <UserCheck size={18} /> Riwayat Kehadiran
              </Link>
              <Link href="/wali-murid/perizinan" onClick={onClose} className={navItemClass("/wali-murid/perizinan")}>
                <FileCheck2 size={18} /> Ajukan Izin / Sakit
              </Link>
              <Link href="/chat" onClick={onClose} className={navItemClass("/chat")}>
                <MessageSquare size={18} /> Hubungi Wali Kelas
              </Link>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-[11px] text-slate-500">
          <div className="font-semibold text-slate-700">SDN Kandangan I Tosari</div>
          <div className="text-[10px]">Versi Produksi 1.0.0 (WIB)</div>
        </div>
      </aside>
    </>
  );
}
