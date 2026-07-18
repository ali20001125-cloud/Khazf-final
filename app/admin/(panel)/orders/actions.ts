"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/server/admin-guard";
import { deliverOrder, cancelOrder } from "@/lib/server/orders-admin";

export async function deliverAction(formData: FormData) {
  await requireAdmin();
  await deliverOrder(Number(formData.get("id")));
  revalidatePath("/admin/orders");
}

export async function cancelAction(formData: FormData) {
  await requireAdmin();
  await cancelOrder(Number(formData.get("id")));
  revalidatePath("/admin/orders");
}
