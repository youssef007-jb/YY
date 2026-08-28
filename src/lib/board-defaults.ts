/**
 * Whiteboard Creation Defaults Manager
 * 
 * IMPORTANT ARCHITECTURAL PRINCIPLE:
 * Homepage Dashboard Settings for Grid, Background Color, and Toolbar Placement
 * define the creation defaults for NEW whiteboards.
 * 
 * They MUST NOT retroactively mutate or rewrite existing whiteboards.
 * 
 * Flow:
 * 1. User changes Dashboard Settings -> stored in localStorage (`hbibo_whiteboard_creation_defaults`).
 * 2. User creates a new whiteboard or imports an asset -> copies current creation defaults into the new BoardRecord.
 * 3. Existing whiteboards retain their own persisted `bgColor`, `gridStyle`, and `toolbarPos`.
 */

export type WhiteboardGridStyle = "none" | "dot-grid" | "line-grid";
export type WhiteboardToolbarPos = "bottom" | "top" | "left" | "right";

export interface WhiteboardCreationDefaults {
  gridStyle: WhiteboardGridStyle;
  bgColor: string;
  toolbarPos: WhiteboardToolbarPos;
}

export const DEFAULT_CREATION_SETTINGS: WhiteboardCreationDefaults = {
  gridStyle: "none",
  bgColor: "#ffffff",
  toolbarPos: "bottom",
};

export const CREATION_DEFAULTS_STORAGE_KEY = "hbibo_whiteboard_creation_defaults";

export const PRESET_BG_COLORS = [
  { label: "White", value: "#ffffff", border: "border-slate-300" },
  { label: "Light Gray", value: "#f1f5f9", border: "border-slate-300" },
  { label: "Warm Cream", value: "#fef9c3", border: "border-amber-200" },
  { label: "Soft Blue", value: "#e0f2fe", border: "border-sky-200" },
  { label: "Soft Green", value: "#dcfce7", border: "border-emerald-200" },
  { label: "Dark Slate", value: "#1e293b", border: "border-slate-700" },
];

export function normalizeGridStyle(g: unknown): WhiteboardGridStyle {
  if (g === "dots" || g === "dot-grid" || g === "grid-dots") return "dot-grid";
  if (g === "lines" || g === "line-grid" || g === "grid-lines") return "line-grid";
  return "none";
}

export function normalizeToolbarPos(p: unknown): WhiteboardToolbarPos {
  if (p === "top" || p === "left" || p === "right" || p === "bottom") return p;
  return "bottom";
}

export function getWhiteboardCreationDefaults(): WhiteboardCreationDefaults {
  if (typeof window === "undefined") {
    return { ...DEFAULT_CREATION_SETTINGS };
  }
  try {
    const raw = localStorage.getItem(CREATION_DEFAULTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        gridStyle: normalizeGridStyle(parsed.gridStyle),
        bgColor: typeof parsed.bgColor === "string" && parsed.bgColor.trim() ? parsed.bgColor.trim() : DEFAULT_CREATION_SETTINGS.bgColor,
        toolbarPos: normalizeToolbarPos(parsed.toolbarPos),
      };
    }
  } catch {
    /* ignore parse errors */
  }
  return { ...DEFAULT_CREATION_SETTINGS };
}

export function setWhiteboardCreationDefaults(
  defaults: Partial<WhiteboardCreationDefaults>
): WhiteboardCreationDefaults {
  const current = getWhiteboardCreationDefaults();
  const next: WhiteboardCreationDefaults = {
    gridStyle: defaults.gridStyle !== undefined ? normalizeGridStyle(defaults.gridStyle) : current.gridStyle,
    bgColor: typeof defaults.bgColor === "string" && defaults.bgColor.trim() ? defaults.bgColor.trim() : current.bgColor,
    toolbarPos: defaults.toolbarPos !== undefined ? normalizeToolbarPos(defaults.toolbarPos) : current.toolbarPos,
  };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(CREATION_DEFAULTS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore storage errors */
    }
  }
  return next;
}
