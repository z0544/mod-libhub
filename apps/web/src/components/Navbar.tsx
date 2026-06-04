import { Link, NavLink } from "react-router-dom";
import { Boxes, LayoutDashboard, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useAuth } from "@/context/auth";
import { useI18n } from "@/context/i18n";
import { APP_NAME } from "@/i18n/translations";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <Boxes className="h-6 w-6 text-primary" />
          <span>{APP_NAME}</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
                isActive && "bg-accent"
              )
            }
          >
            {t("nav.browse")}
          </NavLink>

          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent flex items-center gap-1.5",
                  isActive && "bg-accent"
                )
              }
            >
              <LayoutDashboard className="h-4 w-4" />
              {t("nav.admin")}
            </NavLink>
          )}

          <LanguageToggle />
          <ThemeToggle />

          {user ? (
            <div className="flex items-center gap-2 px-1">
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {user.fullName ?? user.username}
              </span>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">{t("nav.logout")}</span>
              </Button>
            </div>
          ) : (
            <Button asChild variant="default" size="sm">
              <Link to="/login">
                <LogIn className="h-4 w-4" />
                {t("nav.login")}
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
