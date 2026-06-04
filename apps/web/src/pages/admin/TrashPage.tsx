import { Link } from "react-router-dom";
import { ArrowLeft, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  usePurgeCategory,
  usePurgeItem,
  useRestoreCategory,
  useRestoreItem,
  useTrash,
} from "@/hooks/queries";
import { useI18n } from "@/context/i18n";
import { formatDate } from "@/lib/format";

export function TrashPage() {
  const { t } = useI18n();
  const { data, isLoading } = useTrash();
  const restoreItem = useRestoreItem();
  const purgeItem = usePurgeItem();
  const restoreCategory = useRestoreCategory();
  const purgeCategory = usePurgeCategory();

  async function run(action: Promise<unknown>, successKey: string) {
    try {
      await action;
      toast.success(t(successKey));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("trash.actionFailed"));
    }
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ms-2">
        <Link to="/admin">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t("trash.back")}
        </Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold tracking-tight inline-flex items-center gap-2">
          <Trash2 className="h-7 w-7" />
          {t("trash.title")}
        </h1>
        <p className="text-muted-foreground">{t("trash.subtitle")}</p>
      </div>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t("trash.items")} {data ? `(${data.items.length})` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t("action.loading")}</p>
          ) : !data?.items.length ? (
            <p className="text-sm text-muted-foreground">{t("trash.emptyItems")}</p>
          ) : (
            data.items.map((it) => (
              <div key={it.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl" aria-hidden>
                    {it.category?.icon ?? "📦"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{it.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {it.category?.name ?? "—"} · {t("trash.deletedAt")}: {formatDate(it.deletedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => run(restoreItem.mutateAsync(it.id), "trash.restored")}
                  >
                    <RotateCcw className="h-4 w-4" />
                    {t("trash.restore")}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm(t("trash.purgeConfirm", { name: it.title })))
                        run(purgeItem.mutateAsync(it.id), "trash.purged");
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("trash.purge")}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t("trash.categories")} {data ? `(${data.categories.length})` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t("action.loading")}</p>
          ) : !data?.categories.length ? (
            <p className="text-sm text-muted-foreground">{t("trash.emptyCategories")}</p>
          ) : (
            data.categories.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl" aria-hidden>
                    {c.icon ?? "📦"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("trash.deletedAt")}: {formatDate(c.deletedAt)}
                    </p>
                  </div>
                  <Badge variant="outline">{t("trash.categories")}</Badge>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => run(restoreCategory.mutateAsync(c.id), "trash.restored")}
                  >
                    <RotateCcw className="h-4 w-4" />
                    {t("trash.restore")}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm(t("trash.purgeConfirm", { name: c.name })))
                        run(purgeCategory.mutateAsync(c.id), "trash.purged");
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("trash.purge")}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
