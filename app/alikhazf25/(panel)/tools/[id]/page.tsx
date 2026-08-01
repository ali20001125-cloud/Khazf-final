import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { PageTitle } from "@/components/admin/ui";
import ToolForm from "../ToolForm";
import { updateProduct, createProduct } from "../../products/actions";

export const dynamic = "force-dynamic";

export default async function ToolEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const places = await db.select({ id: s.places.id, name: s.places.name }).from(s.places).orderBy(s.places.sort);
  const subs = await db.select({ id: s.subcategories.id, name: s.subcategories.name }).from(s.subcategories).orderBy(s.subcategories.sort);

  if (id === "new")
    return (
      <div>
        <PageTitle title="أداة جديدة" />
        <ToolForm places={places} subs={subs} action={createProduct} submitLabel="إنشاء الأداة" />
      </div>
    );

  const [p] = await db.select().from(s.products).where(eq(s.products.id, Number(id)));
  if (!p || p.type !== "TOOL") notFound();
  const pp = await db.select().from(s.productPlaces).where(eq(s.productPlaces.productId, p.id));
  const vRows = await db.select().from(s.productVariants)
    .where(eq(s.productVariants.productId, p.id)).orderBy(s.productVariants.sort);
  const variants = vRows.map((v) => ({
    id: v.id, label: v.label, kind: v.kind as "SIZE" | "COLOR" | "PACK",
    price: v.price, salePrice: v.salePrice, costPrice: v.costPrice,
    stock: v.stock, hex: v.hex, image: v.image, active: v.active,
  }));

  return (
    <div>
      <PageTitle title={`تعديل: ${p.name}`} sub={`slug: ${p.slug}`} />
      <ToolForm p={p} places={places} subs={subs} chosenPlaces={pp.map((x) => x.placeId)}
        variants={variants} action={updateProduct} submitLabel="حفظ التعديلات" />
    </div>
  );
}
