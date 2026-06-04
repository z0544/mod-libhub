import { Link } from "react-router-dom";
import { Download, Package, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import { useI18n } from "@/context/i18n";
import type { ItemSummary } from "@/lib/types";

export function ItemCard({ item }: { item: ItemSummary }) {
  const { t } = useI18n();
  return (
    <Link to={`/items/${item.slug}`} className="group block">
      <Card className="h-full transition-all hover:border-primary/50 hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-2xl" aria-hidden>
                {item.category?.icon ?? "📦"}
              </span>
              <h3 className="truncate font-semibold text-base group-hover:text-primary">{item.title}</h3>
            </div>
            {item.recommendedVersion && (
              <Badge variant="success" className="shrink-0 gap-1">
                <Star className="h-3 w-3" />
                {item.recommendedVersion}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <p className="line-clamp-2 text-sm text-muted-foreground min-h-[2.5rem]">
            {item.description ?? t("item.noDescription")}
          </p>
        </CardContent>
        <CardFooter className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Package className="h-3.5 w-3.5" />
            {item.versionCount} {t("item.versions")}
          </span>
          <span className="inline-flex items-center gap-1">
            <Download className="h-3.5 w-3.5" />
            {formatNumber(item.totalDownloads)}
          </span>
          {item.category && <Badge variant="outline">{item.category.name}</Badge>}
        </CardFooter>
      </Card>
    </Link>
  );
}
