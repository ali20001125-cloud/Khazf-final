import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[80svh] flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="font-num text-8xl font-semibold text-line" dir="ltr">404</span>
      <h1 className="text-2xl font-bold">هذه الصفحة… تبخّرت</h1>
      <Link href="/" className="btn btn-clay">رجوع للرئيسية</Link>
    </div>
  );
}
