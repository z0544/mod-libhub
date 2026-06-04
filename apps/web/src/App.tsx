import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BrowsePage } from "@/pages/BrowsePage";
import { ItemDetailPage } from "@/pages/ItemDetailPage";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/admin/DashboardPage";
import { ItemsAdminPage } from "@/pages/admin/ItemsAdminPage";
import { CategoriesAdminPage } from "@/pages/admin/CategoriesAdminPage";
import { ItemEditorPage } from "@/pages/admin/ItemEditorPage";
import { TrashPage } from "@/pages/admin/TrashPage";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<BrowsePage />} />
        <Route path="items/:slug" element={<ItemDetailPage />} />
        <Route path="login" element={<LoginPage />} />

        <Route element={<ProtectedRoute adminOnly />}>
          <Route path="admin" element={<DashboardPage />} />
          <Route path="admin/items" element={<ItemsAdminPage />} />
          <Route path="admin/items/new" element={<ItemEditorPage />} />
          <Route path="admin/items/:slug/edit" element={<ItemEditorPage />} />
          <Route path="admin/categories" element={<CategoriesAdminPage />} />
          <Route path="admin/trash" element={<TrashPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
