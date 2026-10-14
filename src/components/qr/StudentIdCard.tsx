"use client";

import React, { useState, useRef } from "react";
import { Printer, Download, FileText, Check, Scissors, Camera, Upload, AlertCircle } from "lucide-react";
import { downloadCr80Pdf, downloadA4SheetPdf, CardEntity, formatTtl, formatBirthDate, formatGender } from "@/lib/qr/card-pdf";

interface StudentIdCardProps {
  student: CardEntity;
  qrDataUrl: string;
  onPhotoUpdated?: (newPhotoUrl: string) => void;
}

export default function StudentIdCard({ student, qrDataUrl, onPhotoUpdated }: StudentIdCardProps) {
  const [downloadingCr80, setDownloadingCr80] = useState(false);
  const [downloadingA4, setDownloadingA4] = useState(false);
  const [downloadedCr80, setDownloadedCr80] = useState(false);
  const [downloadedA4, setDownloadedA4] = useState(false);

  // State upload foto
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(student.photoUrl || null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sinkronisasi jika student berubah
  React.useEffect(() => {
    setPhotoUrl(student.photoUrl || null);
    setUploadSuccess(false);
    setUploadError("");
  }, [student.id, student.photoUrl]);

  const isTeacher = student.entityType === "TEACHER" || Boolean(student.nip);

  // 1. Cetak Langsung (Print Browser - Terisolasi Hanya Kartu Saja)
  const handlePrint = () => {
    document.body.classList.add("printing-id-card");
    window.print();
    setTimeout(() => {
      document.body.classList.remove("printing-id-card");
    }, 1500);
  };

  // 2. Unduh PDF Ukuran Standar Kartu CR-80 (85.6 mm x 54 mm)
  const handleDownloadCr80 = () => {
    setDownloadingCr80(true);
    try {
      downloadCr80Pdf({ ...student, photoUrl }, qrDataUrl);
      setDownloadedCr80(true);
      setTimeout(() => setDownloadedCr80(false), 2500);
    } catch (e) {
      console.error(e);
      alert("Gagal mengunduh kartu PDF.");
    } finally {
      setDownloadingCr80(false);
    }
  };

  // 3. Unduh Lembar A4 Siap Cetak & Gunting (Crop Marks)
  const handleDownloadA4 = () => {
    setDownloadingA4(true);
    try {
      downloadA4SheetPdf({ ...student, photoUrl }, qrDataUrl);
      setDownloadedA4(true);
      setTimeout(() => setDownloadedA4(false), 2500);
    } catch (e) {
      console.error(e);
      alert("Gagal mengunduh lembar cetak A4.");
    } finally {
      setDownloadingA4(false);
    }
  };

  // 4. Fitur Upload Foto Kartu
  const triggerPhotoUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Harap pilih berkas gambar (JPG, PNG, atau WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Ukuran gambar maksimal 5MB.");
      return;
    }

    setUploadingPhoto(true);
    setUploadError("");
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const endpoint = isTeacher
        ? "/api/files/upload"
        : `/api/master/students/${student.id}/photo`;

      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        const newUrl = data.photoUrl || data.fileUrl;
        setPhotoUrl(newUrl);
        student.photoUrl = newUrl;
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3500);
        if (onPhotoUpdated) {
          onPhotoUpdated(newUrl);
        }
      } else {
        setUploadError(data.message || "Gagal mengunggah foto.");
      }
    } catch (err: any) {
      console.error("Upload photo error:", err);
      setUploadError("Terjadi kesalahan jaringan saat mengunggah foto.");
    } finally {
      setUploadingPhoto(false);
      if (e.target) e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Hidden File Input untuk Upload Foto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handlePhotoFileChange}
        className="hidden"
      />

      {/* Action Toolbar (Tidak tercetak saat window.print) */}
      <div className="no-print mb-4 flex flex-wrap items-center justify-center gap-2">
        {/* Tombol Upload Foto */}
        <button
          onClick={triggerPhotoUpload}
          disabled={uploadingPhoto}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95"
          title="Unggah atau ganti foto identitas pada kartu"
        >
          {uploadingPhoto ? <Upload size={14} className="animate-spin" /> : <Camera size={14} />}
          {uploadingPhoto ? "Mengunggah..." : "Upload Foto"}
        </button>

        <button
          onClick={handlePrint}
          className="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95"
          title="Cetak langsung melalui printer (Hanya kartu saja yang dicetak)"
        >
          <Printer size={14} /> Cetak Kartu
        </button>

        <button
          onClick={handleDownloadCr80}
          disabled={downloadingCr80}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95"
          title="Unduh file PDF dengan ukuran pas ID Card (85.6 mm x 54 mm)"
        >
          {downloadedCr80 ? <Check size={14} /> : <Download size={14} />}
          {downloadedCr80 ? "Berhasil Diunduh!" : "Unduh PDF (CR-80)"}
        </button>

        <button
          onClick={handleDownloadA4}
          disabled={downloadingA4}
          className="bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95"
          title="Unduh file PDF lembar A4 berisi tampak depan & belakang dengan garis potong"
        >
          {downloadedA4 ? <Check size={14} /> : <FileText size={14} />}
          {downloadedA4 ? "Berhasil Diunduh!" : "Unduh Lembar A4"}
        </button>
      </div>

      {/* Notifikasi Upload Sukses / Gagal */}
      {uploadSuccess && (
        <div className="no-print mb-3 px-3 py-1.5 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-lg flex items-center gap-1.5 animate-fadeIn">
          <Check size={13} className="text-emerald-600 shrink-0" />
          <span>Foto kartu berhasil diperbarui dan disimpan!</span>
        </div>
      )}

      {uploadError && (
        <div className="no-print mb-3 px-3 py-1.5 bg-rose-50 border border-rose-300 text-rose-800 text-xs rounded-lg flex items-center gap-1.5">
          <AlertCircle size={13} className="text-rose-600 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Info Badge Ukuran Standar (Tidak tercetak) */}
      <div className="no-print mb-4 flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
        <Scissors size={12} className="text-slate-400" />
        <span>Ukuran Standar Internasional <strong>CR-80 / ID-1</strong> (85.6 mm × 54.0 mm) — Pas untuk ID Card Holder B2</span>
      </div>

      {/* AREA KARTU FISIK (Hanya ini yang tercetak saat Print) */}
      <div
        id="printable-card-area"
        className="flex flex-wrap gap-5 justify-center items-center w-full"
      >
        {/* ==================== KARTU TAMPAK DEPAN ==================== */}
        <div className="standard-id-card w-[340px] h-[214px] bg-gradient-to-br from-[#8ED0F2] via-[#C6EBFC] to-[#FFFFFF] text-slate-900 rounded-2xl p-3 shadow-xl border border-sky-300/80 relative flex flex-col justify-between overflow-hidden select-none">
          {/* Siluet Tut Wuri Handayani: CUKUP GARIS TEPI SAJA (Outline Watermark Transparan) */}
          <div className="absolute -right-3 -bottom-2 pointer-events-none select-none z-0 opacity-20">
            <img
              src="/images/tut-wuri-handayani-outline.svg"
              alt=""
              className="w-[185px] h-[185px] object-contain"
            />
          </div>

          {/* Pita Gelombang Biru Pengaman di Bagian Bawah (Security Wave Lines) */}
          <svg
            className="absolute bottom-0 left-0 w-full h-8 pointer-events-none opacity-90 z-0"
            viewBox="0 0 340 32"
            preserveAspectRatio="none"
            fill="none"
          >
            <path d="M0,16 C60,6 120,26 180,16 C240,6 300,26 340,16" stroke="#38BDF8" strokeWidth="0.8" />
            <path d="M0,19 C70,9 140,29 210,19 C270,9 315,25 340,19" stroke="#0284C7" strokeWidth="0.8" />
            <path d="M0,22 C50,12 110,30 170,21 C230,12 290,28 340,22" stroke="#0369A1" strokeWidth="0.8" />
            <path d="M0,25 C80,17 160,31 240,23 C290,17 320,27 340,25" stroke="#0284C7" strokeWidth="0.6" />
            <path d="M0,28 C90,20 180,32 270,24 C310,19 330,28 340,28" stroke="#38BDF8" strokeWidth="0.5" />
          </svg>

          {/* Header Kartu: Logo Tut Wuri Berwarna + Dinas Pendidikan + SDN Kandangan I Tosari */}
          <div className="bg-white/60 backdrop-blur-[2px] -mx-3 -mt-3 px-3 pt-2 pb-1.5 border-b border-sky-300/60 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <img
                src="/images/tut-wuri-handayani.svg"
                alt="Logo Tut Wuri Handayani"
                className="w-7 h-7 object-contain shrink-0 drop-shadow-sm"
              />
              <div className="leading-tight">
                <h4 className="text-[7px] font-extrabold text-blue-900 tracking-wider uppercase">
                  DINAS PENDIDIKAN DAN KEBUDAYAAN
                </h4>
                <h3 className="font-black text-[10.5px] tracking-wide text-blue-950 uppercase">
                  SDN KANDANGAN I TOSARI
                </h3>
                <p className="text-[6.5px] text-blue-800 leading-none">
                  Kec. Tosari, Kab. Pasuruan, Jawa Timur
                </p>
              </div>
            </div>
            <span className="text-[7.5px] bg-blue-600 text-white px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider shadow-sm shrink-0">
              {isTeacher ? "KARTU GURU" : "KARTU SISWA"}
            </span>
          </div>

          {/* Konten Utama Kartu */}
          <div className="flex items-center gap-2.5 my-auto z-10">
            {/* Bingkai Foto / Inisial (Dapat Diklik untuk Upload Foto) */}
            <div
              onClick={triggerPhotoUpload}
              className="group relative w-[60px] h-[76px] rounded-lg bg-white border-2 border-sky-400 flex flex-col items-center justify-center shrink-0 overflow-hidden shadow-md cursor-pointer hover:border-blue-600 transition"
              title="Klik untuk mengganti atau mengunggah foto"
            >
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={student.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-1">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs mx-auto mb-1 text-white shadow">
                    {(student.fullName || "S").trim().charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[7px] font-bold text-sky-800">FOTO</span>
                </div>
              )}

              {/* Overlay Hover Ubah Foto */}
              <div className="absolute inset-0 bg-blue-950/80 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                <Camera size={14} className="text-sky-300" />
                <span className="text-[6.5px] font-bold mt-0.5 tracking-tight">UBAH</span>
              </div>
            </div>

            {/* Identitas Siswa: CUKUP DIISI (Nama, NISN, NIS, Tempat dan tanggal lahir, Jenis kelamin) */}
            <div className="flex-1 min-w-0 pr-1">
              <h4 className="font-black text-[12.5px] text-blue-950 leading-tight break-words drop-shadow-sm">
                {student.fullName}
              </h4>

              <div className="mt-1 text-[8px] space-y-0.5">
                {/* 1. NISN */}
                <p className="flex items-center">
                  <span className="text-blue-900 font-bold w-[62px] shrink-0">NISN</span>
                  <span className="text-blue-900 mr-1">:</span>
                  <strong className="text-slate-900 font-black font-mono truncate text-[8.5px]">
                    {isTeacher ? "-" : student.nisn || "-"}
                  </strong>
                </p>

                {/* 2. NIS / NIP */}
                <p className="flex items-center">
                  <span className="text-blue-900 font-bold w-[62px] shrink-0">{isTeacher ? "NIP" : "NIS"}</span>
                  <span className="text-blue-900 mr-1">:</span>
                  <strong className="text-slate-900 font-black font-mono truncate text-[8.5px]">
                    {isTeacher ? student.nip || "-" : student.nis || "-"}
                  </strong>
                </p>

                {/* 3. Tempat Lahir */}
                <p className="flex items-center">
                  <span className="text-blue-900 font-bold w-[62px] shrink-0">Tempat Lahir</span>
                  <span className="text-blue-900 mr-1">:</span>
                  <span className="text-slate-900 font-bold truncate text-[8.5px]">
                    {student.birthPlace || "-"}
                  </span>
                </p>

                {/* 4. Tanggal Lahir */}
                <p className="flex items-center">
                  <span className="text-blue-900 font-bold w-[62px] shrink-0">Tanggal Lahir</span>
                  <span className="text-blue-900 mr-1">:</span>
                  <span className="text-slate-900 font-bold truncate text-[8.5px]">
                    {formatBirthDate(student.birthDate)}
                  </span>
                </p>

                {/* 5. Jenis Kelamin */}
                <p className="flex items-center">
                  <span className="text-blue-900 font-bold w-[62px] shrink-0">Jenis Kelamin</span>
                  <span className="text-blue-900 mr-1">:</span>
                  <span className="text-slate-900 font-bold truncate text-[8.5px]">
                    {formatGender(student.gender)}
                  </span>
                </p>
              </div>
            </div>

            {/* Kotak QR Code Resolusi Tajam */}
            <div className="bg-white p-1 rounded-xl shadow-md shrink-0 border border-sky-300">
              <img
                src={qrDataUrl}
                alt="QR Code"
                className="w-[70px] h-[70px] object-contain block"
              />
            </div>
          </div>

          {/* Footer Kartu */}
          <div className="pt-0.5 flex items-center justify-between text-[7px] text-blue-900 font-bold z-10">
            <span>Berlaku selama menjadi warga sekolah aktif</span>
            <span className="text-blue-950 font-black">Kecamatan Tosari</span>
          </div>
        </div>

        {/* ==================== KARTU TAMPAK BELAKANG ==================== */}
        <div className="standard-id-card w-[340px] h-[214px] bg-gradient-to-br from-[#8ED0F2] via-[#C6EBFC] to-[#FFFFFF] text-slate-900 rounded-2xl p-3 shadow-xl border border-sky-300/80 relative flex flex-col justify-between overflow-hidden select-none">
          {/* Watermark Siluet Tut Wuri Handayani Garis Tepi Saja Transparan */}
          <div className="absolute -right-3 -bottom-2 pointer-events-none select-none z-0 opacity-15">
            <img
              src="/images/tut-wuri-handayani-outline.svg"
              alt=""
              className="w-[185px] h-[185px] object-contain"
            />
          </div>

          {/* Pita Gelombang Biru Pengaman */}
          <svg
            className="absolute bottom-0 left-0 w-full h-8 pointer-events-none opacity-90 z-0"
            viewBox="0 0 340 32"
            preserveAspectRatio="none"
            fill="none"
          >
            <path d="M0,16 C60,6 120,26 180,16 C240,6 300,26 340,16" stroke="#38BDF8" strokeWidth="0.8" />
            <path d="M0,19 C70,9 140,29 210,19 C270,9 315,25 340,19" stroke="#0284C7" strokeWidth="0.8" />
            <path d="M0,22 C50,12 110,30 170,21 C230,12 290,28 340,22" stroke="#0369A1" strokeWidth="0.8" />
          </svg>

          <div className="z-10">
            <div className="border-b border-sky-300/80 pb-1.5 flex items-center justify-between">
              <h4 className="font-extrabold text-[9.5px] text-blue-950 uppercase tracking-wide">
                KETENTUAN KARTU ABSENSI RESMI
              </h4>
              <span className="text-[7.5px] text-blue-900 font-mono font-bold">TOSARI-01</span>
            </div>

            <ul className="mt-2 text-[8.5px] text-slate-800 space-y-1 list-disc list-inside leading-snug font-medium">
              <li>Kartu ini wajib dibawa setiap hari sekolah untuk pemindaian absensi QR Code.</li>
              <li>Pindai kartu kepada Guru Piket di gerbang sekolah sebelum batas jam masuk.</li>
              <li>Jangan melipat, merusak, membasahi, atau mencoret area QR Code kartu.</li>
              <li>Kartu hanya berlaku untuk pemilik identitas yang tertera (tidak dapat dipindahtangankan).</li>
              <li>Jika kartu hilang atau rusak, segera laporkan ke Admin Sekolah untuk token baru.</li>
            </ul>
          </div>

          <div className="pt-0.5 text-center text-[7.5px] text-blue-950 font-bold z-10">
            SDN Kandangan I Tosari • Kabupaten Pasuruan, Jawa Timur
          </div>
        </div>
      </div>
    </div>
  );
}
