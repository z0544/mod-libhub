import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from "@/hooks/queries";
import type { Category } from "@/lib/types";
import { ApiError } from "@/lib/api";
import { useI18n } from "@/context/i18n";

interface FormState {
  id?: number;
  name: string;
  icon: string;
  description: string;
}

const EMPTY: FormState = { name: "", icon: "", description: "" };

export function CategoriesAdminPage() {
  const { t } = useI18n();
  const { data: categories } = useCategories();
  const createMut = useCreateCategory();
  const updateMut = useUpdateCategory();
  const deleteMut = useDeleteCategory();

  // Parent categories have no direct items; show the sum across their children.
  const childrenOf = (id: number) => categories?.filter((c) => c.parentId === id) ?? [];
  const topLevel = categories?.filter((c) => c.parentId == null) ?? [];
  const totalCount = (c: Category) => {
    const kids = childrenOf(c.id);
    return kids.length ? kids.reduce((sum, k) => sum + (k.itemCount ?? 0), 0) : c.itemCount ?? 0;
  };

  const renderCard = (c: Category) => (
    <Card key={c.id}>
      <CardContent className="flex items-start justify-between gap-2 pt-6">
        <div className="flex items-start gap-3">
          <span className="text-3xl" aria-hidden>
            {c.icon ?? "📦"}
          </span>
          <div>
            <p className="font-semibold">{c.name}</p>
            <p className="text-sm text-muted-foreground">{c.description ?? t("cats.noDesc")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("cats.items", { count: totalCount(c) })}</p>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => remove(c)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  function openCreate() {
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(c: Category) {
    setForm({ id: c.id, name: c.name, icon: c.icon ?? "", description: c.description ?? "" });
    setOpen(true);
  }

  async function save() {
    if (!form.name.trim()) {
      toast.error(t("cats.nameRequired"));
      return;
    }
    const payload = { name: form.name.trim(), icon: form.icon.trim() || null, description: form.description.trim() || null };
    try {
      if (form.id) {
        await updateMut.mutateAsync({ id: form.id, ...payload });
        toast.success(t("cats.updated"));
      } else {
        await createMut.mutateAsync(payload);
        toast.success(t("cats.created"));
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("cats.saveFailed"));
    }
  }

  async function remove(c: Category) {
    if (!confirm(t("cats.deleteConfirm", { name: c.name }))) return;
    try {
      await deleteMut.mutateAsync(c.id);
      toast.success(t("cats.deleted"));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t("cats.deleteFailed");
      toast.error(msg);
    }
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ms-2">
        <Link to="/admin">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t("cats.back")}
        </Link>
      </Button>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t("cats.title")}</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          {t("cats.new")}
        </Button>
      </div>

      {/* Top-level categories */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("cats.topLevel")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{topLevel.map(renderCard)}</div>
      </div>

      {/* Sub-categories grouped under each parent */}
      {topLevel
        .filter((p) => childrenOf(p.id).length > 0)
        .map((parent) => (
          <div key={parent.id} className="space-y-3">
            <h2 className="flex items-center gap-2 border-t pt-4 text-lg font-semibold">
              <span aria-hidden>{parent.icon ?? "📦"}</span>
              {parent.name}
              <span className="text-sm font-normal text-muted-foreground">— {t("cats.subOf")}</span>
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{childrenOf(parent.id).map(renderCard)}</div>
          </div>
        ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? t("cats.dialog.edit") : t("cats.dialog.new")}</DialogTitle>
            <DialogDescription>{t("cats.dialog.desc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">{t("cats.field.name")}</Label>
              <Input id="cat-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-icon">{t("cats.field.icon")}</Label>
              <Input
                id="cat-icon"
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                placeholder="⚛️"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-desc">{t("cats.field.description")}</Label>
              <Textarea
                id="cat-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("action.cancel")}
            </Button>
            <Button onClick={save} disabled={createMut.isPending || updateMut.isPending}>
              {t("action.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
