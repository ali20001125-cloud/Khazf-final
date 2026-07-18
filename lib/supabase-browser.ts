"use client";
/** عميل Supabase للمتصفح — يعمل فقط عند ضبط المفاتيح */
import { createBrowserClient } from "@supabase/ssr";

export const supabaseEnabled =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
