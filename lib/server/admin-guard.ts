import { getAdmin } from "./admin-auth";
/** حارس إجراءات الخادم — يُستدعى أول سطر بكل server action */
export async function requireAdmin() {
  const a = await getAdmin();
  if (!a) throw new Error("غير مصرّح");
  return a;
}
