import { NextResponse } from "next/server";
import { previewOrder } from "@/lib/server/order-preview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await previewOrder({
      items: body.items ?? [],
      phone: body.phone,
      governorate: body.governorate,
      couponCode: body.couponCode,
      usePoints: body.usePoints,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "خطأ" }, { status: 500 });
  }
}
