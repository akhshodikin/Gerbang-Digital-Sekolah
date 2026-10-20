"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Link as LinkIcon,
  Edit2,
  Trash2,
  Phone,
  MessageCircle,
  User,
  Search,
  X,
  Briefcase,
  MapPin,
  GraduationCap,
  Unlink,
} from "lucide-react";

export default function AdminGuardiansPage() {
  const [guardians, setGuardians] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal Verifikasi Relasi
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedGuardianId, setSelectedGuardianId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [verificationNotes, setVerificationNotes] = useState("");

  // Modal Tambah Wali Murid Baru
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newRelationship, setNewRelationship] = useState("Ayah");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newOccupation, setNewOccupation] = useState("");
  const [newStudentIdToLink, setNewStudentIdToLink] = useState("");

  // Modal Edit Wali Murid
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState("");
  const [editFullName, setEditFullName] = useState("");
  const [editRelationship, setEditRelationship] = useState("Ayah");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editOccupation, setEditOccupation] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const fetchGuardians = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/master/guardians");
      const data = await res.json();
      if (data.success) setGuardians(data.guardians);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuardians();
    fetch("/api/master/students")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStudents(d.students);
      });
  }, []);

  // 1. Tambah Wali Murid Baru
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim()) {
      alert("Nama lengkap wali murid wajib diisi.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/master/guardians", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: newFullName.trim(),
          relationship: newRelationship,
          phone: newPhone.trim() || "-",
          address: newAddress.trim() || null,
          occupation: newOccupation.trim() || null,
          studentId: newStudentIdToLink || undefined,
          notes: "Diverifikasi saat penambahan profil wali murid",
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setShowCreateModal(false);
        setNewFullName("");
        setNewRelationship("Ayah");
        setNewPhone("");
        setNewAddress("");
        setNewOccupation("");
        setNewStudentIdToLink("");
        fetchGuardians();
      } else {
        alert(data.message || "Gagal menambahkan wali murid.");
      }
    } catch {
      alert("Terjadi gangguan jaringan saat menyimpan wali murid.");
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Buka Modal Edit Wali Murid
  const openEditModal = (g: any) => {
    setEditId(g.id);
    setEditFullName(g.fullName || "");
    setEditRelationship(g.relationship || "Ayah");
    setEditPhone(g.phone === "-" ? "" : g.phone || "");
    setEditAddress(g.address || "");
    setEditOccupation(g.occupation || "");
    setShowEditModal(true);
  };

  // 3. Simpan Perubahan Edit Wali Murid
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId || !editFullName.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/master/guardians/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: editFullName.trim(),
          relationship: editRelationship,
          phone: editPhone.trim() || "-",
          address: editAddress.trim() || null,
          occupation: editOccupation.trim() || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setShowEditModal(false);
        fetchGuardians();
      } else {
        alert(data.message || "Gagal memperbarui data wali murid.");
      }
    } catch {
      alert("Terjadi gangguan jaringan saat menyimpan perubahan.");
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Hapus Wali Murid
  const handleDeleteGuardian = async (g: any) => {
    const confirmMsg =
      g.children && g.children.length > 0
        ? `Apakah Anda yakin ingin menghapus data wali murid ${g.fullName}?\n\nPeringatan: Terdapat ${g.children.length} siswa yang saat ini terhubung ke akun ini. Tautan verifikasi siswa juga akan dihapus.`
        : `Apakah Anda yakin ingin menghapus data wali murid ${g.fullName}?`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/master/guardians/${g.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchGuardians();
      } else {
        alert(data.message || "Gagal menghapus data wali murid.");
      }
    } catch {
      alert("Terjadi kesalahan jaringan saat menghapus wali murid.");
    }
  };

  // 5. Putus Relasi Siswa Tertentu dari Wali Murid
  const handleDeleteRelation = async (guardianId: string, studentId: string, studentName: string) => {
    if (!confirm(`Putuskan hubungan verifikasi siswa "${studentName}" dari akun wali murid ini?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/master/guardians?guardianId=${guardianId}&studentId=${studentId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchGuardians();
      } else {
        alert(data.message || "Gagal memutuskan relasi siswa.");
      }
    } catch {
      alert("Terjadi gangguan koneksi saat memutuskan relasi.");
    }
  };

  // 6. Verifikasi Relasi Baru
  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuardianId || !selectedStudentId) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/master/guardians", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guardianId: selectedGuardianId,
          studentId: selectedStudentId,
          notes: verificationNotes || "Diverifikasi pihak sekolah",
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setShowLinkModal(false);
        setVerificationNotes("");
        fetchGuardians();
      } else {
        alert(data.message || "Gagal menghubungkan relasi.");
      }
    } catch {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter pencarian
  const filteredGuardians = guardians.filter((g) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchName = g.fullName?.toLowerCase().includes(q);
    const matchPhone = g.phone?.includes(q);
    const matchRel = g.relationship?.toLowerCase().includes(q);
    const matchChild = g.children?.some(
      (c: any) => c.studentName?.toLowerCase().includes(q) || c.studentNis?.includes(q)
    );
    return matchName || matchPhone || matchRel || matchChild;
  });

  const totalVerifiedChildren = guardians.reduce(
    (acc, cur) => acc + (cur.children ? cur.children.length : 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-black text-slate-800">
            Wali Murid & Verifikasi Relasi Siswa
          </h1>
          <p className="text-xs text-slate-500">
            Manajemen identitas orang tua/wali dan verifikasi sah hubungan kekeluargaan siswa SDN Kandangan I Tosari
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-sm flex items-center gap-1.5 transition"
          >
            <Plus size={15} /> Tambah Wali Murid
          </button>

          <button
            onClick={() => {
              setSelectedGuardianId("");
              setSelectedStudentId("");
              setVerificationNotes("");
              setShowLinkModal(true);
            }}
            className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-sm flex items-center gap-1.5 transition"
          >
            <LinkIcon size={15} /> Verifikasi Relasi Siswa
          </button>
        </div>
      </div>

      {/* Filter & Metric Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama wali, no. telepon, atau nama siswa..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="text-slate-600">
            Total: <span className="font-bold text-slate-900">{guardians.length}</span> Wali Murid
          </div>
          <div className="text-slate-600">
            Terhubung: <span className="font-bold text-emerald-700">{totalVerifiedChildren}</span> Siswa
          </div>
          <button
            onClick={fetchGuardians}
            className="text-xs text-blue-700 font-semibold hover:underline flex items-center gap-1 ml-auto"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Grid of Guardians and their verified children */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 py-12 text-center text-slate-400 text-xs">
            <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-blue-600" />
            Memuat data wali murid dan relasi siswa...
          </div>
        ) : filteredGuardians.length === 0 ? (
          <div className="col-span-2 py-12 text-center bg-white rounded-2xl border border-slate-200 p-8 text-slate-400 text-xs">
            {searchQuery
              ? `Tidak ditemukan wali murid yang cocok dengan kata kunci "${searchQuery}".`
              : "Belum ada data wali murid terdaftar. Klik tombol Tambah Wali Murid untuk memulai."}
          </div>
        ) : (
          filteredGuardians.map((g) => (
            <div
              key={g.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 hover:border-blue-300 transition"
            >
              {/* Card Header: Profil Wali & Tombol Aksi Edit/Hapus */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm shrink-0">
                    {(g.fullName || "W").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                        {g.fullName}
                      </h3>
                      <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                        {g.relationship}
                      </span>
                    </div>

                    {/* No Telp / WhatsApp */}
                    <div className="mt-1 flex items-center gap-2">
                      {g.phone && g.phone !== "-" ? (
                        <a
                          href={`https://wa.me/${g.phone.replace(/^0/, "62").replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md transition"
                          title="Hubungi melalui WhatsApp"
                        >
                          <MessageCircle size={12} className="text-emerald-600" />
                          <span>{g.phone}</span>
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No. Telp belum ada</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tombol Aksi: Edit & Hapus Wali */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEditModal(g)}
                    className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-200 transition"
                    title="Edit Data Wali Murid"
                  >
                    <Edit2 size={15} />
                  </button>

                  <button
                    onClick={() => handleDeleteGuardian(g)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition"
                    title="Hapus Data Wali Murid"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Detail Info: Alamat & Pekerjaan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                <div className="flex items-center gap-1.5 truncate">
                  <Briefcase size={12} className="text-slate-400 shrink-0" />
                  <span className="truncate">Pekerjaan: {g.occupation || "-"}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin size={12} className="text-slate-400 shrink-0" />
                  <span className="truncate">Alamat: {g.address || "-"}</span>
                </div>
              </div>

              {/* Children List: Relasi Siswa Terhubung */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <GraduationCap size={14} className="text-blue-600" />
                    Siswa Terhubung ({g.children ? g.children.length : 0}):
                  </span>

                  <button
                    onClick={() => {
                      setSelectedGuardianId(g.id);
                      setSelectedStudentId("");
                      setVerificationNotes("");
                      setShowLinkModal(true);
                    }}
                    className="text-[11px] font-bold text-blue-700 hover:underline flex items-center gap-1"
                  >
                    <Plus size={12} /> Tautkan Siswa
                  </button>
                </div>

                {g.children && g.children.length > 0 ? (
                  <div className="space-y-1.5">
                    {g.children.map((child: any) => (
                      <div
                        key={child.studentId}
                        className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-200/60 text-xs flex items-center justify-between gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-900 truncate">
                            {child.studentName}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap mt-0.5">
                            <span className="font-mono">NIS: {child.studentNis}</span>
                            <span>•</span>
                            <span>Kelas: {child.className || "-"}</span>
                          </div>
                          {child.notes && (
                            <div className="text-[10px] text-blue-800 italic mt-0.5 truncate">
                              Catatan: {child.notes}
                            </div>
                          )}
                        </div>

                        {/* Action: Status & Putus Relasi */}
                        <div className="flex items-center gap-1 shrink-0">
                          <span
                            className="text-emerald-700 p-1"
                            title="Telah diverifikasi resmi oleh sekolah"
                          >
                            <CheckCircle2 size={16} />
                          </span>

                          <button
                            onClick={() =>
                              handleDeleteRelation(g.id, child.studentId, child.studentName)
                            }
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Putuskan relasi siswa ini dari wali murid"
                          >
                            <Unlink size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={15} className="shrink-0" />
                      <span>Belum ada siswa yang diverifikasi ke akun ini.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal 1: Edit Data Wali Murid */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Edit2 size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Edit Data Wali Murid</h3>
                  <p className="text-[11px] text-slate-500">Pembaruan biodata dan kontak resmi</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap Wali Murid <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="Nama lengkap wali murid"
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hubungan Keluarga <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editRelationship}
                    onChange={(e) => setEditRelationship(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="Ayah">Ayah</option>
                    <option value="Ibu">Ibu</option>
                    <option value="Wali">Wali</option>
                    <option value="Kakek/Nenek">Kakek / Nenek</option>
                    <option value="Saudara">Saudara</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. Telepon / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="081234567890"
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm font-mono focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pekerjaan Wali Murid
                </label>
                <input
                  type="text"
                  value={editOccupation}
                  onChange={(e) => setEditOccupation(e.target.value)}
                  placeholder="Petani / Wiraswasta / PNS / Pedagang"
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alamat Domisili
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Dusun / Desa, Tosari"
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow disabled:opacity-50 transition"
                >
                  {submitting ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Tambah Wali Murid Baru */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Plus size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Tambah Wali Murid Baru</h3>
                  <p className="text-[11px] text-slate-500">Pendaftaran akun dan identitas orang tua</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap Wali Murid <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Contoh: Hadi Santoso"
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hubungan Keluarga <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newRelationship}
                    onChange={(e) => setNewRelationship(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="Ayah">Ayah</option>
                    <option value="Ibu">Ibu</option>
                    <option value="Wali">Wali</option>
                    <option value="Kakek/Nenek">Kakek / Nenek</option>
                    <option value="Saudara">Saudara</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. Telepon / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="081234567890"
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm font-mono focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pekerjaan (Opsional)
                </label>
                <input
                  type="text"
                  value={newOccupation}
                  onChange={(e) => setNewOccupation(e.target.value)}
                  placeholder="Petani / Wiraswasta / PNS"
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alamat Domisili (Opsional)
                </label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Dusun / Desa, Tosari"
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tautkan Langsung ke Siswa (Opsional)
                </label>
                <select
                  value={newStudentIdToLink}
                  onChange={(e) => setNewStudentIdToLink(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">-- Pilih Siswa (Opsional) --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} (NIS: {s.nis} - {s.className || "Tanpa Kelas"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow disabled:opacity-50 transition"
                >
                  {submitting ? "Menyimpan..." : "Simpan Wali Murid"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Link Guardian to Student (Verifikasi Relasi) */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <LinkIcon size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    Verifikasi Relasi Siswa & Wali Murid
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Otorisasi resmi akses data presensi anak oleh sekolah
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLinkModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleLinkSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Akun Wali Murid <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedGuardianId}
                  onChange={(e) => setSelectedGuardianId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">-- Pilih Wali Murid --</option>
                  {guardians.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.fullName} ({g.relationship} - {g.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Siswa SDN Kandangan I <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">-- Pilih Siswa --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} (NIS: {s.nis} - {s.className || "Tanpa Kelas"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Dokumen Verifikasi (Contoh: No. KK / Surat Kuasa)
                </label>
                <input
                  type="text"
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="Verifikasi Kartu Keluarga No. 351405012345..."
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow disabled:opacity-50 transition"
                >
                  {submitting ? "Menyimpan..." : "Verifikasi & Hubungkan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
