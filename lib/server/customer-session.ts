/**
 * هوية الزبون بالهاتف — كوكي موقّع HMAC (بلا كلمات مرور، حسب القرار)
 * تُثبَّت عند إتمام الطلب · ترقية OTP لاحقاً دون تغيير الواجهات
 */
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "khz_customer";
const secret = () => process.env.AUTH_SECRET || "dev-secret-change-me";

function sign(phone: string) {
  const mac = createHmac("sha256", secret()).update(phone).digest("base64url");
  return `${phone}.${mac}`;
}

export function verifyToken(token: string | undefined): string | null {
  if (!token) return null;
  const i = token.lastIndexOf(".");
  if (i < 1) return null;
  const phone = token.slice(0, i);
  const mac = token.slice(i + 1);
  const expect = createHmac("sha256", secret()).update(phone).digest("base64url");
  try {
    if (timingSafeEqual(Buffer.from(mac), Buffer.from(expect))) return phone;
  } catch {}
  return null;
}

export async function setCustomerCookie(phone: string) {
  (await cookies()).set(COOKIE, sign(phone), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 180,
    path: "/",
  });
}

export async function getCustomerPhone(): Promise<string | null> {
  return verifyToken((await cookies()).get(COOKIE)?.value);
}

export async function clearCustomerCookie() {
  (await cookies()).delete(COOKIE);
}
