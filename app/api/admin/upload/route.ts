/** رفع صورة من الجهاز → Supabase Storage (يعمل بالإنتاج بعد ضبط المفاتيح)
 *  تُضغط الصورة وتُصغَّر تلقائياً (webp ≤1600px) — يخفّف حجمها كثيراً على الجوال.
 *  الصور القديمة لا تتأثّر — الضغط للصور الجديدة فقط. */
import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/server/admin-auth";
import sharp from "sharp";

export const runtime = "nodejs";
const BUCKET = "khazf";

export async function POST(req: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE ?? process.env.SUPABASE_SECRET_KEY ?? process.env.SERVICE_ROLE_KEY;
  if (!url) return NextResponse.json({ error: "رابط Supabase غير مضبوط (NEXT_PUBLIC_SUPABASE_URL)" }, { status: 400 });
  if (!key) return NextResponse.json({ error: "مفتاح الخدمة غير مضبوط (SUPABASE_SERVICE_ROLE_KEY)" }, { status: 400 });
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "لا ملف" }, { status: 400 });
  // نسمح بأصل أكبر (١٠ ميغا) لأننا نضغطه — الناتج يصير صغيراً جداً
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "الحد ١٠ ميغا" }, { status: 400 });

  /* ضغط وتصغير — نتجاوزه للـSVG (شعارات متجهية) وعند أي خطأ نرفع الأصل كما هو */
  const inputBuf = Buffer.from(await file.arrayBuffer());
  let outBuf: Buffer | File = file;
  let ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  let contentType = file.type || "image/png";
  const isSvg = contentType.includes("svg") || file.name.toLowerCase().endsWith(".svg");
  if (!isSvg) {
    try {
      outBuf = await sharp(inputBuf)
        .rotate()                                              // احترام اتجاه صور الجوال
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      ext = "webp";
      contentType = "image/webp";
    } catch { outBuf = inputBuf; }                             // صيغة لا يدعمها sharp — الأصل
  }

  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(url, key);
  await sb.storage.createBucket(BUCKET, { public: true }).catch(() => {});
  const path = `uploads/${Date.now()}.${ext}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, outBuf, {
    contentType,
    upsert: false,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
