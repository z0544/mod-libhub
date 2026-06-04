export type Role = "viewer" | "admin";

export interface AuthUser {
  id: number;
  username: string;
  fullName: string | null;
  role: Role;
}

export interface Category {
  id: number;
  name: string;
  icon: string | null;
  description: string | null;
  parentId?: number | null;
  itemCount?: number;
  createdAt?: string;
}

export interface ItemSummary {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  category: { id: number; name: string; icon: string | null } | null;
  versionCount: number;
  totalDownloads: number;
  recommendedVersion: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserRef {
  id: number;
  username: string;
  fullName: string | null;
}

export interface ItemVersion {
  id: number;
  itemId: number;
  versionName: string;
  releaseDate: string | null;
  filePath: string;
  fileName: string | null;
  fileSize: number | null;
  downloadCount: number;
  isRecommended: boolean;
  notes: string | null;
  exampleCode: string | null;
  metadata: Record<string, unknown> | null;
  uploadedBy?: UserRef | null;
  uploadedAt: string;
}

export interface ItemDetail {
  id: number;
  title: string;
  slug: string;
  categoryId: number | null;
  description: string | null;
  shortGuide: string | null;
  exampleCode: string | null;
  createdAt: string;
  updatedAt: string;
  category: Category | null;
  createdBy: UserRef | null;
  versions: ItemVersion[];
}

export interface DashboardStats {
  totalItems: number;
  totalCategories: number;
  totalVersions: number;
  totalDownloads: number;
  storageBytes: number;
  mostDownloaded: {
    versionId: number;
    versionName: string;
    downloadCount: number;
    item: { id: number; title: string; slug: string };
  }[];
  recentItems: { id: number; title: string; slug: string; createdAt: string }[];
}
