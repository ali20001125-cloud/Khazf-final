import { redirect } from "next/navigation";

/* توحيد: كل تسجيل الدخول صار داخل /account */
export default function LoginRedirect() {
  redirect("/account/");
}
