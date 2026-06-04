import { Outlet } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { useI18n } from "@/context/i18n";
import { APP_NAME } from "@/i18n/translations";

export function Layout() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-8">
        <Outlet />
      </main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        {APP_NAME} · {t("app.tagline")}
      </footer>
    </div>
  );
}
