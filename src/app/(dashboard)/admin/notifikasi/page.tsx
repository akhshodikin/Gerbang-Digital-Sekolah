"use client";

import React, { useEffect, useState } from "react";
import { Send, AlertCircle, CheckCircle2, RefreshCw, MessageSquare, Shield, Clock } from "lucide-react";

export default function AdminNotificationPage() {
  const [waConfigured, setWaConfigured] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setSettings(d.settings);
          setWaConfigured(d.waConfigured);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl font-black text-slate-800">
          Integrasi Notifikasi WhatsApp Orang Tua
        </h1>
        <p className="text-xs text-slate-500">
          Pengiriman pesan otomatis untuk kehadiran, keterlambatan, dan status perizinan siswa
        </p>
      </div>

      {/* Integration Status Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Status Gateway WhatsApp:
          </span>
          {waConfigured ? (
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-base">
              <CheckCircle2 size={20} className="text-emerald-600" />
              <span>Terkonfigurasi & Aktif</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-700 font-bold text-base">
              <AlertCircle size={20} className="text-amber-600" />
              <span>Belum Dikonfigurasi (Mode Lokal / Standby)</span>
            </div>
          )}
          <p className="text-xs text-slate-500 mt-1">
            {waConfigured
              ? "Semua notifikasi absensi dan izin otomatis dikirimkan ke nomor WhatsApp orang tua terverifikasi."
              : "Sistem aplikasi inti absensi tetap berjalan penuh normal tanpa terganggu ketiadaan token WhatsApp."}
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs space-y-1">
          <div className="text-slate-600 font-medium">Variabel Environment:</div>
          <div className="font-mono text-[11px] text-slate-800">WA_GATEWAY_URL: {waConfigured ? "Terisi" : "(Kosong)"}</div>
          <div className="font-mono text-[11px] text-slate-800">WA_API_TOKEN: {waConfigured ? "Terisi" : "(Kosong)"}</div>
        </div>
      </div>

      {/* Message Templates Preview */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
          <MessageSquare size={18} className="text-blue-600" /> Template Pesan WhatsApp Resmi
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Template Hadir */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
            <span className="font-bold text-emerald-900 block">1. Notifikasi Hadir Tepat Waktu</span>
            <p className="text-slate-700 font-mono text-[11px] bg-white p-2.5 rounded-lg border border-emerald-200">
              Yth. Wali Siswa &#123;nama_siswa&#125;, ananda tercatat HADIR pada pukul &#123;waktu&#125; WIB di SDN Kandangan I Tosari.
            </p>
            <span className="text-[10px] text-emerald-700 block">
              Diterima saat siswa memindai QR sebelum batas waktu.
            </span>
          </div>

          {/* Template Terlambat */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
            <span className="font-bold text-amber-900 block">2. Notifikasi Terlambat</span>
            <p className="text-slate-700 font-mono text-[11px] bg-white p-2.5 rounded-lg border border-amber-200">
              Pemberitahuan: Ananda &#123;nama_siswa&#125; tercatat TERLAMBAT pada pukul &#123;waktu&#125; WIB. Mohon koordinasi orang tua.
            </p>
            <span className="text-[10px] text-amber-700 block">
              Diterima saat siswa hadir melebihi toleransi (07.00 WIB).
            </span>
          </div>

          {/* Template Izin */}
          <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/50 space-y-2">
            <span className="font-bold text-sky-900 block">3. Notifikasi Status Izin</span>
            <p className="text-slate-700 font-mono text-[11px] bg-white p-2.5 rounded-lg border border-sky-200">
              Pemberitahuan: Pengajuan &#123;status&#125; ananda &#123;nama_siswa&#125; telah diverifikasi pihak sekolah.
            </p>
            <span className="text-[10px] text-sky-700 block">
              Diterima saat wali kelas menyetujui pengajuan izin.
            </span>
          </div>
        </div>
      </div>

      {/* Petunjuk Pengaktifan Gateway */}
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3 text-xs text-slate-700">
        <h3 className="font-bold text-slate-900 text-sm">
          Panduan Mengaktifkan Integrasi WhatsApp Resmi:
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-slate-600">
          <li>
            Daftarkan nomor resmi sekolah pada <strong>WhatsApp Business Cloud API</strong> atau provider gateway resmi (Fonnte, Waba, dsb).
          </li>
          <li>
            Buka file <code className="bg-white px-1.5 py-0.5 rounded border border-slate-300">.env</code> pada direktori server.
          </li>
          <li>
            Isi variabel <code className="bg-white px-1.5 py-0.5 rounded border border-slate-300">WA_GATEWAY_URL</code> dengan endpoint HTTP provider Anda.
          </li>
          <li>
            Isi variabel <code className="bg-white px-1.5 py-0.5 rounded border border-slate-300">WA_API_TOKEN</code> dengan kunci API token rahasia Anda.
          </li>
          <li>
            Muat ulang aplikasi server. Status otomatis berubah menjadi <strong>Terkonfigurasi & Aktif</strong>.
          </li>
        </ol>
      </div>
    </div>
  );
}
