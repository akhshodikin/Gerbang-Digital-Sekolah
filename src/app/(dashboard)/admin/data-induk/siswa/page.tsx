"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  Plus,
  Filter,
  RefreshCw,
  GraduationCap,
  Download,
  Upload,
  FileSpreadsheet,
  Phone,
  MessageCircle,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  User,
  Camera,
  Eye,
  Calendar,
} from "lucide-react";
import * as XLSX from "xlsx";
import { parseExcelDate, getRowValue } from "@/lib/utils/excel-date";

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Form Tambah / Edit Siswa
  const [editStudentId, setEditStudentId] = useState("");
  const [nis, setNis] = useState("");
  const [nisn, setNisn] = useState("");
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<"L" | "P">("L");
  const [classId, setClassId] = useState("");
  const [birthPlace, setBirthPlace] = useState("Pasuruan");
  const [birthDate, setBirthDate] = useState("2019-01-01");
  const [address, setAddress] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Data Orang Tua yang menyatu
  const [parentName, setParentName] = useState("");
  const [parentRelationship, setParentRelationship] = useState("Ayah");
  const [parentPhone, setParentPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [importError, setImportError] = useState("");
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [previewTotalRows, setPreviewTotalRows] = useState(0);

  const handleFileSelect = (file: File | null) => {
    setImportFile(file);
    setImportResult(null);
    setImportError("");
    setPreviewRows([]);
    setPreviewTotalRows(0);

    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const sheetName = workbook.SheetNames.includes("DATA_SISWA")
          ? "DATA_SISWA"
          : workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) return;

        const raw: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        setPreviewTotalRows(raw.length);

        const sample = raw.slice(0, 5).map((row, idx) => {
          const nis = String(
            getRowValue(row, "NIS", "nis", "Nomor Induk", "No Induk", "No. Induk", "Induk") || ""
          ).trim();
          const fullName = String(
            getRowValue(row, "Nama Lengkap Siswa", "Nama Lengkap", "Nama Siswa", "Nama", "fullName", "Peserta Didik") || ""
          ).trim();
          const className = String(
            getRowValue(row, "Kelas", "Rombel", "Rombongan Belajar", "className", "Tingkat") || ""
          ).trim();

          let birthPlace = String(
            getRowValue(row, "Tempat Lahir", "Tmpt Lahir", "Tempat", "Kota Lahir", "birthPlace") || ""
          ).trim();
          const birthDateRaw = getRowValue(
            row,
            "Tanggal Lahir (YYYY-MM-DD)",
            "Tanggal Lahir (DD/MM/YYYY)",
            "Tanggal Lahir",
            "Tgl Lahir",
            "Tgl. Lahir",
            "TGL LAHIR",
            "Tanggal_Lahir",
            "Tgl_Lahir",
            "birthDate",
            "DOB",
            "TTL",
            "Tgl"
          );

          let birthDateParsed: string | null = null;
          if (typeof birthDateRaw === "string" && birthDateRaw.includes(",")) {
            const parts = birthDateRaw.split(",");
            if (!birthPlace && parts[0].trim()) birthPlace = parts[0].trim();
            birthDateParsed = parseExcelDate(parts[1]?.trim());
          } else {
            birthDateParsed = parseExcelDate(birthDateRaw);
          }

          let parentName = String(
            getRowValue(
              row,
              "Nama Orang Tua / Wali",
              "Nama Orang Tua/Wali",
              "Nama Orang Tua",
              "Nama Ortu",
              "Nama Wali",
              "Nama Wali Murid",
              "Orang Tua / Wali",
              "Orang Tua/Wali",
              "Orang Tua",
              "Ortu",
              "Wali",
              "parentName"
            ) || ""
          ).trim();

          let parentRel = String(
            getRowValue(row, "Hubungan (Ayah/Ibu/Wali)", "Hubungan", "parentRelationship", "Status Hubungan") || "Orang Tua"
          ).trim();

          if (!parentName) {
            const ayah = String(getRowValue(row, "Nama Ayah", "Nama Ayah Kandung", "Ayah") || "").trim();
            const ibu = String(getRowValue(row, "Nama Ibu", "Nama Ibu Kandung", "Ibu") || "").trim();
            const wali = String(getRowValue(row, "Nama Wali", "Wali") || "").trim();
            if (ayah) { parentName = ayah; parentRel = "Ayah"; }
            else if (ibu) { parentName = ibu; parentRel = "Ibu"; }
            else if (wali) { parentName = wali; parentRel = "Wali"; }
          }

          const parentPhone = String(
            getRowValue(
              row,
              "No Telp / WA Orang Tua",
              "No Telp / WA",
              "No Telp Ortu",
              "No HP Ortu",
              "No WhatsApp Ortu",
              "No HP",
              "No WA",
              "No Telepon",
              "Nomor Telepon",
              "Telepon Ortu",
              "HP Ortu",
              "WA Ortu",
              "parentPhone",
              "Kontak Ortu",
              "No HP Ayah",
              "No HP Ibu"
            ) || ""
          ).trim().replace(/[^0-9]/g, "");

          return {
            rowNum: idx + 2,
            nis,
            fullName,
            className,
            birthPlace,
            birthDateParsed,
            birthDateRaw: String(birthDateRaw ?? ""),
            parentName,
            parentRel,
            parentPhone,
          };
        });

        setPreviewRows(sample);
      } catch (err) {
        console.warn("Gagal membaca preview Excel:", err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      let url = "/api/master/students";
      if (selectedClassId) url += `?classId=${selectedClassId}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setStudents(data.students);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/master/classes")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setClasses(d.classes);
      });
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [selectedClassId]);

  const resetForm = () => {
    setEditStudentId("");
    setNis("");
    setNisn("");
    setFullName("");
    setGender("L");
    setClassId(classes[0]?.id || "");
    setBirthPlace("Pasuruan");
    setBirthDate("2019-01-01");
    setAddress("");
    setPhotoUrl("");
    setParentName("");
    setParentRelationship("Ayah");
    setParentPhone("");
  };

  const openEditModal = (s: any) => {
    setEditStudentId(s.id);
    setNis(s.nis || "");
    setNisn(s.nisn || "");
    setFullName(s.fullName || "");
    setGender(s.gender || "L");
    setClassId(s.currentClassId || "");
    setBirthPlace(s.birthPlace || "Pasuruan");
    setBirthDate(s.birthDate || "");
    setAddress(s.address || "");
    setPhotoUrl(s.photoUrl || "");
    setParentName(s.parentName || "");
    setParentRelationship(s.parentRelationship || "Ayah");
    setParentPhone(s.parentPhone || "");
    setShowEditModal(true);
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Harap pilih berkas gambar (JPG, PNG, atau WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran berkas maksimal 5MB.");
      return;
    }

    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        setPhotoUrl(data.fileUrl);
      } else {
        alert(data.message || "Gagal mengunggah foto.");
      }
    } catch {
      alert("Terjadi kesalahan jaringan saat mengunggah foto.");
    } finally {
      setUploadingPhoto(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nis || !fullName) {
      alert("NIS dan Nama Lengkap wajib diisi!");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/master/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nis,
          nisn,
          fullName,
          gender,
          currentClassId: classId || null,
          birthPlace,
          birthDate,
          address,
          photoUrl: photoUrl || null,
          parentName: parentName.trim() || null,
          parentRelationship: parentRelationship || "Orang Tua",
          parentPhone: parentPhone.trim() || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setShowAddModal(false);
        resetForm();
        fetchStudents();
      } else {
        alert(data.message || "Gagal menyimpan data siswa.");
      }
    } catch (e) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStudentId || !nis || !fullName) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/master/students/${editStudentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nis,
          nisn,
          fullName,
          gender,
          currentClassId: classId || null,
          birthPlace,
          birthDate,
          address,
          photoUrl: photoUrl || null,
          parentName: parentName.trim() || null,
          parentRelationship: parentRelationship || "Orang Tua",
          parentPhone: parentPhone.trim() || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setShowEditModal(false);
        resetForm();
        fetchStudents();
      } else {
        alert(data.message || "Gagal memperbarui data siswa.");
      }
    } catch (e) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStudent = async (s: any) => {
    if (!confirm(`Apakah Anda yakin ingin menonaktifkan siswa ${s.fullName} (NIS: ${s.nis})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/master/students/${s.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchStudents();
      } else {
        alert(data.message || "Gagal menghapus siswa.");
      }
    } catch (e) {
      alert("Terjadi kesalahan jaringan.");
    }
  };

  // Unduh Data Siswa XLSX
  const handleDownloadXlsx = () => {
    let url = "/api/master/students/export-xlsx";
    if (selectedClassId) url += `?classId=${selectedClassId}`;
    window.open(url, "_blank");
  };

  // Unduh Template XLSX
  const handleDownloadTemplate = () => {
    window.open("/api/master/students/template-xlsx", "_blank");
  };

  // Import XLSX
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      alert("Pilih file Excel (.xlsx) terlebih dahulu.");
      return;
    }

    setImporting(true);
    setImportResult(null);
    setImportError("");

    try {
      const formData = new FormData();
      formData.append("file", importFile);

      const res = await fetch("/api/master/students/import-xlsx", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setImportResult(data);
        fetchStudents();
      } else {
        setImportError(data.message || "Gagal mengimpor file.");
      }
    } catch (e) {
      setImportError("Terjadi kesalahan saat mengunggah file.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Action Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-black text-slate-800">
            Data Induk Siswa & Orang Tua Terpadu
          </h1>
          <p className="text-xs text-slate-500">
            Pengelolaan biodata peserta didik, rombel, dan kontak WhatsApp orang tua/wali SDN Kandangan I Tosari
          </p>
        </div>

        {/* Toolbar Tombol */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 shadow-sm flex items-center gap-1.5 transition"
            title="Unduh format template Excel untuk pengisian data"
          >
            <Download size={14} /> Template XLSX
          </button>

          <button
            onClick={() => {
              setImportFile(null);
              setImportResult(null);
              setImportError("");
              setPreviewRows([]);
              setPreviewTotalRows(0);
              setShowImportModal(true);
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition"
          >
            <Upload size={14} /> Upload XLSX
          </button>

          <button
            onClick={handleDownloadXlsx}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition"
          >
            <FileSpreadsheet size={14} /> Download XLSX
          </button>

          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition"
          >
            <Plus size={15} /> Tambah Siswa
          </button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Filter size={15} className="text-blue-600" />
          <span>Filter Kelas:</span>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Semua Kelas</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Total: <span className="font-bold text-slate-800">{students.length}</span> siswa terdaftar
        </div>

        <button
          onClick={fetchStudents}
          className="ml-auto text-xs text-blue-700 font-semibold hover:underline flex items-center gap-1"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Table Siswa Terpadu dengan Data Orang Tua */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#0F2744] text-white text-[11px] uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3 px-3">No</th>
                <th className="py-3 px-3">NIS</th>
                <th className="py-3 px-3">NISN</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-2 text-center">L/P</th>
                <th className="py-3 px-3">Tempat, Tgl Lahir</th>
                <th className="py-3 px-3">Kelas</th>
                <th className="py-3 px-4 bg-[#1E3A8A]">Orang Tua / Wali</th>
                <th className="py-3 px-4 bg-[#1E3A8A]">No. HP / WhatsApp Ortu</th>
                <th className="py-3 px-3">Domisili</th>
                <th className="py-3 px-2 text-center">Status</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-400">
                    Memuat data siswa dan orang tua...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-400">
                    Tidak ada siswa terdaftar pada kelas ini.
                  </td>
                </tr>
              ) : (
                students.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 text-slate-500 font-semibold">{idx + 1}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-700">{s.nis}</td>
                    <td className="py-3 px-3 text-slate-500 text-xs font-mono">{s.nisn || "-"}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        {s.photoUrl ? (
                          <img
                            src={s.photoUrl}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {(s.fullName || "S").trim().charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span>{s.fullName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center font-bold text-slate-700">{s.gender}</td>
                    
                    {/* Tempat & Tanggal Lahir */}
                    <td className="py-3 px-3 text-slate-700 text-xs">
                      {s.birthPlace || s.birthDate ? (
                        <div>
                          <span className="font-semibold text-slate-800">{s.birthPlace || "-"}</span>
                          {s.birthDate && (
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {new Date(s.birthDate).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-xs">-</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-slate-600 font-medium">{s.className || "-"}</td>
                    
                    {/* Data Orang Tua Menyatu */}
                    <td className="py-3 px-4">
                      {s.parentName ? (
                        <div>
                          <span className="font-semibold text-slate-800">{s.parentName}</span>
                          <span className="ml-1.5 text-[10px] bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-medium">
                            {s.parentRelationship || "Orang Tua"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Belum ditautkan</span>
                      )}
                    </td>

                    {/* No HP / WhatsApp Ortu dengan Link Langsung */}
                    <td className="py-3 px-4">
                      {s.parentPhone ? (
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`https://wa.me/${s.parentPhone.replace(/^0/, "62")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-mono font-medium transition"
                            title="Kirim pesan WhatsApp langsung"
                          >
                            <MessageCircle size={12} className="text-emerald-600" />
                            <span>{s.parentPhone}</span>
                          </a>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-xs">-</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-slate-600 text-xs max-w-xs truncate">{s.address || "-"}</td>
                    <td className="py-3 px-2 text-center">
                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(s)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit Siswa & Orang Tua"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(s)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Hapus Siswa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Edit Siswa Terpadu */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  {showAddModal ? "Tambah Siswa & Kontak Orang Tua" : "Edit Biodata Siswa & Orang Tua"}
                </h3>
                <p className="text-xs text-slate-500">
                  Data peserta didik dan kontak orang tua terpadu SDN Kandangan I Tosari
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                }}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={showAddModal ? handleAddSubmit : handleEditSubmit} className="space-y-4">
              {/* Bagian A: Data Siswa */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-800 bg-blue-50 px-2.5 py-1.5 rounded-md mb-3 flex items-center gap-1.5">
                  <GraduationCap size={15} /> A. Biodata Siswa
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      NIS (Wajib):
                    </label>
                    <input
                      type="text"
                      required
                      value={nis}
                      onChange={(e) => setNis(e.target.value)}
                      placeholder="Contoh: 20260105"
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      NISN (10 Digit):
                    </label>
                    <input
                      type="text"
                      value={nisn}
                      onChange={(e) => setNisn(e.target.value)}
                      placeholder="Contoh: 0165789130"
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Lengkap Siswa (Wajib):
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nama lengkap sesuai akta / KK"
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Jenis Kelamin:
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as "L" | "P")}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="L">Laki-Laki (L)</option>
                      <option value="P">Perempuan (P)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Rombongan Belajar (Kelas):
                    </label>
                    <select
                      value={classId}
                      onChange={(e) => setClassId(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Pilih Kelas</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tempat Lahir:
                    </label>
                    <input
                      type="text"
                      value={birthPlace}
                      onChange={(e) => setBirthPlace(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tanggal Lahir:
                    </label>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Alamat Domisili Siswa:
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Dusun / RT / RW, Desa Kandangan, Tosari"
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Foto Siswa untuk Kartu Identitas */}
                  <div className="col-span-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Foto Siswa (Untuk Kartu Identitas Resmi)
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-14 rounded-lg border border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt="Foto Siswa"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="text-slate-400" size={24} />
                        )}
                      </div>
                      <div>
                        <label className="cursor-pointer bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition">
                          <Camera size={13} className="text-blue-600" />
                          <span>{uploadingPhoto ? "Mengunggah..." : photoUrl ? "Ganti Foto" : "Unggah Foto Siswa"}</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            disabled={uploadingPhoto}
                            onChange={handleUploadPhoto}
                            className="hidden"
                          />
                        </label>
                        {photoUrl && (
                          <button
                            type="button"
                            onClick={() => setPhotoUrl("")}
                            className="ml-2.5 text-xs text-rose-600 hover:underline font-semibold"
                          >
                            Hapus Foto
                          </button>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1">
                          Format: JPG, PNG, atau WebP (Maks. 5MB)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bagian B: Data Orang Tua / Wali */}
              <div className="pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-md mb-3 flex items-center gap-1.5">
                  <User size={15} /> B. Kontak Orang Tua / Wali Murid
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Orang Tua / Wali:
                    </label>
                    <input
                      type="text"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      placeholder="Nama ayah, ibu, atau wali"
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Hubungan Keluarga:
                    </label>
                    <select
                      value={parentRelationship}
                      onChange={(e) => setParentRelationship(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Ayah">Ayah</option>
                      <option value="Ibu">Ibu</option>
                      <option value="Wali">Wali</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      No. Telp / WhatsApp Orang Tua (Aktif Notifikasi):
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-slate-400">
                        <Phone size={13} />
                      </span>
                      <input
                        type="text"
                        value={parentPhone}
                        onChange={(e) => setParentPhone(e.target.value)}
                        placeholder="Contoh: 081234567890"
                        className="w-full pl-8 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Nomor ini digunakan untuk mengirimkan notifikasi absensi masuk, terlambat, dan perizinan.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg shadow-sm transition"
                >
                  {submitting ? "Menyimpan..." : showAddModal ? "Simpan Siswa & Orang Tua" : "Perbarui Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Upload & Import XLSX */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-slate-800">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Upload & Impor Data Siswa (XLSX)</h3>
                  <p className="text-[11px] text-slate-500">Format file Microsoft Excel (.xlsx)</p>
                </div>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
                <div className="font-bold">Ketentuan Pengunggahan File:</div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-700">
                  <li>Gunakan format template resmi yang dapat diunduh melalui tombol <strong>Template XLSX</strong>.</li>
                  <li>Kolom <strong>NIS</strong> dan <strong>Nama Lengkap Siswa</strong> wajib terisi.</li>
                  <li><strong>Tanggal Lahir</strong> mendukung format standar Excel, YYYY-MM-DD, maupun DD/MM/YYYY.</li>
                  <li><strong>Nama Orang Tua</strong> otomatis tersimpan dan ditautkan (meskipun nomor WhatsApp belum diisi).</li>
                  <li>Token QR Code absensi akan langsung dibuatkan untuk siswa yang baru diimpor.</li>
                </ul>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Berkas Excel (.xlsx):
                </label>
                <input
                  type="file"
                  required
                  accept=".xlsx, .xls"
                  onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-300 rounded-xl p-1.5 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Pratinjau Deteksi Data Excel */}
              {previewRows.length > 0 && (
                <div className="border border-blue-200 bg-blue-50/40 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-900 flex items-center gap-1.5">
                      <Eye size={14} className="text-blue-600" /> Pratinjau Deteksi Data (5 Baris Pertama)
                    </span>
                    <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded text-[11px]">
                      Total {previewTotalRows} Siswa Terbaca
                    </span>
                  </div>

                  <div className="overflow-x-auto bg-white rounded-lg border border-slate-200 shadow-sm max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="py-2 px-2.5">Baris</th>
                          <th className="py-2 px-2.5">NIS & Nama Siswa</th>
                          <th className="py-2 px-2.5">Kelas</th>
                          <th className="py-2 px-2.5 bg-sky-50 text-sky-900">Tanggal Lahir (Hasil Deteksi)</th>
                          <th className="py-2 px-2.5 bg-emerald-50 text-emerald-900">Nama Orang Tua (Hasil Deteksi)</th>
                          <th className="py-2 px-2.5">No. HP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewRows.map((r) => (
                          <tr key={r.rowNum} className="hover:bg-slate-50">
                            <td className="py-2 px-2.5 font-mono text-slate-400">{r.rowNum}</td>
                            <td className="py-2 px-2.5">
                              <div className="font-bold text-slate-800">{r.fullName || "-"}</div>
                              <div className="text-[10px] text-slate-500 font-mono">NIS: {r.nis || "-"}</div>
                            </td>
                            <td className="py-2 px-2.5 text-slate-600">{r.className || "-"}</td>
                            <td className="py-2 px-2.5 bg-sky-50/60">
                              {r.birthDateParsed ? (
                                <div className="flex items-center gap-1 text-sky-900 font-medium">
                                  <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                                  <span>{r.birthDateParsed}</span>
                                  {r.birthPlace && (
                                    <span className="text-slate-500 text-[10px]">({r.birthPlace})</span>
                                  )}
                                </div>
                              ) : r.birthDateRaw ? (
                                <span className="text-amber-700 text-[10px] italic">
                                  Raw: {r.birthDateRaw}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic text-[10px]">Kosong</span>
                              )}
                            </td>
                            <td className="py-2 px-2.5 bg-emerald-50/60">
                              {r.parentName ? (
                                <div className="flex items-center gap-1 text-emerald-900 font-medium">
                                  <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                                  <span>{r.parentName}</span>
                                  <span className="text-[10px] text-emerald-700 font-normal">
                                    ({r.parentRel})
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[10px]">Kosong</span>
                              )}
                            </td>
                            <td className="py-2 px-2.5 font-mono text-slate-600 text-[10px]">
                              {r.parentPhone || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {importError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {importResult && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 size={16} />
                    <span>{importResult.message}</span>
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    Siswa Baru: {importResult.successCount} | Diperbarui: {importResult.updatedCount} | Gagal: {importResult.errorCount}
                  </div>
                  {importResult.errors?.length > 0 && (
                    <div className="max-h-24 overflow-y-auto bg-white/70 p-2 rounded text-[10px] text-red-700 font-mono space-y-0.5">
                      {importResult.errors.map((err: any, i: number) => (
                        <div key={i}>Baris {err.row}: {err.error}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={importing || !importFile}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg shadow-sm transition flex items-center gap-1.5"
                >
                  {importing ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Mengimpor...
                    </>
                  ) : (
                    <>
                      <Upload size={14} /> Proses Impor XLSX
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
