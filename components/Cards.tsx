"use client";

import Link from "next/link";
import { Plus, Star, Heart, Bell } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatIQD, type Coffee, type Tool } from "@/lib/data";
import BagArt from "./BagArt";
import { Cog, Filter, FlaskConical, Scale, Layers, Flame, Hammer, Box, Wrench, Milk } from "lucide-react";

export function Stars({ value, size = 13 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={
            i <= Math.round(value)
              ? "fill-gold text-gold"
              : "fill-transparent text-line"
          }
        />
      ))}
    </span>
  );
}

const toolIcons: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  مطاحن: Cog,
  أقماع: Filter,
  سيرفرات: FlaskConical,
  فلاتر: Layers,
  غلايات: Flame,
  موازين: Scale,
  تامبر: Hammer,
  "موزّع": Wrench,
  WDT: Wrench,
  "صندوق طرق": Box,
  بيتشر: Milk,
};

export function ToolVisual({
  tool,
  className = "",
}: {
  tool: Pick<Tool, "type" | "latin">;
  className?: string;
}) {
  const Icon = toolIcons[tool.type] ?? Cog;
  return (
    <div className={`relative flex items-center justify-center bg-bg-alt ${className}`}>
      <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-olive/40 text-olive">
        <Icon size={32} strokeWidth={1.8} />
      </div>
      <span className="font-num absolute bottom-3 text-[9px] tracking-[0.3em] text-muted">
        {tool.latin}
      </span>
    </div>
  );
}

export function FavBtn({ id }: { id: string }) {
  const { favorites, toggleFavorite } = useStore();
  const on = favorites.includes(id);
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        toggleFavorite(id);
      }}
      aria-label="المفضلة"
      className={`absolute top-3 end-3 flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-sm transition-all active:scale-90 ${
        on
          ? "border-accent bg-accent text-olive-text"
          : "border-line bg-bg/80 text-muted hover:text-accent"
      }`}
    >
      <Heart size={15} className={on ? "fill-current" : ""} />
    </button>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="absolute top-3 start-3 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-olive-text">
      {label}
    </span>
  );
}

export function CoffeeCard({ coffee }: { coffee: Coffee }) {
  const { addToCart } = useStore();
  return (
    <div className="group overflow-hidden rounded-[18px] border border-line bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-ink/5">
      <Link href={`/product/?c=${coffee.slug}`} className="relative block">
        <div className="flex aspect-square items-center justify-center overflow-hidden bg-bg-alt">
          <BagArt
            className="h-[68%] text-olive transition-transform duration-500 group-hover:scale-[1.06]"
            accent={coffee.accent}
            latin={coffee.latin}
          />
        </div>
        {coffee.isNew && <Badge label="جديد" />}
        <FavBtn id={`c:${coffee.slug}`} />
      </Link>
      <Link href={`/product/?c=${coffee.slug}`} className="block p-4">
        <p className="text-[11px] text-muted">{coffee.country}</p>
        <h3 className="mt-0.5 text-lg font-bold">{coffee.name}</h3>
        {coffee.reviewsCount > 0 && (
          <div className="mt-1 flex items-center gap-2">
            <Stars value={coffee.rating} />
            <span className="font-num text-[11px] text-muted">({coffee.reviewsCount})</span>
          </div>
        )}
        <div className="mt-3 flex items-center justify-between">
          <span className="font-num text-sm font-semibold">
            {formatIQD(coffee.prices.g250)}
          </span>
          <button
            disabled={coffee.soldOut}
            onClick={(e) => {
              e.preventDefault();
              if (coffee.soldOut) return;
              addToCart({
                slug: coffee.slug,
                variant: "G250",
                grind: "حبوب كاملة",
                name: coffee.name,
                meta: "٢٥٠غ · حبوب كاملة",
                priceShown: coffee.prices.g250,
              });
            }}
            aria-label={coffee.soldOut ? "نفذ مؤقتاً" : `أضف ${coffee.name}`}
            className={`flex h-9 items-center justify-center rounded-full text-olive-text transition-transform active:scale-90 ${
              coffee.soldOut ? "w-auto cursor-default bg-bg-alt px-3 text-[11px] font-bold !text-muted" : "w-9 bg-accent hover:scale-105"
            }`}
          >
            {coffee.soldOut ? "نفذ مؤقتاً" : <Plus size={17} />}
          </button>
        </div>
      </Link>
    </div>
  );
}

export function ToolCard({ tool }: { tool: Tool }) {
  const { addToCart, showToast } = useStore();
  return (
    <div className="group overflow-hidden rounded-[18px] border border-line bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-ink/5">
      <Link href={`/product/?t=${tool.slug}`} className="relative block">
        <ToolVisual tool={tool} className={`aspect-square ${tool.soldOut ? "opacity-55" : ""}`} />
        {tool.isNew && !tool.soldOut && <Badge label="جديد" />}
        {tool.soldOut && (
          <span className="absolute top-3 start-3 rounded-full bg-ink px-3 py-1 text-[11px] font-semibold text-bg">
            نفد
          </span>
        )}
        <FavBtn id={`t:${tool.slug}`} />
      </Link>
      <div className="p-4">
        <p className="text-[11px] text-muted">{tool.type}</p>
        <Link href={`/product/?t=${tool.slug}`}>
          <h3 className="mt-0.5 text-lg font-bold">{tool.name}</h3>
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <Stars value={tool.rating} />
          <span className="font-num text-[11px] text-muted">
            ({tool.reviewsCount})
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-num text-sm font-semibold">
            {formatIQD(tool.price)}
          </span>
          {tool.soldOut ? (
            <button
              onClick={() => showToast("راح ننبهك أول ما يرجع")}
              aria-label="نبّهني عند التوفر"
              title="نبّهني عند التوفر"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-gold hover:text-gold active:scale-90"
            >
              <Bell size={15} />
            </button>
          ) : (
            <button
              onClick={() =>
                addToCart({ slug: tool.slug, variant: "PIECE", name: tool.name, priceShown: tool.price })
              }
              aria-label={`أضف ${tool.name}`}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-olive-text transition-transform hover:scale-105 active:scale-90"
            >
              <Plus size={17} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
