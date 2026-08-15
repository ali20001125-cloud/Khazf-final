"use client";
import { useRouter, useSearchParams } from "next/navigation";

/** اختيار حملة إعلانية — ينتقل فوراً محافظاً على باقي الفلاتر */
export default function CampaignSelect({ campaigns, value }: { campaigns: { id: string; name: string }[]; value: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  if (campaigns.length === 0) return null;
  return (
    <select
      value={value}
      onChange={(e) => {
        const u = new URLSearchParams(sp.toString());
        if (e.target.value) u.set("campaign", e.target.value);
        else u.delete("campaign");
        router.push(`?${u.toString()}`);
      }}
      className="rounded-[5px] border border-line bg-bg px-3 py-2 text-[12.5px] font-semibold"
    >
      <option value="">كل الحملات</option>
      {campaigns.map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  );
}
