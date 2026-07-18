import { cookies } from "next/headers";
/** إشعار "تم ✓" يظهر مرة واحدة بعد أي إجراء باللوحة */
export async function flashSaved(msg = "تم الحفظ ✓") {
  (await cookies()).set("khz_flash", encodeURIComponent(msg), { path: "/", maxAge: 8, httpOnly: false, sameSite: "lax" });
}
