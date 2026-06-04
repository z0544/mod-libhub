import { useMemo, useState } from "react";
import { LayoutGrid, List, Search, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ItemCard } from "@/components/ItemCard";
import { useCategories, useItems, type ItemFilters } from "@/hooks/queries";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { formatNumber } from "@/lib/format";
import { useI18n } from "@/context/i18n";

export function BrowsePage() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [topCategory, setTopCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [stable, setStable] = useState(false);
  const [sort, setSort] = useState<ItemFilters["sort"]>("recent");
  const [view, setView] = useState<"grid" | "list">("grid");

  const { data: categories } = useCategories();

  const topLevel = useMemo(() => categories?.filter((c) => c.parentId == null) ?? [], [categories]);
  const childrenOf = (id: number) => categories?.filter((c) => c.parentId === id) ?? [];
  const selectedTop = topLevel.find((c) => String(c.id) === topCategory);
  const subCats = selectedTop ? childrenOf(selectedTop.id) : [];

  // For a parent category, show the total items across its children.
  const totalCount = (c: { id: number; itemCount?: number }) => {
    const kids = childrenOf(c.id);
    return kids.length ? kids.reduce((sum, k) => sum + (k.itemCount ?? 0), 0) : c.itemCount ?? 0;
  };

  function selectTop(id: string) {
    setTopCategory(id);
    setSubCategory("");
  }

  const effectiveCategory = subCategory || topCategory;
  const filters: ItemFilters = useMemo(
    () => ({ search: search.trim() || undefined, category: effectiveCategory || undefined, stable, sort }),
    [search, effectiveCategory, stable, sort]
  );

  const { data: items, isLoading } = useItems(filters);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("browse.heroTitle")}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t("browse.heroSubtitle")}</p>
      </section>

      {/* Top-level category chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => selectTop("")}
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm transition-colors hover:bg-accent",
            topCategory === "" && "bg-primary text-primary-foreground hover:bg-primary"
          )}
        >
          {t("browse.all")}
        </button>
        {topLevel.map((c) => (
          <button
            key={c.id}
            onClick={() => selectTop(String(c.id))}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors hover:bg-accent inline-flex items-center gap-1.5",
              topCategory === String(c.id) && "bg-primary text-primary-foreground hover:bg-primary"
            )}
          >
            <span aria-hidden>{c.icon ?? "📦"}</span>
            {c.name}
            <span className="opacity-60">({totalCount(c)})</span>
          </button>
        ))}
      </div>

      {/* Sub-category chips (shown when a parent category is selected) */}
      {subCats.length > 0 && (
        <div className="-mt-4 flex flex-wrap gap-2 rounded-xl border bg-muted/30 p-3">
          <button
            onClick={() => setSubCategory("")}
            className={cn(
              "rounded-full border bg-background px-3 py-1.5 text-sm transition-colors hover:bg-accent inline-flex items-center gap-1.5",
              subCategory === "" && "bg-primary text-primary-foreground hover:bg-primary"
            )}
          >
            <span aria-hidden>{selectedTop?.icon ?? "📦"}</span>
            {t("browse.all")} {selectedTop?.name}
          </button>
          {subCats.map((c) => (
            <button
              key={c.id}
              onClick={() => setSubCategory(String(c.id))}
              className={cn(
                "rounded-full border bg-background px-3 py-1.5 text-sm transition-colors hover:bg-accent inline-flex items-center gap-1.5",
                subCategory === String(c.id) && "bg-primary text-primary-foreground hover:bg-primary"
              )}
            >
              <span aria-hidden>{c.icon ?? "📦"}</span>
              {c.name}
              <span className="opacity-60">({c.itemCount ?? 0})</span>
            </button>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("browse.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>

        <Button
          variant={stable ? "default" : "outline"}
          onClick={() => setStable((s) => !s)}
          className="gap-1.5"
        >
          <Star className="h-4 w-4" />
          {t("browse.stableOnly")}
        </Button>

        <Select value={sort} onChange={(e) => setSort(e.target.value as ItemFilters["sort"])} className="sm:w-44">
          <option value="recent">{t("browse.sort.recent")}</option>
          <option value="popular">{t("browse.sort.popular")}</option>
          <option value="title">{t("browse.sort.title")}</option>
        </Select>

        <div className="flex items-center rounded-md border p-0.5">
          <Button variant={view === "grid" ? "secondary" : "ghost"} size="icon" onClick={() => setView("grid")}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant={view === "list" ? "secondary" : "ghost"} size="icon" onClick={() => setView("list")}>
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            {t("browse.noItems")}
          </CardContent>
        </Card>
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="divide-y rounded-xl border">
          {items.map((item) => (
            <Link
              key={item.id}
              to={`/items/${item.slug}`}
              className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-accent/50"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl" aria-hidden>
                  {item.category?.icon ?? "📦"}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{item.title}</span>
                    {item.recommendedVersion && (
                      <Badge variant="success" className="gap-1">
                        <Star className="h-3 w-3" />
                        {item.recommendedVersion}
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <div className="hidden shrink-0 items-center gap-4 text-sm text-muted-foreground sm:flex">
                <span>{item.versionCount} {t("item.versions")}</span>
                <span>{formatNumber(item.totalDownloads)} {t("item.downloads")}</span>
                {item.category && <Badge variant="outline">{item.category.name}</Badge>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
