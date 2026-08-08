import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { pass } = await req.json().catch(() => ({ pass: "" }));
  const expected = process.env.STAGING_PASSWORD;
  if (!expected || pass !== expected)
    return NextResponse.json({ error: "خطأ" }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("khz_staging", expected, {
    path: "/", maxAge: 60 * 60 * 24 * 30, httpOnly: true, sameSite: "lax",
  });
  return res;
}
