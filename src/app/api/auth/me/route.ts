import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: true, account: null });
    }
    return NextResponse.json({
      ok: true,
      account: {
        id: session.sub,
        email: session.email,
        name: session.name,
      },
    });
  } catch (err) {
    console.error("[auth/me]", err);
    return NextResponse.json({ ok: true, account: null });
  }
}
