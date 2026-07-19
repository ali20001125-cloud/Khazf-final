"use client";
/** عميل Supabase للمتصفح — يعمل فقط عند ضبط المفاتيح */
import { createBrowserClient } from "@supabase/ssr";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_API_KEY || process.env.SUPABASE_ANON_KEY;
export const supabaseEnabled = !!URL && !!ANON;

export function supabaseBrowser() {
  return createBrowserClient(
    URL!,
    ANON!
  );
}
