import { Link } from "react-router-dom";
import { Boxes, Download, FolderTree, HardDrive, Layers, Package, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStats } from "@/hooks/queries";
import { formatBytes, formatNumber, formatDate } from "@/lib/format";
import { useI18n } from "@/context/i18n";

export function DashboardPage() {
  const { data, isLoading } = useDashboardStats();
  const { t } = useI18n();

  const stats = [
    { label: t("dash.stat.items"), value: data?.totalItems, icon: Package },
    { label: t("dash.stat.versions"), value: data?.totalVersions, icon: Layers },
    { label: t("dash.stat.categories"), value: data?.totalCategories, icon: FolderTree },
    { label: t("dash.stat.downloads"), value: data?.totalDownloads, icon: Download },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("dash.title")}</h1>
          <p className="text-muted-foreground">{t("dash.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/admin/categories">
              <FolderTree className="h-4 w-4" />
              {t("dash.categories")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/trash">
              <Trash2 className="h-4 w-4" />
              {t("dash.trash")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/items">
              <Boxes className="h-4 w-4" />
              {t("dash.manageItems")}
            </Link>
          </Button>
          <Button asChild>
            <Link to="/admin/items/new">
              <Plus className="h-4 w-4" />
              {t("dash.newItem")}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <s.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                {isLoading ? (
                  <Skeleton className="mt-1 h-7 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{formatNumber(s.value ?? 0)}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <HardDrive className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("dash.storage")}</p>
            {isLoading ? (
              <Skeleton className="mt-1 h-7 w-24" />
            ) : (
              <p className="text-2xl font-bold">{formatBytes(data?.storageBytes ?? 0)}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("dash.mostDownloaded")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data?.mostDownloaded.length ? (
              data.mostDownloaded.map((d) => (
                <div key={d.versionId} className="flex items-center justify-between">
                  <Link to={`/items/${d.item.slug}`} className="hover:underline">
                    {d.item.title} <span className="text-muted-foreground">· {d.versionName}</span>
                  </Link>
                  <span className="text-sm text-muted-foreground">{formatNumber(d.downloadCount)}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{t("dash.noDownloads")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dash.recentlyAdded")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data?.recentItems.length ? (
              data.recentItems.map((i) => (
                <div key={i.id} className="flex items-center justify-between">
                  <Link to={`/items/${i.slug}`} className="hover:underline">
                    {i.title}
                  </Link>
                  <span className="text-sm text-muted-foreground">{formatDate(i.createdAt)}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{t("dash.noItems")}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
