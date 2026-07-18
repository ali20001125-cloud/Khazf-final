/** بوابة اللوحة — تحمي كل أقسام /admin (صفحة الدخول خارج هذه المجموعة) */
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/server/admin-auth";
import AdminShell from "@/components/admin/Shell";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login/");
  return <AdminShell>{children}</AdminShell>;
}
