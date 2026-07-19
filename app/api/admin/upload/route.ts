/** رفع صورة من الجهاز → Supabase Storage (يعمل بالإنتاج بعد ضبط المفاتيح) */
import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/server/admin-auth";

export const runtime = "nodejs";
const BUCKET = "khazf";

export async function POST(req: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE ?? process.env.SUPABASE_SECRET_KEY ?? process.env.SERVICE_ROLE_KEY;
  if (!url || !key)
    return NextResponse.json({ error: "الرفع يتفعّل بعد ضبط SUPABASE_SERVICE_ROLE_KEY" }, { status: 400 });
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "لا ملف" }, { status: 400 });
  if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: "الحد ٤ ميغا" }, { status: 400 });

  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(url, key);
  await sb.storage.createBucket(BUCKET, { public: true }).catch(() => {});
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `uploads/${Date.now()}.${ext}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "image/png",
    upsert: false,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
