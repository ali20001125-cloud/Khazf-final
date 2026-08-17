/**
 * ضغط صور Supabase Storage الموجودة — يقلّل النقل (Egress) والحجم كثيراً.
 * يُصغّر كل صورة (≤١٤٠٠ بكسل) ويعيد ضغطها بنفس الصيغة والمسار، فالروابط لا تتغيّر.
 *
 * التشغيل (مرّة واحدة، على جهازك أو هوستنجر):
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   npx tsx scripts/compress-storage.ts
 */
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
const BUCKET = "khazf";
const FOLDER = "uploads";

if (!url || !key) {
  console.error("ينقص SUPABASE_URL أو SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key);

async function main() {
  const { data: list, error } = await sb.storage.from(BUCKET).list(FOLDER, { limit: 2000 });
  if (error) { console.error("تعذّر جلب القائمة:", error.message); process.exit(1); }

  let done = 0, savedBytes = 0, skipped = 0;
  for (const f of list ?? []) {
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["png", "jpg", "jpeg", "webp"].includes(ext)) { skipped++; continue; }
    const path = `${FOLDER}/${f.name}`;

    const { data: blob, error: dErr } = await sb.storage.from(BUCKET).download(path);
    if (dErr || !blob) { console.warn("تخطّي (تنزيل):", f.name); skipped++; continue; }
    const input = Buffer.from(await blob.arrayBuffer());

    const base = sharp(input).rotate().resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true });
    let out: Buffer, contentType: string;
    if (ext === "png") { out = await base.png({ compressionLevel: 9 }).toBuffer(); contentType = "image/png"; }
    else if (ext === "webp") { out = await base.webp({ quality: 80 }).toBuffer(); contentType = "image/webp"; }
    else { out = await base.jpeg({ quality: 82 }).toBuffer(); contentType = "image/jpeg"; }

    // لا نرفع إلا إذا صغرت فعلاً (نتجنّب تكبير أو خسارة)
    if (out.length < input.length * 0.95) {
      const { error: uErr } = await sb.storage.from(BUCKET).upload(path, out, { contentType, upsert: true });
      if (uErr) { console.warn("تخطّي (رفع):", f.name, uErr.message); skipped++; continue; }
      savedBytes += input.length - out.length;
      console.log(`✔ ${f.name}: ${(input.length / 1024).toFixed(0)}KB → ${(out.length / 1024).toFixed(0)}KB`);
    } else { skipped++; }
    done++;
  }
  console.log(`\nانتهى · عولج ${done} · تُخطّي ${skipped} · وُفّر ${(savedBytes / 1024 / 1024).toFixed(1)} MB`);
}

main().catch((e) => { console.error(e); process.exit(1); });
