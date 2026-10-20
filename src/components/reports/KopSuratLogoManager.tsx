"use client";

import React, { useState, useEffect, useRef } from "react";
import { Upload, Trash2, CheckCircle2, AlertCircle, RefreshCw, Eye, Image as ImageIcon } from "lucide-react";

interface KopSuratLogoManagerProps {
  onUpdated?: () => void;
  className?: string;
  defaultOpen?: boolean;
}

export default function KopSuratLogoManager({ onUpdated, className = "", defaultOpen = false }: KopSuratLogoManagerProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [regionLogoUrl, setRegionLogoUrl] = useState<string>("");
  const [schoolLogoUrl, setSchoolLogoUrl] = useState<string>("");
  const [schoolData, setSchoolData] = useState<any>(null);

  const regionInputRef = useRef<HTMLInputElement>(null);
  const schoolInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.success && data.school) {
        setSchoolData(data.school);
        setRegionLogoUrl(data.school.regionLogoUrl || "");
        setSchoolLogoUrl(data.school.logoUrl || "");
      }
    } catch (err) {
      console.error("Gagal memuat info logo sekolah:", err);
    } finally {
      setLoading(false);
    }
  };

  // Helper untuk kompresi gambar klien via Canvas
  const processImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxDim = 360; // Resolusi tajam untuk cetak dokumen 20-25mm
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          // PNG mempertahankan transparansi logo
          const dataUrl = canvas.toDataURL("image/png", 0.9);
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error("Gagal membaca berkas gambar."));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Gagal membaca berkas gambar."));
      reader.readAsDataURL(file);
    });
  };

  const handleRegionFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await processImageFile(file);
      setRegionLogoUrl(compressed);
      setMessage(null);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Gagal memproses gambar." });
    }
  };

  const handleSchoolFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await processImageFile(file);
      setSchoolLogoUrl(compressed);
      setMessage(null);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Gagal memproses gambar." });
    }
  };

  const handleSaveLogos = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolData: {
            logoUrl: schoolLogoUrl || null,
            regionLogoUrl: regionLogoUrl || null,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Logo Kop Surat berhasil disimpan dan diperbarui pada laporan PDF." });
        if (onUpdated) onUpdated();
      } else {
        setMessage({ type: "error", text: data.message || "Gagal menyimpan logo." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Terjadi gangguan jaringan saat menyimpan logo." });
    } finally {
      setSaving(false);
    }
  };

  const defaultRegionLogo = "/images/tut-wuri-handayani.png";
  const defaultSchoolLogo = "/images/logo-gds.png";

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-6 ${className}`}>
      {/* Title & Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-slate-800 text-sm sm:text-base flex items-center gap-2">
              <ImageIcon size={18} className="text-blue-600" />
              Kelola Logo Kop Surat Laporan PDF
            </h3>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
              Kop Resmi
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Unggah logo instansi Pemerintah Kabupaten (sisi kiri) dan logo sekolah / GDS (sisi kanan) untuk dicetak pada berkas PDF.
          </p>
        </div>

        <button
          onClick={handleSaveLogos}
          disabled={saving || loading}
          className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition flex items-center gap-2 disabled:opacity-50 shrink-0 self-start sm:self-auto"
        >
          {saving ? (
            <>
              <RefreshCw size={14} className="animate-spin" /> Menyimpan...
            </>
          ) : (
            <>
              <CheckCircle2 size={15} /> Simpan Perubahan Logo
            </>
          )}
        </button>
      </div>

      {message && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2.5 ${
            message.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-red-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Grid 2 Logo Uploaders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Logo 1: Logo Kabupaten / Daerah (Kiri) */}
        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs text-slate-700">Logo 1: Pemerintah Daerah / Dinas</span>
              <span className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                Posisi: Kiri Kop
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              Logo resmi Kabupaten Pasuruan atau logo Dinas Pendidikan.
            </p>

            <div className="flex items-center gap-4">
              <div className="w-20 h-24 rounded-lg bg-white border border-slate-300 shadow-sm flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
                <img
                  src={regionLogoUrl || defaultRegionLogo}
                  alt="Logo Kabupaten"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="space-y-2 text-xs flex-1">
                <div className="text-[11px] text-slate-600 font-medium">
                  Status:{" "}
                  {regionLogoUrl ? (
                    <span className="text-emerald-700 font-bold">Logo Kustom Terpasang</span>
                  ) : (
                    <span className="text-slate-500 italic">Menggunakan Logo Bawaan</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => regionInputRef.current?.click()}
                    className="bg-white hover:bg-slate-100 text-blue-700 border border-blue-300 font-semibold text-[11px] px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 transition"
                  >
                    <Upload size={13} /> Unggah File
                  </button>

                  {regionLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setRegionLogoUrl("")}
                      className="bg-white hover:bg-red-50 text-red-600 border border-red-200 text-[11px] px-2.5 py-1.5 rounded-lg transition flex items-center gap-1"
                      title="Kembalikan ke logo default"
                    >
                      <Trash2 size={13} /> Reset
                    </button>
                  )}
                </div>
                <input
                  ref={regionInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleRegionFileChange}
                  className="hidden"
                />
                <p className="text-[10px] text-slate-400">Format: PNG, JPG, WebP (Maks 2MB)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Logo 2: Logo Sekolah / GDS (Kanan) */}
        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs text-slate-700">Logo 2: Logo Sekolah / GDS</span>
              <span className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                Posisi: Kanan Kop
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              Logo resmi SDN Kandangan I Tosari atau emblem Gerbang Digital Sekolah (GDS).
            </p>

            <div className="flex items-center gap-4">
              <div className="w-20 h-24 rounded-lg bg-white border border-slate-300 shadow-sm flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
                <img
                  src={schoolLogoUrl || defaultSchoolLogo}
                  alt="Logo Sekolah"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="space-y-2 text-xs flex-1">
                <div className="text-[11px] text-slate-600 font-medium">
                  Status:{" "}
                  {schoolLogoUrl ? (
                    <span className="text-emerald-700 font-bold">Logo Kustom Terpasang</span>
                  ) : (
                    <span className="text-slate-500 italic">Menggunakan Logo GDS</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => schoolInputRef.current?.click()}
                    className="bg-white hover:bg-slate-100 text-blue-700 border border-blue-300 font-semibold text-[11px] px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 transition"
                  >
                    <Upload size={13} /> Unggah File
                  </button>

                  {schoolLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setSchoolLogoUrl("")}
                      className="bg-white hover:bg-red-50 text-red-600 border border-red-200 text-[11px] px-2.5 py-1.5 rounded-lg transition flex items-center gap-1"
                      title="Kembalikan ke logo default"
                    >
                      <Trash2 size={13} /> Reset
                    </button>
                  )}
                </div>
                <input
                  ref={schoolInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleSchoolFileChange}
                  className="hidden"
                />
                <p className="text-[10px] text-slate-400">Format: PNG, JPG, WebP (Maks 2MB)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Kop Surat Preview */}
      <div className="bg-white border-2 border-dashed border-blue-200 rounded-xl p-4 sm:p-6 shadow-inner space-y-2">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
            <Eye size={14} className="text-blue-600" /> Pratinjau Tampilan Kop Surat PDF
          </span>
          <span className="text-[10px] text-slate-400">Ukuran Standar Dokumen A4</span>
        </div>

        {/* Kop Box */}
        <div className="pt-2 flex items-center justify-between gap-3 text-center">
          {/* Left: Logo Kabupaten */}
          <div className="w-14 sm:w-16 h-16 sm:h-20 shrink-0 flex items-center justify-center">
            <img
              src={regionLogoUrl || defaultRegionLogo}
              alt="Logo Kabupaten"
              className="max-h-full max-w-full object-contain"
            />
          </div>

          {/* Center: Info Teks */}
          <div className="flex-1 px-2 space-y-0.5">
            <h4 className="font-bold text-[11px] sm:text-xs text-slate-800 uppercase tracking-wide">
              PEMERINTAH KABUPATEN PASURUAN
            </h4>
            <h5 className="font-bold text-[10px] sm:text-[11px] text-slate-700 uppercase">
              DINAS PENDIDIKAN DAN KEBUDAYAAN
            </h5>
            <h3 className="font-black text-xs sm:text-sm text-slate-900 uppercase tracking-wider py-0.5">
              {schoolData?.name || "SDN KANDANGAN I TOSARI"}
            </h3>
            <p className="text-[9px] sm:text-[10px] text-slate-600 leading-tight">
              {schoolData?.address || "Jl. Bromo No. 12, Desa Kandangan, Kec. Tosari, Kab. Pasuruan, Jawa Timur 67177"}
            </p>
            <p className="text-[9px] sm:text-[9.5px] text-slate-500 leading-tight">
              Email: {schoolData?.email || "sdnkandangan1tosari@pasuruankab.sch.id"} | NPSN: {schoolData?.npsn || "20519101"}
            </p>
          </div>

          {/* Right: Logo Sekolah / GDS */}
          <div className="w-14 sm:w-16 h-16 sm:h-20 shrink-0 flex items-center justify-center">
            <img
              src={schoolLogoUrl || defaultSchoolLogo}
              alt="Logo Sekolah"
              className="max-h-full max-w-full object-contain"
            />
          </div>
        </div>

        {/* Double Border Line */}
        <div className="pt-2">
          <div className="border-t-2 border-slate-800 w-full" />
          <div className="border-t border-slate-800 w-full mt-0.5" />
        </div>
      </div>
    </div>
  );
}
