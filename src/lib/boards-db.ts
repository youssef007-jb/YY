/* IndexedDB access for whiteboards — mirrors public/whiteboard-store.js. */

export type LayerRecord = {
  id: string;
  name: string;
  elements?: unknown[];
  createdAt: number;
  updatedAt: number;
  visible?: boolean;
  locked?: boolean;
};

export type BoardRecord = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  elements: unknown[];
  camera: { x: number; y: number; zoom: number };
  gridStyle: string;
  gridSpacing: number;
  bgColor: string;
  theme: string;
  toolbarPos: string;
  stickyAutoEdit: boolean;
  thumb: string | null;
  phase?: string | undefined;
  week?: string | undefined;
  phase_category?: number | null | undefined;
  week_category?: number | null | undefined;
  docId?: string | undefined;
  needsFitToScreen?: boolean | undefined;
  fitToScreenOnOpen?: boolean | undefined;
  layers?: unknown[] | undefined;
  activeLayerId?: string | undefined;
};

const DB_NAME = "hbibo-whiteboards";
const DB_VERSION = 1;
const STORE = "boards";
const MIGRATION_FLAG = "hbibo_idb_migrated_v1";
const LEGACY_BOARDS = "hbibo_v4_boards";
const LEGACY_CURRENT = "hbibo_v4_current";

let dbPromise: Promise<IDBDatabase> | null = null;
let _workspaceBoardPayload: BoardRecord | null = null;

export function setWorkspaceBoardPayload(board: BoardRecord | null) {
  _workspaceBoardPayload = board ? (JSON.parse(JSON.stringify(board)) as BoardRecord) : null;
}

export function getWorkspaceBoardPayload(id?: string): BoardRecord | null {
  if (_workspaceBoardPayload && (!id || _workspaceBoardPayload.id === id)) {
    return _workspaceBoardPayload;
  }
  return null;
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Storage is unavailable in this browser"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: "id" });
        os.createIndex("updatedAt", "updatedAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Failed to open storage"));
  });
  return dbPromise;
}

function run<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = fn(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = () => reject(tx.error ?? new Error("Storage request failed"));
        tx.onabort = () => reject(tx.error ?? new Error("Storage request aborted"));
      }),
  );
}

export function genBoardId() {
  return "b" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function genLayerId() {
  return "l" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function normalizePhaseString(phase?: string | null): string | undefined {
  if (!phase || typeof phase !== "string") return undefined;
  const trimmed = phase.trim();
  if (!trimmed) return undefined;
  const m = trimmed.match(/^phase\s*(\d+)$/i);
  if (m) return `Phase ${m[1]}`;
  const m2 = trimmed.match(/^phase\b(.*)$/i);
  if (m2) return `Phase${m2[1]}`;
  return trimmed;
}

export function extractPhaseAndWeekCategories(filename: string): {
  phase_category: number | null;
  week_category: number | null;
  phase?: string | undefined;
  week?: string | undefined;
} {
  if (!filename || typeof filename !== "string") {
    return { phase_category: null, week_category: null };
  }
  const phaseMatch = filename.match(/phase[:\s_\-/]*(\d+)/i);
  const weekMatch = filename.match(/week[:\s_\-/]*(\d+)/i);

  const phaseNum = phaseMatch ? parseInt(phaseMatch[1] ?? "", 10) : null;
  const weekNum = weekMatch ? parseInt(weekMatch[1] ?? "", 10) : null;

  const validPhase = phaseNum !== null && !Number.isNaN(phaseNum) ? phaseNum : null;
  const validWeek = weekNum !== null && !Number.isNaN(weekNum) ? weekNum : null;

  return {
    phase_category: validPhase,
    week_category: validWeek,
    phase: validPhase !== null ? `Phase ${validPhase}` : undefined,
    week: validWeek !== null ? String(validWeek) : undefined,
  };
}

export function autoExtractPhaseAndWeek(name: string): {
  phase?: string | undefined;
  week?: string | undefined;
  phase_category: number | null;
  week_category: number | null;
} {
  return extractPhaseAndWeekCategories(name);
}

import { getWhiteboardCreationDefaults } from "./board-defaults";

export function normalizeBoard(b: BoardRecord): BoardRecord {
  if (!b) return b;
  const title =
    b.name && typeof b.name === "string" && b.name.length > 0 ? b.name : b.name || "Untitled";
  b.name = title;

  // Extract elements directly or from legacy layers if present
  let rawElements = Array.isArray(b.elements) ? b.elements : [];
  if (rawElements.length === 0 && Array.isArray(b.layers) && b.layers.length > 0) {
    const layerEls = (b.layers[0] as { elements?: unknown[] })?.elements;
    if (Array.isArray(layerEls) && layerEls.length > 0) {
      rawElements = layerEls;
    }
  }
  b.elements = rawElements;
  b.bgColor = b.bgColor || "#ffffff";
  if (b.phase) {
    b.phase = normalizePhaseString(b.phase) ?? b.phase;
  }
  b.gridStyle = b.gridStyle || "none";
  b.toolbarPos = b.toolbarPos || "bottom";
  b.theme = b.theme === "blueprint" ? "blueprint" : "classlight";
  return b;
}

export function blankBoard(name?: string): BoardRecord {
  const defaults = getWhiteboardCreationDefaults();
  const now = Date.now();
  const title = name || "Untitled";
  const cat = autoExtractPhaseAndWeek(title);
  return {
    id: genBoardId(),
    name: title,
    createdAt: now,
    updatedAt: now,
    elements: [],
    camera: { x: 0, y: 0, zoom: 1 },
    gridStyle: defaults.gridStyle,
    gridSpacing: 24,
    bgColor: defaults.bgColor,
    theme: "classlight",
    toolbarPos: defaults.toolbarPos,
    stickyAutoEdit: false,
    thumb: null,
    phase: cat.phase,
    week: cat.week,
    phase_category: cat.phase_category,
    week_category: cat.week_category,
  };
}

export async function listBoards(): Promise<BoardRecord[]> {
  await migrateLegacy();
  const all = await run<BoardRecord[]>("readonly", (s) => s.getAll() as IDBRequest<BoardRecord[]>);
  const normalized = (all ?? []).filter((b) => !b.docId || b.docId === b.id).map(normalizeBoard);
  return normalized.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export async function getBoard(id: string): Promise<BoardRecord | null> {
  const b = await run<BoardRecord | undefined>(
    "readonly",
    (s) => s.get(id) as IDBRequest<BoardRecord | undefined>,
  );
  return b ? normalizeBoard(b) : null;
}

export async function putBoard(board: BoardRecord): Promise<BoardRecord> {
  normalizeBoard(board);
  if (
    board.phase_category === undefined ||
    board.week_category === undefined ||
    (!board.phase && !board.week)
  ) {
    const cat = autoExtractPhaseAndWeek(board.name || "");
    if (cat.phase && !board.phase) board.phase = cat.phase;
    if (cat.week && !board.week) board.week = cat.week;
    if (board.phase_category === undefined) {
      board.phase_category = cat.phase_category;
    }
    if (board.week_category === undefined) {
      board.week_category = cat.week_category;
    }
  }
  await run("readwrite", (s) => s.put(board));
  return board;
}

export async function createBoard(name?: string): Promise<BoardRecord> {
  return putBoard(blankBoard(name));
}

export async function deleteBoard(id: string): Promise<void> {
  await run("readwrite", (s) => s.delete(id));
}

export async function duplicateBoard(id: string): Promise<BoardRecord | null> {
  const src = await getBoard(id);
  if (!src) return null;
  const now = Date.now();
  const copyName = `${src.name || "Untitled"} Copy`;
  const cat = autoExtractPhaseAndWeek(copyName);
  const newBoardId = genBoardId();
  const rawElements = Array.isArray(src.elements) ? JSON.parse(JSON.stringify(src.elements)) : [];

  const copy: BoardRecord = {
    ...(JSON.parse(JSON.stringify(src)) as BoardRecord),
    id: newBoardId,
    name: copyName,
    elements: rawElements,
    createdAt: now,
    updatedAt: now,
    phase: src.phase || cat.phase,
    week: src.week || cat.week,
    phase_category: src.phase_category ?? cat.phase_category,
    week_category: src.week_category ?? cat.week_category,
  };
  delete (copy as any).layers;
  delete (copy as any).activeLayerId;
  return putBoard(copy);
}

export async function renameBoard(id: string, name: string): Promise<BoardRecord | null> {
  const b = await getBoard(id);
  if (!b) return null;
  const newName = name && name.length > 0 ? name : "Untitled";
  b.name = newName;
  b.updatedAt = Date.now();
  const cat = autoExtractPhaseAndWeek(newName);
  if (cat.phase_category !== null) {
    b.phase = cat.phase;
    b.phase_category = cat.phase_category;
  } else {
    delete b.phase;
    b.phase_category = null;
  }
  if (cat.week_category !== null) {
    b.week = cat.week;
    b.week_category = cat.week_category;
  } else {
    delete b.week;
    b.week_category = null;
  }
  delete (b as any).layers;
  delete (b as any).activeLayerId;
  return putBoard(b);
}

export async function migrateLegacy(): Promise<void> {
  let done = false;
  try {
    done = localStorage.getItem(MIGRATION_FLAG) === "1";
  } catch {
    return;
  }
  if (done) return;
  let legacy: BoardRecord[] | null = null;
  try {
    const raw = localStorage.getItem(LEGACY_BOARDS);
    if (raw) legacy = JSON.parse(raw) as BoardRecord[];
  } catch {
    legacy = null;
  }
  if (Array.isArray(legacy) && legacy.length) {
    const existing = await run<BoardRecord[]>(
      "readonly",
      (s) => s.getAll() as IDBRequest<BoardRecord[]>,
    );
    const known = new Set((existing ?? []).map((b) => b.id));
    for (let i = 0; i < legacy.length; i++) {
      const b = legacy[i];
      if (!b || known.has(b.id)) continue;
      const now = Date.now();
      const title = b.name || (legacy.length === 1 ? "My Whiteboard" : `Whiteboard ${i + 1}`);
      await putBoard({
        ...blankBoard(title),
        ...b,
        id: b.id || genBoardId(),
        name: title,
        createdAt: b.createdAt || now,
        updatedAt: b.updatedAt || now,
      });
    }
  }
  try {
    localStorage.setItem(MIGRATION_FLAG, "1");
    localStorage.removeItem(LEGACY_CURRENT);
  } catch {
    /* ignore */
  }
}
