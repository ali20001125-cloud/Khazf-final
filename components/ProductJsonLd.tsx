"use client";
/** بيانات منتج منظّمة — تُظهر السعر والتوفّر والتقييم كبطاقة غنية بنتائج البحث */

type Props = {
  name: string;
  description?: string;
  image?: string;
  slug: string;
  price: number;
  inStock: boolean;
  rating?: number;
  reviewsCount?: number;
  brand?: string;
  faq?: { q: string; a: string }[];
};

const SITE = "https://khazf.shop";

export default function ProductJsonLd({
  name, description, image, slug, price, inStock,
  rating, reviewsCount, brand = "خزف", faq = [],
}: Props) {
  const blocks: Record<string, unknown>[] = [{
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    ...(description ? { description } : {}),
    ...(image ? { image: [image] } : {}),
    brand: { "@type": "Brand", name: brand },
    offers: {
      "@type": "Offer",
      url: `${SITE}/product/?${slug.startsWith("t:") ? "t" : "c"}=${slug.replace(/^[tc]:/, "")}`,
      priceCurrency: "IQD",
      price: String(price),
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: "خزف" },
    },
    ...(rating && reviewsCount
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: String(rating),
            reviewCount: String(reviewsCount),
          },
        }
      : {}),
  }];

  if (faq.length > 0) {
    blocks.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({
        "@type": "Question", name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }

  return (
    <script type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(blocks) }} />
  );
}
