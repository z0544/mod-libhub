import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/context/i18n";

export function LanguageToggle() {
  const { language, toggle, t } = useI18n();
  return (
    <Button variant="ghost" size="sm" onClick={toggle} aria-label={t("lang.label")} className="gap-1.5 font-semibold">
      <Languages className="h-4 w-4" />
      {language === "he" ? "EN" : "עב"}
    </Button>
  );
}
