import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Category, DashboardStats, ItemDetail, ItemSummary, ItemVersion } from "@/lib/types";

export interface ItemFilters {
  search?: string;
  category?: string;
  stable?: boolean;
  sort?: "recent" | "popular" | "title";
}

function buildItemQuery(filters: ItemFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.category) params.set("category", filters.category);
  if (filters.stable) params.set("stable", "true");
  if (filters.sort) params.set("sort", filters.sort);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetch<Category[]>("/categories"),
  });
}

export function useItems(filters: ItemFilters) {
  return useQuery({
    queryKey: ["items", filters],
    queryFn: () => apiFetch<ItemSummary[]>(`/items${buildItemQuery(filters)}`),
  });
}

export function useItem(slug: string | undefined) {
  return useQuery({
    queryKey: ["item", slug],
    queryFn: () => apiFetch<ItemDetail>(`/items/${slug}`),
    enabled: !!slug,
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<DashboardStats>("/dashboard/stats"),
  });
}

// ---- Mutations ----

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Category>) => apiFetch<Category>("/categories", { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Category> & { id: number }) =>
      apiFetch<Category>(`/categories/${id}`, { method: "PUT", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["trash"] });
    },
  });
}

export interface ItemInput {
  title: string;
  slug?: string;
  categoryId?: number | null;
  description?: string | null;
  shortGuide?: string | null;
  exampleCode?: string | null;
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ItemInput) => apiFetch<ItemDetail>("/items", { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["items"] }),
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: ItemInput & { id: number }) =>
      apiFetch<ItemDetail>(`/items/${id}`, { method: "PUT", body }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["items"] });
      void vars;
      qc.invalidateQueries({ queryKey: ["item"] });
    },
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/items/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
      qc.invalidateQueries({ queryKey: ["trash"] });
    },
  });
}

export interface TrashData {
  categories: { id: number; name: string; icon: string | null; deletedAt: string }[];
  items: {
    id: number;
    title: string;
    slug: string;
    deletedAt: string;
    category: { id: number; name: string; icon: string | null } | null;
    versionCount: number;
  }[];
}

export function useTrash() {
  return useQuery({ queryKey: ["trash"], queryFn: () => apiFetch<TrashData>("/trash") });
}

function useTrashMutation(buildPath: (id: number) => string, method: "POST" | "DELETE") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(buildPath(id), { method }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trash"] });
      qc.invalidateQueries({ queryKey: ["items"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export const useRestoreItem = () => useTrashMutation((id) => `/items/${id}/restore`, "POST");
export const usePurgeItem = () => useTrashMutation((id) => `/items/${id}/permanent`, "DELETE");
export const useRestoreCategory = () => useTrashMutation((id) => `/categories/${id}/restore`, "POST");
export const usePurgeCategory = () => useTrashMutation((id) => `/categories/${id}/permanent`, "DELETE");

export function useUploadVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, formData }: { itemId: number; formData: FormData }) =>
      apiFetch<ItemVersion>(`/items/${itemId}/versions`, { method: "POST", body: formData, raw: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["item"] });
      qc.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useUpdateVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<ItemVersion> & { id: number }) =>
      apiFetch<ItemVersion>(`/item-versions/${id}`, { method: "PUT", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["item"] }),
  });
}

export function useDeleteVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/item-versions/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["item"] }),
  });
}
