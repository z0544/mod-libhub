import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Star, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useCategories,
  useCreateItem,
  useDeleteVersion,
  useItem,
  useUpdateItem,
  useUpdateVersion,
  useUploadVersion,
  type ItemInput,
} from "@/hooks/queries";
import { formatBytes, formatDate } from "@/lib/format";
import { useI18n } from "@/context/i18n";

const EMPTY: ItemInput = {
  title: "",
  slug: "",
  categoryId: null,
  description: "",
  shortGuide: "",
  exampleCode: "",
};

export function ItemEditorPage() {
  const { t } = useI18n();
  const { slug } = useParams();
  const isEdit = !!slug;
  const navigate = useNavigate();

  const { data: categories } = useCategories();
  const { data: item } = useItem(slug);
  const createMut = useCreateItem();
  const updateMut = useUpdateItem();

  const [form, setForm] = useState<ItemInput>(EMPTY);

  useEffect(() => {
    if (item) {
      setForm({
        title: item.title,
        slug: item.slug,
        categoryId: item.categoryId,
        description: item.description ?? "",
        shortGuide: item.shortGuide ?? "",
        exampleCode: item.exampleCode ?? "",
      });
    }
  }, [item]);

  async function saveItem() {
    if (!form.title.trim()) {
      toast.error(t("editor.titleRequired"));
      return;
    }
    try {
      if (isEdit && item) {
        await updateMut.mutateAsync({ id: item.id, ...form });
        toast.success(t("editor.saved"));
      } else {
        const created = await createMut.mutateAsync(form);
        toast.success(t("editor.created"));
        navigate(`/admin/items/${created.slug}/edit`, { replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("editor.saveFailed"));
    }
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ms-2">
        <Link to="/admin/items">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t("editor.back")}
        </Link>
      </Button>

      <h1 className="text-3xl font-bold tracking-tight">
        {isEdit ? t("editor.editItem", { title: item?.title ?? "" }) : t("editor.newItem")}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("editor.details")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="title">{t("editor.title")}</Label>
            <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">{t("editor.slug")}</Label>
            <Input
              id="slug"
              dir="ltr"
              value={form.slug ?? ""}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder={t("editor.slugPlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">{t("editor.category")}</Label>
            <Select
              id="category"
              value={form.categoryId ?? ""}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">{t("editor.none")}</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">{t("editor.description")}</Label>
            <Textarea
              id="description"
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="guide">{t("editor.guide")}</Label>
            <Textarea
              id="guide"
              dir="ltr"
              className="min-h-[140px] font-mono text-xs"
              value={form.shortGuide ?? ""}
              onChange={(e) => setForm({ ...form, shortGuide: e.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="example">{t("editor.example")}</Label>
            <Textarea
              id="example"
              dir="ltr"
              className="min-h-[140px] font-mono text-xs"
              value={form.exampleCode ?? ""}
              onChange={(e) => setForm({ ...form, exampleCode: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveItem} disabled={createMut.isPending || updateMut.isPending}>
          <Save className="h-4 w-4" />
          {isEdit ? t("editor.saveChanges") : t("editor.createItem")}
        </Button>
      </div>

      {isEdit && item && <VersionsManager itemId={item.id} />}
    </div>
  );
}

function VersionsManager({ itemId }: { itemId: number }) {
  const { t } = useI18n();
  const { data: item } = useItem(useParams().slug);
  const uploadMut = useUploadVersion();
  const updateVersionMut = useUpdateVersion();
  const deleteVersionMut = useDeleteVersion();

  const [file, setFile] = useState<File | null>(null);
  const [versionName, setVersionName] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [isRecommended, setIsRecommended] = useState(false);
  const [notes, setNotes] = useState("");
  const [metadata, setMetadata] = useState("");

  async function upload() {
    if (!file) {
      toast.error(t("editor.selectFile"));
      return;
    }
    if (!versionName.trim()) {
      toast.error(t("editor.versionNameRequired"));
      return;
    }
    if (metadata.trim()) {
      try {
        JSON.parse(metadata);
      } catch {
        toast.error(t("editor.invalidJson"));
        return;
      }
    }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("versionName", versionName.trim());
    if (releaseDate) fd.append("releaseDate", releaseDate);
    fd.append("isRecommended", String(isRecommended));
    if (notes.trim()) fd.append("notes", notes.trim());
    if (metadata.trim()) fd.append("metadata", metadata.trim());

    try {
      await uploadMut.mutateAsync({ itemId, formData: fd });
      toast.success(t("editor.uploaded"));
      setFile(null);
      setVersionName("");
      setReleaseDate("");
      setIsRecommended(false);
      setNotes("");
      setMetadata("");
      (document.getElementById("version-file") as HTMLInputElement | null)?.value &&
        ((document.getElementById("version-file") as HTMLInputElement).value = "");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("editor.uploadFailed"));
    }
  }

  async function setRecommended(id: number) {
    try {
      await updateVersionMut.mutateAsync({ id, isRecommended: true });
      toast.success(t("editor.recommendedSet"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("editor.failed"));
    }
  }

  async function removeVersion(id: number, name: string) {
    if (!confirm(t("editor.deleteVersionConfirm", { name }))) return;
    try {
      await deleteVersionMut.mutateAsync(id);
      toast.success(t("editor.versionDeleted"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("editor.deleteFailed"));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("editor.versions")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("editor.col.version")}</TableHead>
              <TableHead>{t("editor.col.released")}</TableHead>
              <TableHead>{t("editor.col.size")}</TableHead>
              <TableHead>{t("editor.col.downloads")}</TableHead>
              <TableHead className="text-end">{t("editor.col.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {item?.versions.length ? (
              item.versions.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center gap-2">
                      {v.versionName}
                      {v.isRecommended && (
                        <Badge variant="success" className="gap-1">
                          <Star className="h-3 w-3" /> {t("detail.recommended")}
                        </Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(v.releaseDate)}</TableCell>
                  <TableCell>{formatBytes(v.fileSize)}</TableCell>
                  <TableCell>{v.downloadCount}</TableCell>
                  <TableCell className="text-end">
                    <div className="inline-flex gap-1">
                      {!v.isRecommended && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t("editor.markRecommendedTitle")}
                          onClick={() => setRecommended(v.id)}
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        title={t("editor.delete")}
                        onClick={() => removeVersion(v.id, v.versionName)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                  {t("editor.noVersions")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="rounded-lg border border-dashed p-4">
          <h3 className="mb-4 font-semibold">{t("editor.addVersion")}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="version-file">{t("editor.file")}</Label>
              <Input
                id="version-file"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="version-name">{t("editor.versionName")}</Label>
              <Input
                id="version-name"
                dir="ltr"
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                placeholder="19.2.7"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="release-date">{t("editor.releaseDate")}</Label>
              <Input
                id="release-date"
                type="date"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <input
                id="recommended"
                type="checkbox"
                checked={isRecommended}
                onChange={(e) => setIsRecommended(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="recommended">{t("editor.markRecommended")}</Label>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">{t("editor.releaseNotes")}</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="metadata">{t("editor.metadata")}</Label>
              <Textarea
                id="metadata"
                dir="ltr"
                className="font-mono text-xs"
                value={metadata}
                onChange={(e) => setMetadata(e.target.value)}
                placeholder='{ "requires": "Node >= 18" }'
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={upload} disabled={uploadMut.isPending}>
              <Upload className="h-4 w-4" />
              {uploadMut.isPending ? t("editor.uploading") : t("editor.uploadVersion")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
