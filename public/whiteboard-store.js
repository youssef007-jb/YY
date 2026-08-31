/* Hbibo whiteboard persistent storage (IndexedDB, one record per board with its own layers). */
(function () {
  const DB_NAME = "hbibo-whiteboards";
  const DB_VERSION = 1;
  const STORE = "boards";
  const MIGRATION_FLAG = "hbibo_idb_migrated_v1";
  const LEGACY_BOARDS = "hbibo_v4_boards";
  const LEGACY_CURRENT = "hbibo_v4_current";

  let dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB unavailable"));
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
      req.onerror = () => reject(req.error || new Error("Failed to open IndexedDB"));
    });
    return dbPromise;
  }

  function tx(mode, fn) {
    return openDb().then(
      (db) =>
        new Promise((resolve, reject) => {
          const t = db.transaction(STORE, mode);
          const store = t.objectStore(STORE);
          let result;
          try {
            result = fn(store);
          } catch (err) {
            reject(err);
            return;
          }
          t.oncomplete = () => resolve(result && result.__req ? result.__req.result : result);
          t.onerror = () => reject(t.error || new Error("IndexedDB transaction failed"));
          t.onabort = () => reject(t.error || new Error("IndexedDB transaction aborted"));
        }),
    );
  }

  function reqWrap(request) {
    return { __req: request };
  }

  function genId() {
    return "b" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function genLayerId() {
    return "l" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function extractPhaseAndWeekCategories(filename) {
    if (!filename || typeof filename !== "string") {
      return { phase_category: null, week_category: null, phase: undefined, week: undefined };
    }
    const phaseMatch = filename.match(/phase[:\s_\-\/]*(\d+)/i);
    const weekMatch = filename.match(/week[:\s_\-\/]*(\d+)/i);
    const phaseNum = phaseMatch ? parseInt(phaseMatch[1], 10) : null;
    const weekNum = weekMatch ? parseInt(weekMatch[1], 10) : null;
    const validPhase = phaseNum !== null && !Number.isNaN(phaseNum) ? phaseNum : null;
    const validWeek = weekNum !== null && !Number.isNaN(weekNum) ? weekNum : null;
    return {
      phase_category: validPhase,
      week_category: validWeek,
      phase: validPhase !== null ? "Phase " + validPhase : undefined,
      week: validWeek !== null ? String(validWeek) : undefined,
    };
  }

  function normalizePhaseString(phase) {
    if (!phase || typeof phase !== "string") return undefined;
    const trimmed = phase.trim();
    if (!trimmed) return undefined;
    const m = trimmed.match(/^phase\s*(\d+)$/i);
    if (m) return `Phase ${m[1]}`;
    const m2 = trimmed.match(/^phase\b(.*)$/i);
    if (m2) return `Phase${m2[1]}`;
    return trimmed;
  }

  function normalizeBoard(b) {
    if (!b) return b;
    const title =
      b.name && typeof b.name === "string" && b.name.trim() ? b.name.trim() : "Untitled";
    b.name = title;
    let rawElements = Array.isArray(b.elements) ? b.elements : [];
    if (rawElements.length === 0 && Array.isArray(b.layers) && b.layers.length > 0) {
      const layerEls = b.layers[0] && b.layers[0].elements;
      if (Array.isArray(layerEls) && layerEls.length > 0) {
        rawElements = layerEls;
      }
    }
    b.elements = rawElements;
    b.bgColor = b.bgColor || "#ffffff";
    if (b.phase) {
      b.phase = normalizePhaseString(b.phase);
    }
    b.gridStyle = b.gridStyle || "none";
    b.toolbarPos = b.toolbarPos || "bottom";
    b.theme = b.theme === "blueprint" ? "blueprint" : "classlight";
    return b;
  }

  function getCreationDefaults() {
    try {
      const raw = localStorage.getItem("hbibo_whiteboard_creation_defaults");
      if (raw) {
        const p = JSON.parse(raw);
        let grid = "none";
        if (p.gridStyle === "dots" || p.gridStyle === "dot-grid" || p.gridStyle === "grid-dots")
          grid = "dot-grid";
        else if (
          p.gridStyle === "lines" ||
          p.gridStyle === "line-grid" ||
          p.gridStyle === "grid-lines"
        )
          grid = "line-grid";

        let pos = "bottom";
        if (
          p.toolbarPos === "top" ||
          p.toolbarPos === "left" ||
          p.toolbarPos === "right" ||
          p.toolbarPos === "bottom"
        ) {
          pos = p.toolbarPos;
        }

        return {
          gridStyle: grid,
          bgColor: typeof p.bgColor === "string" && p.bgColor.trim() ? p.bgColor.trim() : "#ffffff",
          toolbarPos: pos,
        };
      }
    } catch (e) {}
    return { gridStyle: "none", bgColor: "#ffffff", toolbarPos: "bottom" };
  }

  function blankBoard(name) {
    const defaults = getCreationDefaults();
    const now = Date.now();
    const title = name || "Untitled";
    const cats = extractPhaseAndWeekCategories(title);
    return {
      id: genId(),
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
      phase: cats.phase,
      week: cats.week,
      phase_category: cats.phase_category,
      week_category: cats.week_category,
    };
  }

  function sanitizeBoardForStorage(board) {
    if (!board) return board;
    const clean = { ...board };
    if (Array.isArray(clean.elements)) {
      clean.elements = clean.elements.map((el) => {
        if (!el || typeof el !== "object") return el;
        const cleanEl = {};
        for (const k of Object.keys(el)) {
          if (
            k === "img" ||
            k.startsWith("_") ||
            typeof el[k] === "function" ||
            (typeof HTMLElement !== "undefined" && el[k] instanceof HTMLElement)
          ) {
            continue;
          }
          cleanEl[k] = el[k];
        }
        return cleanEl;
      });
    }
    if (clean.thumb && typeof clean.thumb !== "string") {
      if (typeof clean.thumb.toDataURL === "function") {
        try {
          clean.thumb = clean.thumb.toDataURL("image/jpeg", 0.85);
        } catch (e) {
          clean.thumb = null;
        }
      } else {
        clean.thumb = null;
      }
    }
    return clean;
  }

  const Store = {
    genId,
    genLayerId,
    normalizeBoard,
    blankBoard,
    extractPhaseAndWeekCategories,
    async listBoards() {
      const boards = await tx("readonly", (s) => reqWrap(s.getAll()));
      const normalized = (boards || [])
        .filter((b) => !b.docId || b.docId === b.id)
        .map(normalizeBoard);
      return normalized.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    },
    async getBoard(id) {
      if (!id) return null;
      const b = await tx("readonly", (s) => reqWrap(s.get(id)));
      return b ? normalizeBoard(b) : null;
    },
    async putBoard(board) {
      if (board) {
        normalizeBoard(board);
        if (
          board.phase_category === undefined ||
          board.week_category === undefined ||
          (!board.phase && !board.week)
        ) {
          const cats = extractPhaseAndWeekCategories(board.name || "");
          if (cats.phase && !board.phase) board.phase = cats.phase;
          if (cats.week && !board.week) board.week = cats.week;
          if (board.phase_category === undefined) {
            board.phase_category = cats.phase_category;
          }
          if (board.week_category === undefined) {
            board.week_category = cats.week_category;
          }
        }
      }
      const serializableBoard = sanitizeBoardForStorage(board);
      await tx("readwrite", (s) => s.put(serializableBoard));
      return board;
    },
    async deleteBoard(id) {
      await tx("readwrite", (s) => s.delete(id));
    },
    async createBoard(name) {
      const board = blankBoard(name);
      await Store.putBoard(board);
      return board;
    },
    async duplicateBoard(id) {
      const src = await Store.getBoard(id);
      if (!src) return null;
      const now = Date.now();
      const copyName = (src.name || "Untitled") + " Copy";
      const cats = extractPhaseAndWeekCategories(copyName);
      const newBoardId = genId();
      const rawElements = Array.isArray(src.elements)
        ? JSON.parse(JSON.stringify(src.elements))
        : [];

      const copy = {
        ...JSON.parse(JSON.stringify(src)),
        id: newBoardId,
        name: copyName,
        elements: rawElements,
        createdAt: now,
        updatedAt: now,
        phase: src.phase || cats.phase,
        week: src.week || cats.week,
        phase_category: src.phase_category ?? cats.phase_category,
        week_category: src.week_category ?? cats.week_category,
      };
      delete copy.layers;
      delete copy.activeLayerId;
      await Store.putBoard(copy);
      return copy;
    },
    async renameBoard(id, name) {
      const b = await Store.getBoard(id);
      if (!b) return null;
      const newName = name && typeof name === "string" && name.trim() ? name.trim() : "Untitled";
      b.name = newName;
      b.updatedAt = Date.now();
      const cats = extractPhaseAndWeekCategories(newName);
      if (cats.phase_category !== null) {
        b.phase = cats.phase;
        b.phase_category = cats.phase_category;
      } else {
        delete b.phase;
        b.phase_category = null;
      }
      if (cats.week_category !== null) {
        b.week = cats.week;
        b.week_category = cats.week_category;
      } else {
        delete b.week;
        b.week_category = null;
      }
      delete b.layers;
      delete b.activeLayerId;
      await Store.putBoard(b);
      return b;
    },
    /* Moves any legacy single-record / localStorage boards into the multi-board store. */
    async migrateLegacy() {
      let done = false;
      try {
        done = localStorage.getItem(MIGRATION_FLAG) === "1";
      } catch (e) {
        /* storage blocked */
      }
      if (done) return;
      let legacy = null;
      try {
        const raw = localStorage.getItem(LEGACY_BOARDS);
        if (raw) legacy = JSON.parse(raw);
      } catch (e) {
        legacy = null;
      }
      if (Array.isArray(legacy) && legacy.length) {
        const existing = await Store.listBoards();
        const known = new Set(existing.map((b) => b.id));
        for (let i = 0; i < legacy.length; i++) {
          const b = legacy[i];
          if (!b || known.has(b.id)) continue;
          const now = Date.now();
          const title = b.name || (legacy.length === 1 ? "My Whiteboard" : "Whiteboard " + (i + 1));
          await Store.putBoard({
            ...blankBoard(title),
            ...b,
            id: b.id || genId(),
            name: title,
            createdAt: b.createdAt || now,
            updatedAt: b.updatedAt || now,
          });
        }
      }
      try {
        localStorage.setItem(MIGRATION_FLAG, "1");
        localStorage.removeItem(LEGACY_CURRENT);
      } catch (e) {
        /* ignore */
      }
    },
  };

  window.HbiboStore = Store;
})();
