"use client";

import React, { useEffect, useState, useRef } from "react";
import { MessageSquare, Send, User, RefreshCw, AlertCircle, CheckCheck } from "lucide-react";

export default function InternalChatPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setCurrentUser(d.user);
      });

    loadConversations();
  }, []);

  const loadConversations = async () => {
    setLoadingConvs(true);
    try {
      const res = await fetch("/api/chat/conversations");
      const data = await res.json();
      if (data.success && data.conversations) {
        setConversations(data.conversations);
        if (data.conversations.length > 0 && !activeConvId) {
          setActiveConvId(data.conversations[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingConvs(false);
    }
  };

  const loadMessages = async (convId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/chat/messages?conversationId=${convId}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId);
    }
  }, [activeConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConvId || !newMessage.trim()) return;

    setSending(true);
    const content = newMessage.trim();
    setNewMessage("");

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConvId,
          content,
        }),
      });

      const data = await res.json();
      if (data.success && data.sentMessage) {
        setMessages((prev) => [...prev, data.sentMessage]);
      } else {
        alert(data.message || "Gagal mengirim pesan.");
      }
    } catch (e) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setSending(false);
    }
  };

  const activeConv = conversations.find((c) => c.id === activeConvId);

  return (
    <div className="space-y-4">
      <div className="pb-3 border-b border-slate-200">
        <h1 className="text-xl font-black text-slate-800">
          Kanal Komunikasi & Chat Internal
        </h1>
        <p className="text-xs text-slate-500">
          Komunikasi langsung dan aman antara Admin, Guru, Wali Kelas, dan Wali Murid
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row h-[600px]">
        {/* Left Sidebar: Conversations List */}
        <div className="w-full md:w-80 border-r border-slate-200 flex flex-col bg-slate-50">
          <div className="p-3.5 border-b border-slate-200 font-bold text-xs text-slate-700 flex justify-between items-center bg-white">
            <span>Daftar Obrolan Aktif</span>
            <button
              onClick={loadConversations}
              className="text-blue-700 hover:underline flex items-center gap-1 text-[11px]"
            >
              <RefreshCw size={12} /> Segarkan
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loadingConvs ? (
              <div className="p-6 text-center text-slate-400 text-xs">Memuat obrolan...</div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                Belum ada riwayat percakapan.
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveConvId(c.id)}
                  className={`w-full text-left p-3.5 transition flex items-start gap-3 ${
                    activeConvId === c.id ? "bg-blue-50/90 border-l-4 border-blue-600" : "hover:bg-slate-100/60"
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center shrink-0 text-xs">
                    {c.recipientName ? c.recipientName.charAt(0) : "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h4 className="font-bold text-xs text-slate-900 truncate">{c.recipientName}</h4>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap ml-1">
                        {new Date(c.lastMessageTime).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{c.lastMessage}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Area: Messages Viewport */}
        <div className="flex-1 flex flex-col bg-white">
          {activeConv ? (
            <>
              {/* Active Header */}
              <div className="p-3.5 border-b border-slate-200 bg-white flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{activeConv.recipientName}</h3>
                  <span className="text-[11px] text-slate-500">{activeConv.title}</span>
                </div>
              </div>

              {/* Message History */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/40">
                {loadingMessages ? (
                  <div className="text-center py-8 text-xs text-slate-400">Memuat pesan...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-400">
                    Belum ada pesan. Mulai kirimkan salam pertama Anda.
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.senderUserId === currentUser?.userId;
                    return (
                      <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-xs sm:max-w-md p-3 rounded-2xl text-xs sm:text-sm shadow-sm space-y-1 ${
                            isMe
                              ? "bg-blue-600 text-white rounded-br-xs"
                              : "bg-white text-slate-800 border border-slate-200 rounded-bl-xs"
                          }`}
                        >
                          {!isMe && (
                            <div className="font-bold text-[11px] text-blue-700">
                              {m.senderName}
                            </div>
                          )}
                          <p className="whitespace-pre-wrap">{m.content}</p>
                          <div
                            className={`text-[9px] flex items-center justify-end gap-1 ${
                              isMe ? "text-blue-200" : "text-slate-400"
                            }`}
                          >
                            <span>
                              {new Date(m.sentAt).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {isMe && <CheckCheck size={12} />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Box */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Ketik pesan resmi di sini..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send size={15} /> Kirim
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-400 text-xs">
              <MessageSquare size={36} className="text-slate-300 mb-2" />
              Pilih ruang obrolan di sebelah kiri untuk membaca pesan.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
