import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { getDb, schema } from "@/lib/db";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";

const sendMessageSchema = z.object({
  conversationId: z.string().min(1, "ID Percakapan wajib diisi"),
  content: z.string().min(1, "Pesan tidak boleh kosong"),
});

// GET: Ambil riwayat pesan dalam satu percakapan
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();

  const url = new URL(req.url);
  const conversationId = url.searchParams.get("conversationId");

  if (!conversationId) {
    return NextResponse.json(
      { success: false, message: "Parameter conversationId diperlukan." },
      { status: 400 }
    );
  }

  try {
    // 1. Cegah IDOR: Pastikan pengguna saat ini adalah anggota resmi dari percakapan ini
    const [membership] = await db
      .select()
      .from(schema.conversationMembers)
      .where(
        and(
          eq(schema.conversationMembers.conversationId, conversationId),
          eq(schema.conversationMembers.userId, session.userId)
        )
      );

    if (!membership) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Anda bukan anggota percakapan ini." },
        { status: 403 }
      );
    }

    // 2. Ambil seluruh pesan
    const messageList = await db
      .select({
        id: schema.messages.id,
        conversationId: schema.messages.conversationId,
        senderUserId: schema.messages.senderUserId,
        senderName: schema.users.fullName,
        content: schema.messages.content,
        sentAt: schema.messages.sentAt,
        isRead: schema.messages.isRead,
      })
      .from(schema.messages)
      .innerJoin(schema.users, eq(schema.messages.senderUserId, schema.users.id))
      .where(eq(schema.messages.conversationId, conversationId))
      .orderBy(asc(schema.messages.sentAt));

    // Perbarui waktu baca pengguna
    await db
      .update(schema.conversationMembers)
      .set({ lastReadAt: new Date() })
      .where(
        and(
          eq(schema.conversationMembers.conversationId, conversationId),
          eq(schema.conversationMembers.userId, session.userId)
        )
      );

    return NextResponse.json({ success: true, messages: messageList });
  } catch (error: any) {
    console.error("Fetch messages error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat pesan." },
      { status: 500 }
    );
  }
}

// POST: Kirim pesan baru
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();

  try {
    const body = await req.json();
    const parsed = sendMessageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0]?.message || "Format data tidak valid" },
        { status: 400 }
      );
    }

    const { conversationId, content } = parsed.data;

    // Cegah IDOR
    const [membership] = await db
      .select()
      .from(schema.conversationMembers)
      .where(
        and(
          eq(schema.conversationMembers.conversationId, conversationId),
          eq(schema.conversationMembers.userId, session.userId)
        )
      );

    if (!membership) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Anda bukan anggota percakapan ini." },
        { status: 403 }
      );
    }

    const [newMsg] = await db
      .insert(schema.messages)
      .values({
        conversationId,
        senderUserId: session.userId,
        content: content.trim(),
      })
      .returning();

    // Perbarui timestamp percakapan
    await db
      .update(schema.conversations)
      .set({ updatedAt: new Date() })
      .where(eq(schema.conversations.id, conversationId));

    return NextResponse.json({
      success: true,
      message: "Pesan terkirim.",
      sentMessage: {
        ...newMsg,
        senderName: session.fullName,
      },
    });
  } catch (error: any) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengirim pesan." },
      { status: 500 }
    );
  }
}
