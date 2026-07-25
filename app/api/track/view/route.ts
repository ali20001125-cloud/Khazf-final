import { NextResponse } from "next/server";
import { db, schema as s } from "@/lib/server/db";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** تتبّع زيارة صفحة — خفيف، صامت */
export async function POST(req: Request) {
  try {
    const b = await req.json();
    if (!b.sessionId || !b.path) return NextResponse.json({ ok: false });
    await db.insert(s.pageViews).values({
      sessionId: String(b.sessionId).slice(0, 60),
      path: String(b.path).slice(0, 200),
      referrer: b.referrer ? String(b.referrer).slice(0, 200) : null,
      device: b.device ? String(b.device).slice(0, 20) : null,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
