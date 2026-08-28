"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  Grid,
  CircleDot,
  Square,
  PanelBottom,
  PanelTop,
  PanelLeft,
  PanelRight,
  Palette,
  Check,
} from "lucide-react";
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
import {
  getWhiteboardCreationDefaults,
  setWhiteboardCreationDefaults,
  PRESET_BG_COLORS,
  type WhiteboardGridStyle,
  type WhiteboardToolbarPos,
  type WhiteboardCreationDefaults,
} from "@/lib/board-defaults";

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
  const [defaults, setDefaults] = useState<WhiteboardCreationDefaults>(getWhiteboardCreationDefaults());

  useEffect(() => {
    setTheme(getStoredTheme());
    setDefaults(getWhiteboardCreationDefaults());
  }, [open]);

  const toggleTheme = (checked: boolean) => {
    const mode: ThemeMode = checked ? "dark" : "light";
    setTheme(mode);
    applyTheme(mode);
  };

  const handleGridChange = (gridStyle: WhiteboardGridStyle) => {
    const updated = setWhiteboardCreationDefaults({ gridStyle });
    setDefaults(updated);
  };

  const handleBgColorChange = (bgColor: string) => {
    const updated = setWhiteboardCreationDefaults({ bgColor });
    setDefaults(updated);
  };

  const handleToolbarPosChange = (toolbarPos: WhiteboardToolbarPos) => {
    const updated = setWhiteboardCreationDefaults({ toolbarPos });
    setDefaults(updated);
  };

  return (
    <>
      <Button
        id="homepage-settings-button"
        variant="ghost"
        size="icon"
        className={className || "h-9 w-9 rounded-full shrink-0"}
        onClick={() => setOpen(true)}
        aria-label={t("settings")}
      >
        <Settings className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent id="homepage-settings-modal" className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight">{t("settings")}</DialogTitle>
            <DialogDescription className="sr-only">{t("settings")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-1">
            {/* New Whiteboard Defaults Section */}
            <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" />
                  {t("whiteboardDefaults")}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {t("whiteboardDefaultsDesc")}
                </p>
              </div>

              {/* Grid Pattern */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-foreground">{t("defaultGrid")}</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    id="setting-grid-none"
                    onClick={() => handleGridChange("none")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      defaults.gridStyle === "none"
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border bg-background hover:bg-muted text-foreground"
                    }`}
                  >
                    <Square className="h-3.5 w-3.5 opacity-70" />
                    <span>{t("gridNone")}</span>
                  </button>
                  <button
                    type="button"
                    id="setting-grid-dots"
                    onClick={() => handleGridChange("dot-grid")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      defaults.gridStyle === "dot-grid"
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border bg-background hover:bg-muted text-foreground"
                    }`}
                  >
                    <CircleDot className="h-3.5 w-3.5 opacity-70" />
                    <span>{t("gridDots")}</span>
                  </button>
                  <button
                    type="button"
                    id="setting-grid-lines"
                    onClick={() => handleGridChange("line-grid")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      defaults.gridStyle === "line-grid"
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border bg-background hover:bg-muted text-foreground"
                    }`}
                  >
                    <Grid className="h-3.5 w-3.5 opacity-70" />
                    <span>{t("gridLines")}</span>
                  </button>
                </div>
              </div>

              {/* Background Color */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-foreground">{t("defaultBgColor")}</Label>
                  <span className="text-[11px] font-mono text-muted-foreground uppercase">{defaults.bgColor}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {PRESET_BG_COLORS.map((preset) => {
                    const isSelected = defaults.bgColor.toLowerCase() === preset.value.toLowerCase();
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        id={`setting-bg-${preset.value.replace("#", "")}`}
                        onClick={() => handleBgColorChange(preset.value)}
                        title={preset.label}
                        className={`group relative h-7 w-7 rounded-full border ${preset.border} shadow-2xs transition-transform hover:scale-110 flex items-center justify-center`}
                        style={{ backgroundColor: preset.value }}
                      >
                        {isSelected && (
                          <Check
                            className={`h-3.5 w-3.5 ${
                              preset.value === "#1e293b" ? "text-white" : "text-slate-900"
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                  <div className="relative inline-flex items-center ml-1">
                    <input
                      type="color"
                      id="setting-bg-custom-color"
                      value={defaults.bgColor}
                      onChange={(e) => handleBgColorChange(e.target.value)}
                      className="h-7 w-7 cursor-pointer rounded-full border border-border bg-transparent p-0 opacity-0 absolute inset-0 z-10"
                      title="Custom Color"
                    />
                    <div
                      className="h-7 w-7 rounded-full border border-border shadow-2xs flex items-center justify-center text-[10px] font-medium transition-transform hover:scale-110"
                      style={{ backgroundColor: defaults.bgColor }}
                    >
                      <Palette className="h-3.5 w-3.5 opacity-70" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Toolbar Placement */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-foreground">{t("defaultToolbar")}</Label>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    id="setting-toolbar-bottom"
                    onClick={() => handleToolbarPosChange("bottom")}
                    className={`flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-medium border transition-colors ${
                      defaults.toolbarPos === "bottom"
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border bg-background hover:bg-muted text-foreground"
                    }`}
                  >
                    <PanelBottom className="h-3.5 w-3.5" />
                    <span>{t("toolbarBottom")}</span>
                  </button>
                  <button
                    type="button"
                    id="setting-toolbar-top"
                    onClick={() => handleToolbarPosChange("top")}
                    className={`flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-medium border transition-colors ${
                      defaults.toolbarPos === "top"
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border bg-background hover:bg-muted text-foreground"
                    }`}
                  >
                    <PanelTop className="h-3.5 w-3.5" />
                    <span>{t("toolbarTop")}</span>
                  </button>
                  <button
                    type="button"
                    id="setting-toolbar-left"
                    onClick={() => handleToolbarPosChange("left")}
                    className={`flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-medium border transition-colors ${
                      defaults.toolbarPos === "left"
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border bg-background hover:bg-muted text-foreground"
                    }`}
                  >
                    <PanelLeft className="h-3.5 w-3.5" />
                    <span>{t("toolbarLeft")}</span>
                  </button>
                  <button
                    type="button"
                    id="setting-toolbar-right"
                    onClick={() => handleToolbarPosChange("right")}
                    className={`flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-medium border transition-colors ${
                      defaults.toolbarPos === "right"
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border bg-background hover:bg-muted text-foreground"
                    }`}
                  >
                    <PanelRight className="h-3.5 w-3.5" />
                    <span>{t("toolbarRight")}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* General App Settings (Theme & Language) */}
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="theme-toggle" className="text-sm font-medium">{t("appearance")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {theme === "dark" ? t("darkMode") : t("lightMode")}
                  </p>
                </div>
                <Switch id="theme-toggle" checked={theme === "dark"} onCheckedChange={toggleTheme} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lang-select" className="text-sm font-medium">{t("language")}</Label>
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
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
