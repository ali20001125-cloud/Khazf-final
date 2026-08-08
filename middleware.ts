import { NextResponse, type NextRequest } from "next/server";

/**
 * حماية بيئة الاختبار: لا يدخلها إلا من يملك كلمة المرور.
 * تعمل فقط حين NEXT_PUBLIC_ENV=staging — المتجر الحقيقي لا يتأثر إطلاقاً.
 */
export function middleware(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_ENV !== "staging") return NextResponse.next();

  const { pathname } = req.nextUrl;

  // نسمح بالملفات الثابتة وصفحة الدخول ومسارها
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/staging-auth") ||
    pathname === "/staging-login" ||
    /\.(png|jpg|jpeg|svg|webp|ico|css|js|woff2?|ttf)$/i.test(pathname)
  ) return NextResponse.next();

  const pass = process.env.STAGING_PASSWORD;
  if (!pass) return NextResponse.next(); // لم تُضبط كلمة مرور — لا حماية

  const cookie = req.cookies.get("khz_staging")?.value;
  if (cookie === pass) return NextResponse.next();

  // نحوّل لصفحة الدخول
  const url = req.nextUrl.clone();
  url.pathname = "/staging-login";
  url.search = `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
