"use client";

import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANGUAGES, THEME_STORAGE_KEY, useI18n, type LangCode } from "@/lib/i18n";

type ThemeMode = "light" | "dark";

function getStoredTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === "dark" || v === "light") return v;
  } catch {
    /* ignore */
  }
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function applyTheme(mode: ThemeMode) {
  document.documentElement.classList.toggle("dark", mode === "dark");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function HomeSettings({ className }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  const toggleTheme = (checked: boolean) => {
    const mode: ThemeMode = checked ? "dark" : "light";
    setTheme(mode);
    applyTheme(mode);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={className || "h-9 w-9 rounded-full shrink-0"}
        onClick={() => setOpen(true)}
        aria-label={t("settings")}
      >
        <Settings className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("settings")}</DialogTitle>
            <DialogDescription className="sr-only">{t("settings")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-2">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="theme-toggle">{t("appearance")}</Label>
                <p className="text-xs text-muted-foreground">
                  {theme === "dark" ? t("darkMode") : t("lightMode")}
                </p>
              </div>
              <Switch id="theme-toggle" checked={theme === "dark"} onCheckedChange={toggleTheme} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lang-select">{t("language")}</Label>
              <Select value={lang} onValueChange={(v) => setLang(v as LangCode)}>
                <SelectTrigger id="lang-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
