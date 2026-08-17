import { NextResponse, type NextRequest } from "next/server";

/**
 * رمز Supabase قد يصل الجذر (/?code=...) بدل /auth/callback
 * حين يتجاهل Supabase الـredirect_to ويستخدم Site URL.
 * نحوّله للمعالج الصحيح فتُحفظ الجلسة.
 */
export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const code = searchParams.get("code");

  if (code && pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/callback";
    if (!searchParams.get("next")) url.searchParams.set("next", "/account/");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
