"use client";

import React, { useState } from "react";
import {
  Database,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  RefreshCw,
  FileJson,
  Server,
  Layers,
} from "lucide-react";

export default function AdminBackupRestorePage() {
  const [downloading, setDownloading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [restoreResult, setRestoreResult] = useState<any>(null);
  const [restoreError, setRestoreError] = useState("");

  const handleDownloadBackup = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/backup");
      if (!res.ok) {
        throw new Error("Gagal mengunduh file cadangan dari server.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-sdn-kandangan-tosari-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message || "Gagal membuat cadangan database.");
    } finally {
      setDownloading(false);
    }
  };

  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert("Pilih file cadangan JSON terlebih dahulu.");
      return;
    }

    if (confirmText.trim().toUpperCase() !== "RESTORE") {
      alert("Ketik 'RESTORE' pada kolom konfirmasi untuk melanjutkan proses pemulihan.");
      return;
    }

    if (!confirm("PERINGATAN: Apakah Anda yakin ingin memulihkan database dari file ini?")) {
      return;
    }

    setRestoring(true);
    setRestoreResult(null);
    setRestoreError("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/backup/restore", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setRestoreResult(data);
        setSelectedFile(null);
        setConfirmText("");
      } else {
        setRestoreError(data.message || "Gagal memulihkan database.");
      }
    } catch (e: any) {
      setRestoreError("Terjadi kesalahan jaringan saat memulihkan database.");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <Database size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800">
              Pencadangan & Pemulihan Database (Backup & Restore)
            </h1>
            <p className="text-xs text-slate-500">
              Kelola pencadangan berkala data sekolah dan pemulihan darurat sistem SDN Kandangan I Tosari
            </p>
          </div>
        </div>
      </div>

      {/* Grid 2 Kolom: Backup & Restore */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card Backup */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Download size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Cadangkan Database (Backup)</h2>
                <p className="text-xs text-slate-500">Unduh salinan lengkap database dalam format JSON</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-2">
              <div className="font-semibold text-slate-700">Data yang dicadangkan meliputi:</div>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li>Profil Sekolah & Pengaturan Sesi Absensi</li>
                <li>Data Peserta Didik & Data Orang Tua/Wali Murid</li>
                <li>Data Dewan Guru & Wali Kelas</li>
                <li>Rekam Kehadiran Siswa & Guru Harian</li>
                <li>Surat Perizinan & Catatan Pelanggaran/Pembinaan</li>
                <li>Token QR Code Aktif & Jejak Audit Log</li>
              </ul>
            </div>
          </div>

          <div className="pt-6">
            <button
              onClick={handleDownloadBackup}
              disabled={downloading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-2"
            >
              {downloading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" /> Menyiapkan Berkas...
                </>
              ) : (
                <>
                  <Download size={18} /> Unduh File Cadangan Database (.json)
                </>
              )}
            </button>
          </div>
        </div>

        {/* Card Restore */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <form onSubmit={handleRestoreSubmit} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <Upload size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Pulihkan Database (Restore)</h2>
                <p className="text-xs text-slate-500">Unggah berkas cadangan JSON untuk pemulihan data</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih File Cadangan (.json):
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-300 rounded-xl p-1.5 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ketik <span className="text-red-600 font-mono font-bold">RESTORE</span> untuk konfirmasi:
                </label>
                <input
                  type="text"
                  placeholder="Ketik RESTORE di sini"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {restoreError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>{restoreError}</span>
                </div>
              )}

              {restoreResult && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 size={16} />
                    <span>{restoreResult.message}</span>
                  </div>
                  {restoreResult.restoredSummary && (
                    <div className="text-[11px] text-emerald-700 pl-5">
                      Siswa: {restoreResult.restoredSummary.students} | Ortu: {restoreResult.restoredSummary.guardians} | Absensi: {restoreResult.restoredSummary.attendance}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={restoring || !selectedFile || confirmText.trim().toUpperCase() !== "RESTORE"}
              className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-2"
            >
              {restoring ? (
                <>
                  <RefreshCw size={18} className="animate-spin" /> Memulihkan Data...
                </>
              ) : (
                <>
                  <Upload size={18} /> Jalankan Pemulihan Database
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Panduan SOP Pemulihan Bencana */}
      <div className="bg-blue-50/50 border border-blue-200 rounded-2xl p-5 text-xs text-slate-700 space-y-2">
        <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
          <ShieldAlert size={18} />
          <span>Standar Operasional Pencadangan Data SDN Kandangan I Tosari:</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-slate-600">
          <li>Lakukan pencadangan (backup) minimal 1 minggu sekali pada akhir pekan atau menjelang akhir semester.</li>
          <li>Simpan file hasil unduhan (.json) di media penyimpanan terpisah yang aman (Google Drive resmi sekolah / Flashdisk cadangan).</li>
          <li>Sebelum melakukan pemulihan (restore), pastikan telah membuat cadangan kondisi terkini terlebih dahulu untuk mitigasi risiko.</li>
          <li>Setiap aktivitas pencadangan dan pemulihan dicatat otomatis pada <strong>Audit Log Sistem</strong>.</li>
        </ul>
      </div>
    </div>
  );
}
