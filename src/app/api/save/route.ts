import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { saves } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { savePayloadSchema } from "@/lib/auth/validators";
import { isUsableSavePayload } from "@/lib/auth/saveFormat";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, message: "Нужна авторизация" }, { status: 401 });
    }

    const db = getDb();
    const [row] = await db.select().from(saves).where(eq(saves.userId, session.sub)).limit(1);
    if (!row) {
      return NextResponse.json({ ok: true, data: null, updatedAt: null });
    }

    return NextResponse.json({
      ok: true,
      data: row.data,
      updatedAt: row.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error("[save GET]", err);
    return NextResponse.json({ ok: false, message: "Не удалось загрузить сохранение" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, message: "Нужна авторизация" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = savePayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: "Неверный формат сохранения" }, { status: 400 });
    }

    if (!isUsableSavePayload(parsed.data.data)) {
      return NextResponse.json({ ok: false, message: "Сохранение повреждено" }, { status: 400 });
    }

    const db = getDb();
    const now = new Date();
    await db
      .insert(saves)
      .values({
        userId: session.sub,
        data: parsed.data.data,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: saves.userId,
        set: {
          data: parsed.data.data,
          updatedAt: now,
        },
      });

    return NextResponse.json({ ok: true, updatedAt: now.toISOString() });
  } catch (err) {
    console.error("[save PUT]", err);
    return NextResponse.json({ ok: false, message: "Не удалось сохранить" }, { status: 500 });
  }
}
