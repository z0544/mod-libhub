import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Boxes, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth";
import { useI18n } from "@/context/i18n";
import { APP_NAME } from "@/i18n/translations";

export function LoginPage() {
  const { login } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(username, password);
      toast.success(t("login.welcome"));
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("login.failed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Boxes className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t("login.title", { app: APP_NAME })}</CardTitle>
          <CardDescription>{t("login.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t("login.username")}</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("login.password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              <LogIn className="h-4 w-4" />
              {submitting ? t("login.signingIn") : t("login.signIn")}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            {t("login.defaultAdmin")} <code className="font-mono" dir="ltr">admin / Admin123!</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
