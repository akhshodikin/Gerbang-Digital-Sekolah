"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Shield, Users, QrCode, Lock, User, RefreshCw, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username || !password) {
      setError("Silakan isi nama pengguna dan kata sandi.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Gagal masuk. Periksa kembali nama pengguna dan kata sandi Anda.");
        setLoading(false);
        return;
      }

      // Berhasil masuk, arahkan ke rute peran
      router.push(data.redirectUrl || "/admin/dashboard");
      router.refresh();
    } catch (err: any) {
      setError("Terjadi gangguan koneksi ke server. Coba beberapa saat lagi.");
      setLoading(false);
    }
  };

  const quickFill = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A192F] via-[#0F2744] to-[#1E3A8A] flex flex-col justify-center items-center p-4">
      {/* Container Login */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-blue-900/40">
        {/* Header Kartu */}
        <div className="bg-gradient-to-r from-[#0F2744] via-[#1E3A8A] to-[#0F2744] text-white p-6 text-center border-b border-blue-500/20">
          {/* Logo GDS */}
          <div className="w-20 h-20 bg-white/10 backdrop-blur-md border-2 border-sky-400/50 rounded-2xl flex items-center justify-center mx-auto mb-3.5 p-2 shadow-xl shadow-blue-950/50">
            <img
              src="/images/logo-gds.png"
              alt="Logo GDS Gerbang Digital Sekolah"
              className="w-full h-full object-contain filter drop-shadow"
            />
          </div>

          {/* Judul Utama: GDS : Gerbang Digital Sekolah & Penjelasan Aplikasi */}
          <div className="mb-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/40 shadow-sm mb-1.5">
              <span className="font-black text-sm tracking-widest text-sky-300">GDS</span>
              <span className="text-[11px] text-blue-100 font-semibold">• Gerbang Digital Sekolah</span>
            </div>
            <p className="text-[11.5px] text-sky-100/90 leading-snug max-w-xs mx-auto">
              Sistem Otomasi Presensi & Keamanan Gerbang Sekolah Berbasis Pemindaian QR Code Terintegrasi Real-Time
            </p>
          </div>

          {/* Diletakkan di bawah judul GDS: ABSENSI QR CODE SDN KANDANGAN I TOSARI */}
          <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-white leading-tight border-t border-blue-400/20 pt-2.5 mt-1">
            ABSENSI QR CODE SDN KANDANGAN I TOSARI
          </h1>
          <p className="text-xs text-blue-200 mt-0.5">
            Kecamatan Tosari, Kabupaten Pasuruan, Jawa Timur
          </p>
        </div>

        {/* Form Login */}
        <div className="p-6 sm:p-8 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2.5">
              <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nama Pengguna / Akun
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: admin, piket, walikelas1"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi..."
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2.5 px-4 rounded-xl text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  <span>Masuk ke Sistem</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Login Helper untuk Pengujian 4 Peran */}
          <div className="pt-4 border-t border-slate-200">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center mb-2.5">
              Akses Cepat Pengujian (4 Peran):
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => quickFill("admin", "admin123")}
                className="p-2 text-left rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition"
              >
                <div className="font-bold text-red-800 flex items-center gap-1">
                  <Shield size={12} /> Admin
                </div>
                <div className="text-[10px] text-red-600">admin / admin123</div>
              </button>

              <button
                type="button"
                onClick={() => quickFill("piket", "piket123")}
                className="p-2 text-left rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition"
              >
                <div className="font-bold text-emerald-800 flex items-center gap-1">
                  <QrCode size={12} /> Guru Piket
                </div>
                <div className="text-[10px] text-emerald-600">piket / piket123</div>
              </button>

              <div className="p-2 text-left rounded-lg border border-sky-200 bg-sky-50 flex flex-col justify-between">
                <div className="font-bold text-sky-800 flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1"><Users size={12} /> Wali Kelas</span>
                  <span className="text-[9px] text-sky-600">/ guru123</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[1, 2, 3, 4, 5, 6].map((grade) => (
                    <button
                      key={grade}
                      type="button"
                      onClick={() => quickFill(`walikelas${grade}`, "guru123")}
                      className="px-1 py-0.5 bg-white hover:bg-sky-200/80 text-sky-900 border border-sky-300/80 rounded text-[10px] font-bold transition text-center"
                      title={`Login sebagai Wali Kelas ${grade}`}
                    >
                      Kls {grade}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => quickFill("walimurid", "wali123")}
                className="p-2 text-left rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 transition"
              >
                <div className="font-bold text-amber-800 flex items-center gap-1">
                  <Users size={12} /> Wali Murid
                </div>
                <div className="text-[10px] text-amber-600">walimurid / wali123</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 text-center text-[11px] text-slate-500">
          SDN Kandangan I Tosari • Zona Waktu Asia/Jakarta (WIB)
        </div>
      </div>
    </div>
  );
}
