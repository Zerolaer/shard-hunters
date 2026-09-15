import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/auth/validators";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: parsed.error.issues[0]?.message ?? "Неверные данные" },
        { status: 400 },
      );
    }

    const email = parsed.data.email.toLowerCase();
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      return NextResponse.json({ ok: false, message: "Неверный email или пароль" }, { status: 401 });
    }

    const ok = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ ok: false, message: "Неверный email или пароль" }, { status: 401 });
    }

    const token = await signSession({ sub: user.id, email: user.email, name: user.name });
    const res = NextResponse.json({
      ok: true,
      account: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt.getTime(),
      },
    });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  } catch (err) {
    console.error("[auth/login]", err);
    const message =
      err instanceof Error && err.message.includes("DATABASE_URL")
        ? "Сервер не настроен (нет DATABASE_URL)"
        : err instanceof Error && err.message.includes("AUTH_SECRET")
          ? "Сервер не настроен (нет AUTH_SECRET)"
          : "Не удалось войти";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
