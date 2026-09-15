import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth/session";
import { registerSchema } from "@/lib/auth/validators";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: parsed.error.issues[0]?.message ?? "Неверные данные" },
        { status: 400 },
      );
    }

    const email = parsed.data.email.toLowerCase();
    const name = parsed.data.name;
    const passwordHash = await hashPassword(parsed.data.password);
    const db = getDb();

    const existingEmail = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existingEmail.length) {
      return NextResponse.json({ ok: false, message: "Этот email уже занят" }, { status: 409 });
    }

    const existingName = await db.select({ id: users.id }).from(users).where(eq(users.name, name)).limit(1);
    if (existingName.length) {
      return NextResponse.json({ ok: false, message: "Такой охотник уже зарегистрирован" }, { status: 409 });
    }

    const [user] = await db
      .insert(users)
      .values({ email, name, passwordHash })
      .returning({ id: users.id, email: users.email, name: users.name, createdAt: users.createdAt });

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
    console.error("[auth/register]", err);
    const message =
      err instanceof Error && err.message.includes("DATABASE_URL")
        ? "Сервер не настроен (нет DATABASE_URL)"
        : err instanceof Error && err.message.includes("AUTH_SECRET")
          ? "Сервер не настроен (нет AUTH_SECRET)"
          : "Не удалось создать аккаунт";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
