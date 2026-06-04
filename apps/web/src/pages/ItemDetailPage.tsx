import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, Pencil, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Markdown } from "@/components/Markdown";
import { useItem } from "@/hooks/queries";
import { useAuth } from "@/context/auth";
import { useI18n } from "@/context/i18n";
import { downloadUrl } from "@/lib/api";
import { formatBytes, formatDate, formatNumber } from "@/lib/format";
import type { ItemVersion } from "@/lib/types";

export function ItemDetailPage() {
  const { slug } = useParams();
  const { isAdmin } = useAuth();
  const { t } = useI18n();
  const { data: item, isLoading, isError } = useItem(slug);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !item) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">{t("detail.notFound")}</p>
        <Button asChild variant="link">
          <Link to="/">{t("detail.back")}</Link>
        </Button>
      </div>
    );
  }

  const recommended = item.versions.find((v) => v.isRecommended) ?? item.versions[0];
  const totalDownloads = item.versions.reduce((sum, v) => sum + v.downloadCount, 0);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ms-2">
        <Link to="/">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t("detail.back")}
        </Link>
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="text-5xl" aria-hidden>
            {item.category?.icon ?? "📦"}
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{item.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {item.category && <Badge variant="outline">{item.category.name}</Badge>}
              <span>{item.versions.length} {t("item.versions")}</span>
              <span>· {formatNumber(totalDownloads)} {t("item.downloads")}</span>
            </div>
            {item.description && <p className="mt-3 max-w-2xl text-muted-foreground">{item.description}</p>}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {recommended && (
            <Button asChild>
              <a href={downloadUrl(recommended.id)}>
                <Download className="h-4 w-4" />
                {t("detail.download", { version: recommended.versionName })}
              </a>
            </Button>
          )}
          {isAdmin && (
            <Button asChild variant="outline">
              <Link to={`/admin/items/${item.slug}/edit`}>
                <Pencil className="h-4 w-4" />
                {t("detail.edit")}
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="versions">
        <TabsList>
          <TabsTrigger value="versions">{t("detail.tab.versions")}</TabsTrigger>
          <TabsTrigger value="guide">{t("detail.tab.guide")}</TabsTrigger>
          <TabsTrigger value="example">{t("detail.tab.example")}</TabsTrigger>
        </TabsList>

        <TabsContent value="versions">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("detail.col.version")}</TableHead>
                    <TableHead>{t("detail.col.released")}</TableHead>
                    <TableHead>{t("detail.col.size")}</TableHead>
                    <TableHead>{t("detail.col.downloads")}</TableHead>
                    <TableHead>{t("detail.col.uploadedBy")}</TableHead>
                    <TableHead className="text-end">{t("detail.col.download")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {item.versions.map((v) => (
                    <VersionRow key={v.id} version={v} t={t} />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {item.versions.some((v) => v.notes || v.metadata) && (
            <div className="mt-4 space-y-3">
              {item.versions
                .filter((v) => v.notes)
                .map((v) => (
                  <Card key={v.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        {t("detail.releaseNotes", { version: v.versionName })}
                        {v.isRecommended && (
                          <Badge variant="success" className="gap-1">
                            <Star className="h-3 w-3" /> {t("detail.recommended")}
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Markdown content={v.notes} />
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="guide">
          <Card>
            <CardContent className="pt-6">
              <Markdown content={item.shortGuide} emptyText={t("detail.noGuide")} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="example">
          <Card>
            <CardContent className="pt-6">
              <Markdown content={item.exampleCode} emptyText={t("detail.noExample")} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function VersionRow({ version, t }: { version: ItemVersion; t: (key: string) => string }) {
  return (
    <TableRow>
      <TableCell className="font-medium">
        <span className="inline-flex items-center gap-2">
          {version.versionName}
          {version.isRecommended && (
            <Badge variant="success" className="gap-1">
              <Star className="h-3 w-3" /> {t("detail.recommended")}
            </Badge>
          )}
        </span>
      </TableCell>
      <TableCell>{formatDate(version.releaseDate)}</TableCell>
      <TableCell>{formatBytes(version.fileSize)}</TableCell>
      <TableCell>{formatNumber(version.downloadCount)}</TableCell>
      <TableCell className="text-muted-foreground">
        {version.uploadedBy?.fullName ?? version.uploadedBy?.username ?? "—"}
      </TableCell>
      <TableCell className="text-end">
        <Button asChild size="sm" variant="outline">
          <a href={downloadUrl(version.id)}>
            <Download className="h-4 w-4" />
          </a>
        </Button>
      </TableCell>
    </TableRow>
  );
}
