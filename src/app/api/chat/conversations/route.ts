import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { getDb, schema } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

const createConvSchema = z.object({
  targetUserId: z.string().min(1, "Target pengguna wajib dipilih"),
  title: z.string().optional(),
});

// GET: Ambil daftar percakapan aktif yang diikuti oleh pengguna saat ini
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();

  try {
    // Cari semua percakapan di mana user adalah anggotanya
    const userMemberships = await db
      .select({
        conversationId: schema.conversationMembers.conversationId,
        lastReadAt: schema.conversationMembers.lastReadAt,
      })
      .from(schema.conversationMembers)
      .where(eq(schema.conversationMembers.userId, session.userId));

    if (userMemberships.length === 0) {
      return NextResponse.json({ success: true, conversations: [] });
    }

    const convIds = userMemberships.map((m: any) => m.conversationId);

    // Ambil detail percakapan dan anggota lain
    const conversations = [];
    for (const cid of convIds) {
      const [conv] = await db
        .select()
        .from(schema.conversations)
        .where(eq(schema.conversations.id, cid));

      if (!conv) continue;

      // Ambil anggota lain dalam percakapan
      const otherMembers = await db
        .select({
          userId: schema.users.id,
          fullName: schema.users.fullName,
          username: schema.users.username,
        })
        .from(schema.conversationMembers)
        .innerJoin(schema.users, eq(schema.conversationMembers.userId, schema.users.id))
        .where(
          and(
            eq(schema.conversationMembers.conversationId, cid),
            eq(schema.conversationMembers.userId, session.userId) ? undefined : undefined
          )
        );

      const recipient = otherMembers.find((m: any) => m.userId !== session.userId) || otherMembers[0];

      // Ambil pesan terakhir
      const [lastMsg] = await db
        .select()
        .from(schema.messages)
        .where(eq(schema.messages.conversationId, cid))
        .orderBy(desc(schema.messages.sentAt))
        .limit(1);

      conversations.push({
        id: conv.id,
        type: conv.type,
        title: conv.title || recipient?.fullName || "Percakapan Sekolah",
        recipientName: recipient?.fullName || "Pengguna Sekolah",
        recipientId: recipient?.userId,
        lastMessage: lastMsg?.content || "Belum ada pesan",
        lastMessageTime: lastMsg?.sentAt || conv.createdAt,
      });
    }

    return NextResponse.json({ success: true, conversations });
  } catch (error: any) {
    console.error("Fetch conversations error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat daftar percakapan." },
      { status: 500 }
    );
  }
}

// POST: Buat percakapan baru atau buka yang sudah ada
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const session = auth.session;
  const db = getDb();

  try {
    const body = await req.json();
    const parsed = createConvSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0]?.message || "Format data tidak valid" },
        { status: 400 }
      );
    }

    const { targetUserId, title } = parsed.data;

    if (targetUserId === session.userId) {
      return NextResponse.json(
        { success: false, message: "Tidak dapat memulai percakapan dengan diri sendiri." },
        { status: 400 }
      );
    }

    // Cek apakah target pengguna ada
    const [targetUser] = await db
      .select({ id: schema.users.id, fullName: schema.users.fullName })
      .from(schema.users)
      .where(eq(schema.users.id, targetUserId));

    if (!targetUser) {
      return NextResponse.json({ success: false, message: "Target pengguna tidak ditemukan." }, { status: 404 });
    }

    // Cek apakah sudah pernah ada percakapan direct antara 2 user ini
    const myConvs = await db
      .select({ conversationId: schema.conversationMembers.conversationId })
      .from(schema.conversationMembers)
      .where(eq(schema.conversationMembers.userId, session.userId));

    for (const m of myConvs) {
      const [shared] = await db
        .select()
        .from(schema.conversationMembers)
        .where(
          and(
            eq(schema.conversationMembers.conversationId, m.conversationId),
            eq(schema.conversationMembers.userId, targetUserId)
          )
        );

      if (shared) {
        return NextResponse.json({
          success: true,
          conversationId: m.conversationId,
          isExisting: true,
        });
      }
    }

    // Buat percakapan baru
    const [newConv] = await db
      .insert(schema.conversations)
      .values({
        schoolId: session.schoolId,
        type: "DIRECT",
        title: title || `Komunikasi: ${session.fullName} & ${targetUser.fullName}`,
      })
      .returning();

    // Daftarkan kedua anggota
    await db.insert(schema.conversationMembers).values([
      { conversationId: newConv.id, userId: session.userId },
      { conversationId: newConv.id, userId: targetUserId },
    ]);

    return NextResponse.json({
      success: true,
      conversationId: newConv.id,
      isExisting: false,
    });
  } catch (error: any) {
    console.error("Create conversation error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal membuat ruang percakapan." },
      { status: 500 }
    );
  }
}
