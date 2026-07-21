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
      className="fixed bottom-24 end-4 z-30 flex items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/25 transition-transform hover:scale-105 active:scale-95 md:bottom-6"
      style={{ height: 48, width: 48 }}
    >
      <MessageCircle size={24} fill="white" strokeWidth={0} />
    </a>
  );
}
