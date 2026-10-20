"use client";

import React, { useEffect, useState } from "react";
import { Settings, Save, School, Clock, MessageSquare, RefreshCw } from "lucide-react";
import KopSuratLogoManager from "@/components/reports/KopSuratLogoManager";

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // School Profile
  const [schoolName, setSchoolName] = useState("SDN Kandangan I Tosari");
  const [schoolAddress, setSchoolAddress] = useState("Jl. Bromo No. 12, Desa Kandangan, Kecamatan Tosari");
  const [phone, setPhone] = useState("(0343) 571001");
  const [email, setEmail] = useState("sdnkandangan1tosari@pasuruankab.sch.id");
  const [headmasterName, setHeadmasterName] = useState("AKHMAD SHODIKIN, M.Pd");
  const [headmasterNip, setHeadmasterNip] = useState("198503182009031009");
  const [logoUrl, setLogoUrl] = useState("");
  const [regionLogoUrl, setRegionLogoUrl] = useState("");

  // Attendance Rules
  const [checkInStart, setCheckInStart] = useState("06:30:00");
  const [checkInLateThreshold, setCheckInLateThreshold] = useState("07:00:00");
  const [checkInCutoffTime, setCheckInCutoffTime] = useState("07:30:00");
  const [checkOutStart, setCheckOutStart] = useState("12:00:00");

  // WhatsApp Templates
  const [waAttendanceTemplate, setWaAttendanceTemplate] = useState("");
  const [waLateTemplate, setWaLateTemplate] = useState("");
  const [waAbsentTemplate, setWaAbsentTemplate] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          if (d.school) {
            setSchoolName(d.school.name || "");
            setSchoolAddress(d.school.address || "");
            setPhone(d.school.phone || "");
            setEmail(d.school.email || "");
            setHeadmasterName(d.school.headmasterName || "");
            setHeadmasterNip(d.school.headmasterNip || "");
            setLogoUrl(d.school.logoUrl || "");
            setRegionLogoUrl(d.school.regionLogoUrl || "");
          }
          if (d.settings) {
            setCheckInStart(d.settings.checkInStart || "06:30:00");
            setCheckInLateThreshold(d.settings.checkInLateThreshold || "07:00:00");
            setCheckInCutoffTime(d.settings.checkInCutoffTime || "07:30:00");
            setCheckOutStart(d.settings.checkOutStart || "12:00:00");
            setWaAttendanceTemplate(d.settings.waAttendanceTemplate || "");
            setWaLateTemplate(d.settings.waLateTemplate || "");
            setWaAbsentTemplate(d.settings.waAbsentTemplate || "");
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolData: {
            name: schoolName,
            address: schoolAddress,
            phone,
            email,
            headmasterName,
            headmasterNip,
            logoUrl,
            regionLogoUrl,
          },
          settingsData: {
            checkInStart,
            checkInLateThreshold,
            checkInCutoffTime,
            checkOutStart,
            waAttendanceTemplate,
            waLateTemplate,
            waAbsentTemplate,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("Pengaturan sekolah dan aturan absensi berhasil diperbarui.");
      } else {
        alert(data.message || "Gagal menyimpan.");
      }
    } catch (e) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl font-black text-slate-800">
          Pengaturan Sekolah & Aturan Absensi
        </h1>
        <p className="text-xs text-slate-500">
          Konfigurasi identitas lembaga, jam operasional, batas keterlambatan, dan template notifikasi
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Identitas Lembaga */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <School size={16} className="text-blue-600" /> Profil Sekolah & Kepala Sekolah
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Resmi Sekolah</label>
              <input
                type="text"
                required
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Telepon Sekolah</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Lengkap</label>
            <input
              type="text"
              required
              value={schoolAddress}
              onChange={(e) => setSchoolAddress(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Kepala Sekolah</label>
              <input
                type="text"
                value={headmasterName}
                onChange={(e) => setHeadmasterName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">NIP Kepala Sekolah</label>
              <input
                type="text"
                value={headmasterNip}
                onChange={(e) => setHeadmasterNip(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Kelola Logo Kop Surat Laporan PDF */}
        <KopSuratLogoManager />

        {/* Aturan Jam Absensi */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Clock size={16} className="text-blue-600" /> Aturan Waktu & Sesi Absensi (WIB)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mulai Scan Masuk</label>
              <input
                type="text"
                value={checkInStart}
                onChange={(e) => setCheckInStart(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-600"
              />
              <span className="text-[10px] text-slate-400">Default: 06:30:00</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-amber-700 mb-1">Batas Terlambat</label>
              <input
                type="text"
                value={checkInLateThreshold}
                onChange={(e) => setCheckInLateThreshold(e.target.value)}
                className="w-full border border-amber-300 bg-amber-50/50 rounded-lg p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-amber-600"
              />
              <span className="text-[10px] text-slate-400">Lewat jam ini = Terlambat</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Batas Akhir Scan</label>
              <input
                type="text"
                value={checkInCutoffTime}
                onChange={(e) => setCheckInCutoffTime(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-600"
              />
              <span className="text-[10px] text-slate-400">Default: 07:30:00</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mulai Jam Pulang</label>
              <input
                type="text"
                value={checkOutStart}
                onChange={(e) => setCheckOutStart(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-600"
              />
              <span className="text-[10px] text-slate-400">Default: 12:00:00</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl shadow-md flex items-center gap-2 transition disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Menyimpan Pengaturan...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Simpan Seluruh Pengaturan</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
