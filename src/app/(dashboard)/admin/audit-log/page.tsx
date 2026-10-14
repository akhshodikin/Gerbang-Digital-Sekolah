"use client";

import React, { useEffect, useState } from "react";
import { History, Shield, RefreshCw, User, Globe } from "lucide-react";

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/audit-logs");
      const data = await res.json();
      if (data.success) setLogs(data.logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionBadge = (action: string) => {
    switch (action) {
      case "CREATE":
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">CREATE</span>;
      case "UPDATE":
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">UPDATE</span>;
      case "DELETE":
        return <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded">DELETE</span>;
      case "CORRECTION":
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">KOREKSI</span>;
      case "SCAN":
        return <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded">SCAN QR</span>;
      case "LOGIN":
        return <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded">LOGIN</span>;
      case "LOGOUT":
        return <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">LOGOUT</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded">{action}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-black text-slate-800">
            Audit Log & Rekam Jejak Keamanan
          </h1>
          <p className="text-xs text-slate-500">
            Pencatatan riwayat setiap aksi perubahan data, pelaku, waktu, dan alasan (Non-repudiation)
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="text-xs text-blue-700 font-semibold hover:underline flex items-center gap-1"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Log
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#0F2744] text-white text-[11px] uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Waktu (WIB)</th>
                <th className="py-3 px-4 text-center">Aksi</th>
                <th className="py-3 px-4">Modul / Tabel</th>
                <th className="py-3 px-4">Pelaku Pengguna</th>
                <th className="py-3 px-4">Keterangan / Alasan Perubahan</th>
                <th className="py-3 px-4">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Memuat catatan log audit...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Belum ada log tercatat.
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap font-mono text-xs">
                      {new Date(l.createdAt).toLocaleString("id-ID", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4 text-center">{getActionBadge(l.action)}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700 text-xs">
                      {l.tableName}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{l.userName || "Sistem"}</div>
                      <div className="text-[10px] text-slate-400">@{l.username || "system"}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-sm truncate" title={l.reason}>
                      {l.reason || "-"}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {l.ipAddress || "127.0.0.1"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
