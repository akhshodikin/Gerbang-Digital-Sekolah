"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Users,
  Plus,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  Check,
  AlertCircle,
  Edit3,
  Trash2,
  Search,
  Filter,
  Shield,
  KeyRound,
  GraduationCap,
  Phone,
  Mail,
  X,
  RefreshCw,
} from "lucide-react";

interface Teacher {
  id: string;
  schoolId: string;
  userId?: string | null;
  nip?: string | null;
  fullName: string;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  position?: string | null;
  status?: string | null;
  isActive: boolean;
  photoUrl?: string | null;
  username?: string | null;
  userIsActive?: boolean | null;
  homeroomClassId?: string | null;
  homeroomClassName?: string | null;
  gradeLevel?: number | null;
}

interface SchoolClass {
  id: string;
  name: string;
  gradeLevel: number;
  homeroomTeacherId?: string | null;
}

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterWali, setFilterWali] = useState("ALL");

  // Modal Tambah / Edit
  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  // Form State
  const [fullName, setFullName] = useState("");
  const [nip, setNip] = useState("");
  const [gender, setGender] = useState<"L" | "P">("L");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [position, setPosition] = useState("Guru Kelas");
  const [status, setStatus] = useState("PNS");
  const [address, setAddress] = useState("");
  const [homeroomClassId, setHomeroomClassId] = useState("");
  const [createAccount, setCreateAccount] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("guru123");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Modal Upload XLSX
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Notifikasi Flash
  const [flashMessage, setFlashMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/master/teachers");
      const data = await res.json();
      if (data.success) {
        setTeachers(data.teachers || []);
        if (data.classes) setClasses(data.classes);
      }
    } catch (e) {
      console.error("Fetch teachers error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const showFlash = (type: "success" | "error", text: string) => {
    setFlashMessage({ type, text });
    setTimeout(() => setFlashMessage(null), 4000);
  };

  // Buka Modal Tambah
  const openAddModal = () => {
    setEditingTeacher(null);
    setFullName("");
    setNip("");
    setGender("L");
    setPhone("");
    setEmail("");
    setPosition("Guru Kelas");
    setStatus("PNS");
    setAddress("");
    setHomeroomClassId("");
    setCreateAccount(true);
    setUsername("");
    setPassword("guru123");
    setFormError("");
    setShowModal(true);
  };

  // Buka Modal Edit
  const openEditModal = (t: Teacher) => {
    setEditingTeacher(t);
    setFullName(t.fullName || "");
    setNip(t.nip || "");
    setGender((t.gender as "L" | "P") || "L");
    setPhone(t.phone || "");
    setEmail(t.email || "");
    setPosition(t.position || "Guru Kelas");
    setStatus(t.status || "PNS");
    setAddress(t.address || "");
    setHomeroomClassId(t.homeroomClassId || "");
    setCreateAccount(Boolean(t.username));
    setUsername(t.username || "");
    setPassword("");
    setFormError("");
    setShowModal(true);
  };

  // Auto-generate saran username saat pilih kelas
  const handleClassChange = (selectedClassId: string) => {
    setHomeroomClassId(selectedClassId);
    if (selectedClassId) {
      setCreateAccount(true);
      const cls = classes.find((c) => c.id === selectedClassId);
      if (cls && (!username || username.startsWith("walikelas"))) {
        setUsername(`walikelas${cls.gradeLevel}`);
      }
    }
  };

  // Submit Tambah / Edit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setFormError("Nama lengkap guru wajib diisi.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const payload: any = {
        fullName: fullName.trim(),
        nip: nip.trim() || null,
        gender,
        phone: phone.trim() || null,
        email: email.trim() || null,
        position: position.trim() || "Guru Kelas",
        status,
        address: address.trim() || null,
        homeroomClassId: homeroomClassId || null,
        createAccount,
        username: username.trim() || null,
      };

      if (editingTeacher) {
        if (password.trim()) {
          payload.newPassword = password.trim();
        }
        const res = await fetch(`/api/master/teachers/${editingTeacher.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          showFlash("success", data.message || "Data guru berhasil diperbarui.");
          setShowModal(false);
          fetchTeachers();
        } else {
          setFormError(data.message || "Gagal memperbarui data guru.");
        }
      } else {
        if (password.trim()) {
          payload.password = password.trim();
        }
        const res = await fetch("/api/master/teachers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          showFlash("success", data.message || "Data guru berhasil ditambahkan.");
          setShowModal(false);
          fetchTeachers();
        } else {
          setFormError(data.message || "Gagal menyimpan data guru.");
        }
      }
    } catch (err: any) {
      console.error(err);
      setFormError("Terjadi gangguan jaringan.");
    } finally {
      setSubmitting(false);
    }
  };

  // Hapus Guru
  const handleDeleteTeacher = async (teacher: Teacher) => {
    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus data dewan guru: ${teacher.fullName}?`
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/master/teachers/${teacher.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showFlash("success", data.message || "Data guru berhasil dihapus.");
        fetchTeachers();
      } else {
        showFlash("error", data.message || "Gagal menghapus data guru.");
      }
    } catch {
      showFlash("error", "Terjadi kesalahan koneksi.");
    }
  };

  // Download Data XLSX
  const handleDownloadXlsx = () => {
    window.open("/api/master/teachers/export-xlsx", "_blank");
  };

  // Download Template XLSX
  const handleDownloadTemplate = () => {
    window.location.href = "/api/master/teachers/template-xlsx";
  };

  // Upload File XLSX Submit
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      alert("Harap pilih file Excel (.xlsx) terlebih dahulu.");
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);

      const res = await fetch("/api/master/teachers/import-xlsx", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setUploadResult(data);

      if (data.success) {
        showFlash("success", data.message);
        fetchTeachers();
      }
    } catch (err) {
      console.error("Upload error:", err);
      setUploadResult({
        success: false,
        message: "Terjadi kesalahan saat memproses unggahan file Excel.",
      });
    } finally {
      setUploading(false);
    }
  };

  // Filter & Search Logic
  const filteredTeachers = teachers.filter((t) => {
    const query = searchQuery.toLowerCase();
    const matchSearch =
      t.fullName?.toLowerCase().includes(query) ||
      t.nip?.toLowerCase().includes(query) ||
      t.username?.toLowerCase().includes(query) ||
      t.position?.toLowerCase().includes(query) ||
      t.homeroomClassName?.toLowerCase().includes(query);

    const matchStatus =
      filterStatus === "ALL" || (t.status || "").toUpperCase() === filterStatus;

    const matchWali =
      filterWali === "ALL" ||
      (filterWali === "WALI" && Boolean(t.homeroomClassId)) ||
      (filterWali === "NON_WALI" && !t.homeroomClassId);

    return matchSearch && matchStatus && matchWali;
  });

  // Statistik Cepat
  const totalWaliKelas = teachers.filter((t) => Boolean(t.homeroomClassId)).length;
  const totalPns = teachers.filter((t) => (t.status || "").toUpperCase() === "PNS").length;
  const totalPppk = teachers.filter((t) => (t.status || "").toUpperCase() === "PPPK").length;
  const totalHonorer = teachers.filter((t) => (t.status || "").toUpperCase() === "HONORER").length;

  return (
    <div className="space-y-6">
      {/* Flash Alert */}
      {flashMessage && (
        <div
          className={`px-4 py-3 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-sm animate-fadeIn ${
            flashMessage.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-800"
              : "bg-rose-50 border-rose-300 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {flashMessage.type === "success" ? (
              <Check size={16} className="text-emerald-600" />
            ) : (
              <AlertCircle size={16} className="text-rose-600" />
            )}
            <span>{flashMessage.text}</span>
          </div>
          <button onClick={() => setFlashMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Top Header & Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-600 text-white tracking-wider">
              GDS
            </span>
            <span className="text-xs font-bold text-blue-900">
              : Gerbang Digital Sekolah
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            Data Dewan Guru & Tenaga Kependidikan
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengelolaan biodata pendidik, penugasan wali kelas, dan akun login resmi SDN Kandangan I Tosari
          </p>
        </div>

        {/* Action Buttons: Download, Upload, Tambah */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Download Data XLSX */}
          <button
            onClick={handleDownloadXlsx}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm flex items-center gap-1.5 transition active:scale-95"
            title="Download seluruh data guru ke format Excel (.xlsx)"
          >
            <Download size={14} />
            <span>Download XLSX</span>
          </button>

          {/* Download Template XLSX */}
          <button
            onClick={handleDownloadTemplate}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold px-3 py-2 rounded-xl shadow-sm flex items-center gap-1.5 transition active:scale-95"
            title="Download template Excel kosong untuk impor data guru"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>Template XLSX</span>
          </button>

          {/* Upload Data XLSX */}
          <button
            onClick={() => {
              setUploadFile(null);
              setUploadResult(null);
              setShowUploadModal(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm flex items-center gap-1.5 transition active:scale-95"
            title="Unggah berkas Excel untuk impor atau perbarui data guru massal"
          >
            <Upload size={14} />
            <span>Upload XLSX</span>
          </button>

          {/* Tambah Guru Baru */}
          <button
            onClick={openAddModal}
            className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm flex items-center gap-1.5 transition active:scale-95"
          >
            <Plus size={15} />
            <span>Tambah Guru Baru</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
            <Users size={18} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500">Total Dewan Guru</div>
            <div className="text-lg font-black text-slate-800">{teachers.length} Orang</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <GraduationCap size={18} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500">Wali Kelas Aktif</div>
            <div className="text-lg font-black text-slate-800">{totalWaliKelas} Kelas</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 shrink-0">
            <Shield size={18} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500">Status PNS</div>
            <div className="text-lg font-black text-slate-800">{totalPns} Orang</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
            <KeyRound size={18} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500">PPPK & Honorer</div>
            <div className="text-lg font-black text-slate-800">{totalPppk + totalHonorer} Orang</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={15} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, NIP, akun login, atau jabatan..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Filter Status Kepegawaian */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter size={13} className="text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-slate-300 rounded-lg py-1.5 px-2 bg-slate-50 text-xs font-semibold focus:ring-2 focus:ring-blue-600"
            >
              <option value="ALL">Semua Status</option>
              <option value="PNS">PNS</option>
              <option value="PPPK">PPPK</option>
              <option value="HONORER">Honorer / GTT</option>
            </select>
          </div>

          {/* Filter Wali Kelas */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <select
              value={filterWali}
              onChange={(e) => setFilterWali(e.target.value)}
              className="border border-slate-300 rounded-lg py-1.5 px-2 bg-slate-50 text-xs font-semibold focus:ring-2 focus:ring-blue-600"
            >
              <option value="ALL">Semua Tugas</option>
              <option value="WALI">Hanya Wali Kelas</option>
              <option value="NON_WALI">Bukan Wali Kelas</option>
            </select>
          </div>

          <button
            onClick={fetchTeachers}
            className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-600"
            title="Muat ulang data"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Tabel Data Dewan Guru */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#0F2744] text-white text-[11px] uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3.5 px-3.5 text-center w-12">No</th>
                <th className="py-3.5 px-4">Nama Lengkap & Gelar</th>
                <th className="py-3.5 px-3.5">NIP</th>
                <th className="py-3.5 px-3 text-center">L/P</th>
                <th className="py-3.5 px-4">Jabatan / Tugas</th>
                <th className="py-3.5 px-3.5">Status</th>
                <th className="py-3.5 px-4">Wali Kelas</th>
                <th className="py-3.5 px-4">Akun Login Sistem</th>
                <th className="py-3.5 px-3.5">Kontak</th>
                <th className="py-3.5 px-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Memuat data dewan guru & tenaga kependidikan...</span>
                  </td>
                </tr>
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Users size={28} className="mx-auto mb-2 text-slate-300" />
                    <span>Tidak ada data guru yang sesuai dengan pencarian atau filter.</span>
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((t, idx) => (
                  <tr key={t.id} className="hover:bg-blue-50/40 transition">
                    <td className="py-3 px-3.5 text-center font-bold text-slate-400">{idx + 1}</td>
                    
                    {/* Nama Lengkap & Gelar */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-700 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                          {t.fullName.trim().charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 leading-tight">{t.fullName}</div>
                          {t.address && (
                            <div className="text-[10.5px] text-slate-400 truncate max-w-xs">{t.address}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* NIP */}
                    <td className="py-3 px-3.5 font-mono text-xs text-slate-700 font-semibold">
                      {t.nip || "-"}
                    </td>

                    {/* L/P */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10.5px] font-bold ${
                          t.gender === "P"
                            ? "bg-rose-100 text-rose-700 border border-rose-200"
                            : "bg-blue-100 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {t.gender || "L"}
                      </span>
                    </td>

                    {/* Jabatan / Tugas */}
                    <td className="py-3 px-4 text-slate-800 font-medium">
                      {t.position || "Guru Kelas"}
                    </td>

                    {/* Status Kepegawaian */}
                    <td className="py-3 px-3.5">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          t.status === "PNS"
                            ? "bg-sky-100 text-sky-800 border border-sky-300"
                            : t.status === "PPPK"
                            ? "bg-purple-100 text-purple-800 border border-purple-300"
                            : "bg-amber-100 text-amber-800 border border-amber-300"
                        }`}
                      >
                        {t.status || "PNS"}
                      </span>
                    </td>

                    {/* Penugasan Wali Kelas */}
                    <td className="py-3 px-4">
                      {t.homeroomClassName ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold">
                          <GraduationCap size={13} className="text-emerald-600" />
                          <span>{t.homeroomClassName}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">-</span>
                      )}
                    </td>

                    {/* Akun Login Sistem */}
                    <td className="py-3 px-4">
                      {t.username ? (
                        <div className="flex flex-col">
                          <div className="inline-flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-blue-900 bg-blue-100/70 border border-blue-300 px-2 py-0.5 rounded">
                              {t.username}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full">
                              Aktif
                            </span>
                          </div>
                          {t.homeroomClassName && (
                            <span className="text-[9.5px] text-slate-500 mt-0.5">
                              Login Wali {t.homeroomClassName}
                            </span>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => openEditModal(t)}
                          className="text-[11px] text-blue-700 hover:text-blue-900 font-semibold underline decoration-dotted flex items-center gap-1"
                          title="Klik untuk membuatkan akun login guru"
                        >
                          <Plus size={12} /> Buatkan Akun
                        </button>
                      )}
                    </td>

                    {/* Nomor Kontak */}
                    <td className="py-3 px-3.5 text-xs text-slate-600">
                      {t.phone ? (
                        <a
                          href={`https://wa.me/${t.phone.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 hover:underline"
                        >
                          <Phone size={12} /> {t.phone}
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="py-3 px-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(t)}
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition"
                          title="Edit biodata & penugasan wali kelas"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteTeacher(t)}
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition"
                          title="Hapus data guru"
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

      {/* ========================================================================= */}
      {/* MODAL 1: TAMBAH / EDIT DEWAN GURU & WALI KELAS */}
      {/* ========================================================================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">
                  {editingTeacher ? "Edit Data Guru & Akun Login" : "Tambah Data Dewan Guru Baru"}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingTeacher
                    ? "Perbarui informasi pendidik, tugas wali kelas, atau kata sandi akun."
                    : "Lengkapi data pendidik. QR Code & Akun Login akan otomatis disiapkan."}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={15} className="text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Nama Lengkap & Gelar */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap & Gelar <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Siti Rahmawati, S.Pd"
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              {/* NIP & Jenis Kelamin */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    NIP (Nomor Induk Pegawai)
                  </label>
                  <input
                    type="text"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="18 digit NIP..."
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jenis Kelamin <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as "L" | "P")}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>

              {/* Jabatan & Status Kepegawaian */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jabatan / Tugas Mengajar
                  </label>
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="Guru Kelas 1 / PJOK"
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status Kepegawaian
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="PNS">PNS</option>
                    <option value="PPPK">PPPK</option>
                    <option value="HONORER">Honorer / GTT / PTT</option>
                  </select>
                </div>
              </div>

              {/* Penugasan Wali Kelas */}
              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200">
                <label className="block text-xs font-extrabold text-blue-900 mb-1 flex items-center gap-1.5">
                  <GraduationCap size={15} className="text-blue-700" />
                  <span>Penugasan Wali Kelas Binaan</span>
                </label>
                <select
                  value={homeroomClassId}
                  onChange={(e) => handleClassChange(e.target.value)}
                  className="w-full border border-blue-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="">-- Bukan Wali Kelas (Guru Mata Pelajaran / Staf) --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Tingkat {c.gradeLevel})
                    </option>
                  ))}
                </select>
                <p className="text-[10.5px] text-blue-800 mt-1 leading-tight">
                  Jika dipilih, guru ini akan ditugaskan sebagai wali kelas dan dapat memantau serta mengelola kehadiran peserta didik di kelas tersebut.
                </p>
              </div>

              {/* Akun Login Pengguna */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                    <KeyRound size={14} className="text-blue-600" />
                    <span>Akun Login Portal Absensi</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createAccount}
                      onChange={(e) => setCreateAccount(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Aktifkan Akun</span>
                  </label>
                </div>

                {createAccount && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Username Login
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Contoh: walikelas1"
                        className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {editingTeacher ? "Reset Password (Opsional)" : "Password Login"}
                      </label>
                      <input
                        type="text"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={editingTeacher ? "Biarkan kosong jika tetap" : "Default: guru123"}
                        className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Kontak & Alamat */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">No. WhatsApp / HP</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0812xxxxxxxx"
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="guru@sdnkandangan1.sch.id"
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Domisili</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Dusun Krajan, Desa Kandangan, Tosari"
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Tombol Aksi Modal */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>{editingTeacher ? "Simpan Perubahan" : "Simpan Data Guru"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: UPLOAD BERKAS EXCEL (IMPORT XLSX) */}
      {/* ========================================================================= */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                  <Upload size={16} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">
                    Import Data Guru (XLSX)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Unggah file Excel untuk menambah atau memperbarui data secara massal
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Petunjuk & Download Template */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                <p className="font-bold mb-1 flex items-center gap-1.5">
                  <FileSpreadsheet size={14} className="text-amber-700" />
                  Format Template Resmi
                </p>
                <p className="text-[11px] text-amber-800">
                  Gunakan template Excel resmi agar kolom data, penugasan wali kelas, dan pembuatan akun login terbaca dengan akurat.
                </p>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="mt-2 text-[11px] font-bold text-blue-700 hover:underline flex items-center gap-1"
                >
                  <Download size={12} /> Unduh Format Template Guru (.xlsx)
                </button>
              </div>

              {/* Area File Picker */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50 hover:bg-blue-50/50 transition group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setUploadFile(f);
                  }}
                />
                <FileSpreadsheet
                  size={32}
                  className="mx-auto mb-2 text-slate-400 group-hover:text-blue-600 transition"
                />
                {uploadFile ? (
                  <div>
                    <p className="text-xs font-bold text-slate-800">{uploadFile.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {(uploadFile.size / 1024).toFixed(1)} KB — Siap diunggah
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-bold text-slate-700">
                      Klik untuk memilih file Excel (.xlsx)
                    </p>
                    <p className="text-[10.5px] text-slate-400 mt-0.5">
                      Maksimal ukuran berkas 5MB
                    </p>
                  </div>
                )}
              </div>

              {/* Hasil Unggahan */}
              {uploadResult && (
                <div
                  className={`p-3 rounded-xl border text-xs leading-relaxed ${
                    uploadResult.success
                      ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                      : "bg-rose-50 border-rose-300 text-rose-800"
                  }`}
                >
                  <p className="font-bold">{uploadResult.message}</p>
                  {uploadResult.success && (
                    <div className="mt-1 text-[11px] space-y-0.5">
                      <p>• Data baru ditambahkan: <strong>{uploadResult.importedCount}</strong> guru</p>
                      <p>• Data diperbarui: <strong>{uploadResult.updatedCount}</strong> guru</p>
                    </div>
                  )}
                  {uploadResult.errors && uploadResult.errors.length > 0 && (
                    <div className="mt-2 text-[10.5px] text-rose-700 border-t border-rose-200 pt-1.5">
                      <p className="font-bold">Rincian catatan baris:</p>
                      <ul className="list-disc list-inside max-h-24 overflow-y-auto">
                        {uploadResult.errors.map((err: any, i: number) => (
                          <li key={i}>
                            Baris {err.row}: {err.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Tombol Aksi */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile || uploading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5"
                >
                  {uploading ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Mengimpor Data...</span>
                    </>
                  ) : (
                    <span>Proses Impor Excel</span>
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
