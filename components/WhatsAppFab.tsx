"use client";
import { MessageCircle } from "lucide-react";

/** زر واتساب عائم — رقم خزف الرسمي */
const WA = "9647881554987"; // 07881554987

export default function WhatsAppFab() {
  return (
    <a
      href={`https://wa.me/${WA}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="تواصل عبر واتساب"
      className="fixed bottom-5 end-5 z-40 flex h-13 w-13 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 transition-transform hover:scale-105 active:scale-95"
      style={{ height: 52, width: 52 }}
    >
      <MessageCircle size={26} fill="white" strokeWidth={0} />
    </a>
  );
}
