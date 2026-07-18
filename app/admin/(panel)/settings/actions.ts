"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/admin-guard";
import type { BoxTier } from "@/lib/server/db/schema";

const n = (f: FormData, k: string, d = 0) => {
  const v = Number(String(f.get(k) ?? "").trim());
  return Number.isFinite(v) ? Math.round(v) : d;
};

export async function savePublicSettings(f: FormData) {
  await requireAdmin();
  const tiers: BoxTier[] = [1, 2, 3, 4].map((i) => ({
    bags: n(f, `tier${i}_bags`),
    rewardType: String(f.get(`tier${i}_type`)) as BoxTier["rewardType"],
    value: n(f, `tier${i}_value`),
  })).filter((t) => t.bags > 0);
  await db.update(s.settings).set({
    deliveryCustomerPrice: n(f, "deliveryCustomerPrice", 3000),
    cashbackPerAmount: n(f, "cashbackPerAmount", 1000),
    pointValue: n(f, "pointValue", 30),
    loyaltyValidityDays: n(f, "loyaltyValidityDays", 90),
    boxTiers: tiers,
    topBarMessages: String(f.get("topBarMessages") ?? "").split("\n").map((x) => x.trim()).filter(Boolean),
    instagram: String(f.get("instagram") ?? "").trim() || null,
    contactPhone: String(f.get("contactPhone") ?? "").trim() || null,
    featuredMode: String(f.get("featuredMode")) === "auto" ? "auto" : "manual",
  }).where(eq(s.settings.id, 1));
  revalidatePath("/admin/settings"); revalidatePath("/");
}

export async function saveInternalSettings(f: FormData) {
  await requireAdmin();
  await db.update(s.settingsInternal).set({
    deliveryCostBasra: n(f, "deliveryCostBasra"),
    deliveryCostOther: n(f, "deliveryCostOther"),
    telegramBotToken: String(f.get("telegramBotToken") ?? "").trim() || null,
    telegramChatId: String(f.get("telegramChatId") ?? "").trim() || null,
    notifyNewOrder: f.get("notifyNewOrder") === "on",
    notifyLowStock: f.get("notifyLowStock") === "on",
    notifyNewReview: f.get("notifyNewReview") === "on",
  }).where(eq(s.settingsInternal.id, 1));
  revalidatePath("/admin/settings");
}

export async function addAdmin(f: FormData) {
  await requireAdmin();
  const email = String(f.get("email") ?? "").trim().toLowerCase();
  const name = String(f.get("name") ?? "").trim() || "مدير";
  if (email) await db.insert(s.admins).values({ email, name }).onConflictDoNothing();
  revalidatePath("/admin/settings");
}
