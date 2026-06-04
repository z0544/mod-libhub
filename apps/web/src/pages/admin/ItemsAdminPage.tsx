import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDeleteItem, useItems } from "@/hooks/queries";
import { formatNumber } from "@/lib/format";
import { useI18n } from "@/context/i18n";

export function ItemsAdminPage() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const { data: items, isLoading } = useItems({ sort: "title", search: search.trim() || undefined });
  const deleteMut = useDeleteItem();

  async function remove(id: number, title: string) {
    if (!confirm(t("items.deleteConfirm", { title }))) return;
    try {
      await deleteMut.mutateAsync(id);
      toast.success(t("items.deleted"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("items.deleteFailed"));
    }
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ms-2">
        <Link to="/admin">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t("items.back")}
        </Link>
      </Button>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t("items.title")}</h1>
        <Button asChild>
          <Link to="/admin/items/new">
            <Plus className="h-4 w-4" />
            {t("items.new")}
          </Link>
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("items.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ps-9"
          autoFocus
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("items.col.title")}</TableHead>
                <TableHead>{t("items.col.category")}</TableHead>
                <TableHead>{t("items.col.versions")}</TableHead>
                <TableHead>{t("items.col.downloads")}</TableHead>
                <TableHead className="text-end">{t("items.col.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    {t("items.loading")}
                  </TableCell>
                </TableRow>
              ) : !items || items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    {search.trim() ? t("items.noResults") : t("items.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-2">
                        <span aria-hidden>{item.category?.icon ?? "📦"}</span>
                        {item.title}
                      </span>
                    </TableCell>
                    <TableCell>
                      {item.category ? <Badge variant="outline">{item.category.name}</Badge> : "—"}
                    </TableCell>
                    <TableCell>{item.versionCount}</TableCell>
                    <TableCell>{formatNumber(item.totalDownloads)}</TableCell>
                    <TableCell className="text-end">
                      <div className="inline-flex gap-1">
                        <Button asChild variant="ghost" size="icon" title="View">
                          <Link to={`/items/${item.slug}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button asChild variant="ghost" size="icon" title="Edit">
                          <Link to={`/admin/items/${item.slug}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete"
                          onClick={() => remove(item.id, item.title)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
