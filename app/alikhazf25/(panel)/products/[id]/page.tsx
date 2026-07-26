import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { PageTitle } from "@/components/admin/ui";
import ProductForm from "../ProductForm";
import { updateProduct, createProduct } from "../actions";

export const dynamic = "force-dynamic";

export default async function ProductEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const places = await db.select({ id: s.places.id, name: s.places.name }).from(s.places).orderBy(s.places.sort);
  const subs = await db.select({ id: s.subcategories.id, name: s.subcategories.name }).from(s.subcategories).orderBy(s.subcategories.sort);

  if (id === "new")
    return (
      <div>
        <PageTitle title="منتج جديد" />
        <ProductForm places={places} subs={subs} action={createProduct} submitLabel="إنشاء المنتج" />
      </div>
    );

  const [p] = await db.select().from(s.products).where(eq(s.products.id, Number(id)));
  if (!p) notFound();
  const pp = await db.select().from(s.productPlaces).where(eq(s.productPlaces.productId, p.id));

  return (
    <div>
      <PageTitle title={`تعديل: ${p.name}`} sub={`slug: ${p.slug}`} />
      <ProductForm p={p} places={places} subs={subs} chosenPlaces={pp.map((x) => x.placeId)}
        action={updateProduct} submitLabel="حفظ التعديلات" />
    </div>
  );
}
