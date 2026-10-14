"use client";

import React, { useEffect, useState } from "react";
import { QrCode, RefreshCw, Printer, Shield, Eye, AlertCircle } from "lucide-react";
import StudentIdCard from "@/components/qr/StudentIdCard";

export default function AdminQrManagementPage() {
  const [activeTab, setActiveTab] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForCard, setSelectedForCard] = useState<any | null>(null);
  const [cardQrDataUrl, setCardQrDataUrl] = useState<string>("");
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === "STUDENT" ? "/api/master/students" : "/api/master/teachers";
      const res = await fetch(endpoint);
      const data = await res.json();
      if (data.success) {
        setItems(activeTab === "STUDENT" ? data.students : data.teachers);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleShowCard = async (item: any) => {
    try {
      const res = await fetch(`/api/qr/generate?entityType=${activeTab}&entityId=${item.id}`);
      const data = await res.json();
      if (data.success) {
        setCardQrDataUrl(data.qrDataUrl);
        setSelectedForCard(item);
      } else {
        alert("QR Token belum diterbitkan untuk entitas ini. Silakan klik 'Terbitkan Token'.");
      }
    } catch (e) {
      alert("Gagal memuat QR Code.");
    }
  };

  const handleReissueQr = async (item: any) => {
    if (!confirm(`Apakah Anda yakin ingin menerbitkan ulang QR Code untuk ${item.fullName}? QR Code lama akan langsung dicabut demi keamanan.`)) {
      return;
    }

    setGeneratingId(item.id);
    try {
      const res = await fetch("/api/qr/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: activeTab,
          entityId: item.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`QR Code baru berhasil diterbitkan untuk ${item.fullName}.`);
        handleShowCard(item);
      } else {
        alert(data.message || "Gagal menerbitkan QR.");
      }
    } catch (e) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-black text-slate-800">
            Manajemen QR Code & Kartu Identitas
          </h1>
          <p className="text-xs text-slate-500">
            Penerbitan token acak berkeamanan tinggi, pencabutan token, dan pencetakan kartu fisik
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-200 p-1 rounded-xl">
          <button
            onClick={() => {
              setActiveTab("STUDENT");
              setSelectedForCard(null);
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === "STUDENT" ? "bg-white text-blue-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Kartu Siswa
          </button>
          <button
            onClick={() => {
              setActiveTab("TEACHER");
              setSelectedForCard(null);
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === "TEACHER" ? "bg-white text-blue-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Kartu Guru
          </button>
        </div>
      </div>

      {/* Main Layout: List & Card Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table of Entities */}
        <div id="student-table-section" className="no-print lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <span className="font-bold text-slate-800 text-xs sm:text-sm">
              Daftar {activeTab === "STUDENT" ? "Siswa Aktif" : "Dewan Guru"} ({items.length})
            </span>
            <button
              onClick={fetchData}
              className="text-xs text-blue-700 font-semibold hover:underline flex items-center gap-1"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>

          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#0F2744] text-white text-[11px] uppercase font-bold sticky top-0">
                <tr>
                  <th className="py-3 px-4">No</th>
                  <th className="py-3 px-4">{activeTab === "STUDENT" ? "NIS" : "NIP"}</th>
                  <th className="py-3 px-4">Nama Lengkap</th>
                  <th className="py-3 px-4">{activeTab === "STUDENT" ? "Kelas" : "Jabatan"}</th>
                  <th className="py-3 px-4 text-center">Aksi Kartu & QR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Memuat data...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Tidak ada data ditemukan.
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-blue-50/40 transition ${
                        selectedForCard?.id === item.id ? "bg-blue-50/80 font-medium" : ""
                      }`}
                    >
                      <td className="py-3 px-4 text-slate-500">{idx + 1}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        {item.nis || item.nip || "-"}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          {item.photoUrl ? (
                            <img
                              src={item.photoUrl}
                              alt=""
                              className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                              {(item.fullName || "S").trim().charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span>{item.fullName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {item.className || item.position || "-"}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap space-x-1.5">
                        <button
                          onClick={() => handleShowCard(item)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-sm transition"
                        >
                          Lihat Kartu
                        </button>
                        <button
                          onClick={() => handleReissueQr(item)}
                          disabled={generatingId === item.id}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-semibold shadow-sm transition disabled:opacity-50"
                          title="Cabut token lama & buat token baru"
                        >
                          {generatingId === item.id ? "Memproses..." : "Terbitkan Ulang"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card Preview Panel */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col items-center justify-center min-h-[400px] print:border-none print:shadow-none print:p-0 print:min-h-0 print:bg-transparent">
          {selectedForCard && cardQrDataUrl ? (
            <div className="w-full">
              <h3 className="no-print font-bold text-slate-800 text-sm text-center mb-4">
                Pratinjau Kartu Fisik {activeTab === "STUDENT" ? "Siswa" : "Guru"}
              </h3>
              <StudentIdCard
                student={selectedForCard}
                qrDataUrl={cardQrDataUrl}
                onPhotoUpdated={(newPhotoUrl) => {
                  setSelectedForCard((prev: any) =>
                    prev ? { ...prev, photoUrl: newPhotoUrl } : prev
                  );
                  setItems((prev: any[]) =>
                    prev.map((item) =>
                      item.id === selectedForCard.id
                        ? { ...item, photoUrl: newPhotoUrl }
                        : item
                    )
                  );
                }}
              />
            </div>
          ) : (
            <div className="text-center text-slate-400 p-6 space-y-2">
              <QrCode size={48} className="mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">Pratinjau Kartu Belum Dipilih</p>
              <p className="text-xs max-w-xs">
                Klik tombol <strong>Lihat Kartu</strong> pada salah satu siswa atau guru di tabel untuk melihat dan mencetak kartu identitas fisik.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
