import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  PanelsTopLeft,
  Loader2,
  Tags,
  Download,
  Upload,
  ChevronRight,
  AlertTriangle,
  CheckSquare,
  Square,
  Check,
  X,
} from "lucide-react";
import {
  createBoard,
  deleteBoard,
  duplicateBoard,
  listBoards,
  putBoard,
  renameBoard,
  type BoardRecord,
  blankBoard,
  genBoardId,
  autoExtractPhaseAndWeek,
  normalizePhaseString,
  setWorkspaceBoardPayload,
} from "@/lib/boards-db";
import { renderPdfToImages } from "@/lib/pdf-importer";
import { generateBoardThumbnail } from "@/lib/thumbnail-generator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HomeSettings, applyTheme } from "@/components/home-settings";
import { I18nContext, useI18nProvider, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "My Whiteboards — Hbibo Board" },
      {
        name: "description",
        content:
          "Your whiteboard dashboard: create, open, rename, duplicate and delete infinite canvas boards.",
      },
      { property: "og:title", content: "My Whiteboards — Hbibo Board" },
      {
        property: "og:description",
        content: "Create and manage all of your infinite whiteboards in one place.",
      },
    ],
  }),
  component: HomeRoot,
});

function HomeRoot() {
  const i18n = useI18nProvider();
  return (
    <I18nContext.Provider value={i18n}>
      <HomePage />
    </I18nContext.Provider>
  );
}

const ALL_PHASES_VALUE = "__all__";
const NO_PHASE_VALUE = "__none__";
const UNASSIGNED_WEEK_VALUE = "__unassigned__";

function timeAgoKey(ts: number): { key: string; vars?: Record<string, string | number> } {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return { key: "justNow" };
  if (m < 60) return { key: "minutesAgo", vars: { n: m } };
  const h = Math.floor(m / 60);
  if (h < 24) return { key: "hoursAgo", vars: { n: h } };
  const d = Math.floor(h / 24);
  if (d < 7) return { key: "daysAgo", vars: { n: d } };
  return { key: "" };
}

function useTimeAgo() {
  const { t } = useI18n();
  return useCallback(
    (ts: number) => {
      const { key, vars } = timeAgoKey(ts);
      if (!key) return new Date(ts).toLocaleDateString();
      return t(key, vars);
    },
    [t],
  );
}

function naturalWeekSort(a: string, b: string) {
  const na = parseFloat(a);
  const nb = parseFloat(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return a.localeCompare(b);
}

function naturalPhaseSort(a: string, b: string) {
  if (a === NO_PHASE_VALUE) return -1;
  if (b === NO_PHASE_VALUE) return 1;
  const na = a.match(/\d+/);
  const nb = b.match(/\d+/);
  if (na && nb) {
    const numA = parseInt(na[0], 10);
    const numB = parseInt(nb[0], 10);
    if (numA !== numB) return numA - numB;
  }
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

/* iOS-Style Swipe to Delete Modal with darkened backdrop */
function IosSwipeToDeleteModal({
  board,
  onConfirm,
  onCancel,
}: {
  board: BoardRecord;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [dragProgress, setDragProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartRef.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const maxDrag = rect.width - 56;
    if (maxDrag <= 0) return;
    const delta = Math.max(0, Math.min(maxDrag, e.clientX - dragStartRef.current));
    const prog = delta / maxDrag;
    setDragProgress(prog);
    if (prog >= 0.9) {
      setIsDragging(false);
      onConfirm();
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragProgress < 0.9) {
      setDragProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md transition-opacity">
      <div
        className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-slate-900/95 p-6 text-white shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/20 text-red-400">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-semibold text-white">
            {t("deleteConfirmTitle", { name: board.name })}
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">
            {t("deleteConfirmDesc")}
          </p>
        </div>

        {/* iPhone Style Slide to Delete Slider */}
        <div className="mt-6">
          <div
            ref={trackRef}
            className="relative flex h-14 w-full items-center overflow-hidden rounded-full border border-red-500/30 bg-slate-800/90 px-1 shadow-inner select-none"
          >
            <div
              className="absolute inset-y-0 left-0 bg-red-600/80 transition-all"
              style={{ width: `${Math.max(0, dragProgress * 100)}%` }}
            />
            <span
              className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-semibold uppercase tracking-wider text-slate-300 transition-opacity"
              style={{ opacity: 1 - dragProgress * 1.5 }}
            >
              Slide to delete ➔
            </span>

            {/* Slider Handle */}
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="relative z-10 flex h-12 w-12 cursor-grab active:cursor-grabbing items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
              style={{
                transform: `translateX(${dragProgress * ((trackRef.current?.getBoundingClientRect().width || 280) - 56)}px)`,
              }}
            >
              <Trash2 className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-center">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="rounded-full px-6 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            {t("cancel")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function BoardThumbnail({ board }: { board: BoardRecord }) {
  const { t } = useI18n();
  const [thumbSrc, setThumbSrc] = useState<string | null>(board.thumb || null);
  const elements = (board.elements || []) as any[];

  useEffect(() => {
    if (board.thumb) {
      setThumbSrc(board.thumb);
      return undefined;
    }
    if (elements.length > 0) {
      let isMounted = true;
      generateBoardThumbnail(board).then((dataUrl) => {
        if (isMounted && dataUrl) {
          setThumbSrc(dataUrl);
          // Persist generated thumbnail back to DB asynchronously so future renders are instant
          void putBoard({ ...board, thumb: dataUrl });
        }
      });
      return () => {
        isMounted = false;
      };
    }
  }, [board.id, board.thumb, board.updatedAt, elements.length]);

  if (thumbSrc) {
    return (
      <img
        src={thumbSrc}
        alt={`${board.name} preview`}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    );
  }

  if (elements.length > 0) {
    return (
      <div className="relative flex h-full w-full items-center justify-center bg-slate-50 dark:bg-slate-900/50 p-4">
        <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
          <PanelsTopLeft className="h-6 w-6 opacity-60" />
          <span className="text-[11px] font-medium opacity-80">{elements.length} item{elements.length === 1 ? "" : "s"}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
      {t("emptyBoard")}
    </div>
  );
}

function BoardCard({
  b,
  onOpen,
  selected,
  onToggleSelect,
  anySelected,
  renaming,
  renameValue,
  setRenameValue,
  onCommitRename,
  onCancelRename,
  onStartRename,
  onDuplicate,
  onDownload,
  onDelete,
  onEditDetails,
  renameRef,
}: {
  b: BoardRecord;
  onOpen: (id: string) => void;
  selected: boolean;
  onToggleSelect: () => void;
  anySelected: boolean;
  renaming: boolean;
  renameValue: string;
  setRenameValue: (v: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onStartRename: () => void;
  onDuplicate: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onEditDetails: () => void;
  renameRef: React.RefObject<HTMLInputElement | null>;
}) {
  const { t } = useI18n();
  const timeAgo = useTimeAgo();
  return (
    <li
      className={`group relative overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:shadow-md ${
        selected
          ? "border-primary ring-2 ring-primary/40 shadow-md"
          : "border-border/80 hover:border-primary/40"
      }`}
    >
      <div className="relative block w-full">
        {/* Selection Checkbox */}
        <div className="absolute top-2.5 left-2.5 z-20">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
            aria-label={selected ? "Deselect board" : "Select board"}
            className={`flex h-6 w-6 items-center justify-center rounded-md border transition-all ${
              selected
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-black/20 bg-white/85 dark:bg-black/60 backdrop-blur opacity-0 group-hover:opacity-100 hover:bg-white text-transparent hover:border-black/40 shadow-xs"
            } ${anySelected ? "!opacity-100" : ""}`}
          >
            <Check className={`h-3.5 w-3.5 ${selected ? "opacity-100 stroke-[3]" : "opacity-0"}`} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => (anySelected ? onToggleSelect() : onOpen(b.id))}
          className="block w-full text-left"
          aria-label={`Open ${b.name}`}
        >
          <div
            className="aspect-[16/10] w-full overflow-hidden border-b bg-muted"
            style={b.bgColor ? { backgroundColor: b.bgColor } : undefined}
          >
            <BoardThumbnail board={b} />
          </div>
        </button>
      </div>
      <div className="flex items-center gap-2 px-3.5 py-3">
        <div className="min-w-0 flex-1">
          {renaming ? (
            <Input
              ref={renameRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={onCommitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") onCommitRename();
                if (e.key === "Escape") onCancelRename();
              }}
              className="h-8 text-sm"
            />
          ) : (
            <>
              <p className="truncate text-sm font-semibold text-foreground">{b.name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <p className="text-[11px] text-muted-foreground">{t("editedAgo", { t: timeAgo(b.updatedAt) })}</p>
                {b.phase && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    {b.phase}
                  </span>
                )}
                {b.week && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {t("weekLabel", { w: b.week })}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-lg">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">{t("boardActions")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onStartRename}>
              <Pencil className="h-4 w-4" /> {t("rename")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onEditDetails}>
              <Tags className="h-4 w-4" /> {t("editDetails")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onDuplicate}>
              <Copy className="h-4 w-4" /> {t("duplicate")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onDownload}>
              <Download className="h-4 w-4" /> {t("download")}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={onDelete}
            >
              <Trash2 className="h-4 w-4" /> {t("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

function BoardGrid(props: { boards: BoardRecord[]; cardProps: (b: BoardRecord) => React.ComponentProps<typeof BoardCard> }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {props.boards.map((b) => (
        <BoardCard key={b.id} {...props.cardProps(b)} />
      ))}
    </ul>
  );
}

function layoutImageElements(items: { name: string; src: string; w: number; h: number }[]) {
  const N = items.length;
  if (N === 0) return [];
  const cols = N === 1 ? 1 : N <= 4 ? 2 : N <= 9 ? 3 : 4;
  const gap = 36;

  const colWidths: number[] = new Array(cols).fill(0);
  const rowsCount = Math.ceil(N / cols);
  const rowHeights: number[] = new Array(rowsCount).fill(0);

  for (let i = 0; i < N; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    colWidths[c] = Math.max(colWidths[c] ?? 0, items[i]?.w ?? 0);
    rowHeights[r] = Math.max(rowHeights[r] ?? 0, items[i]?.h ?? 0);
  }

  const totalWidth = colWidths.reduce((a, b) => a + b, 0) + (cols - 1) * gap;
  const totalHeight = rowHeights.reduce((a, b) => a + b, 0) + (rowsCount - 1) * gap;

  const colXOffsets: number[] = [0];
  for (let c = 1; c < cols; c++) {
    colXOffsets[c] = (colXOffsets[c - 1] ?? 0) + (colWidths[c - 1] ?? 0) + gap;
  }
  const rowYOffsets: number[] = [0];
  for (let r = 1; r < rowsCount; r++) {
    rowYOffsets[r] = (rowYOffsets[r - 1] ?? 0) + (rowHeights[r - 1] ?? 0) + gap;
  }

  const startX = -Math.round(totalWidth / 2);
  const startY = -Math.round(totalHeight / 2);

  return items.map((item, idx) => {
    const c = idx % cols;
    const r = Math.floor(idx / cols);
    const cellX = startX + (colXOffsets[c] ?? 0);
    const cellY = startY + (rowYOffsets[r] ?? 0);
    const cellW = colWidths[c] ?? 0;
    const cellH = rowHeights[r] ?? 0;
    const posX = Math.round(cellX + (cellW - item.w) / 2);
    const posY = Math.round(cellY + (cellH - item.h) / 2);

    return {
      id: genBoardId(),
      type: "image",
      src: item.src,
      x: posX,
      y: posY,
      w: item.w,
      h: item.h,
      rotation: 0,
    };
  });
}

function HomePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [boards, setBoards] = useState<BoardRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [pendingDelete, setPendingDelete] = useState<BoardRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<string>(ALL_PHASES_VALUE);
  const [editingDetails, setEditingDetails] = useState<BoardRecord | null>(null);
  const [detailsPhase, setDetailsPhase] = useState("");
  const [detailsWeek, setDetailsWeek] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchCategoryOpen, setBatchCategoryOpen] = useState(false);
  const [batchCategoryPhase, setBatchCategoryPhase] = useState("");
  const [batchCategoryWeek, setBatchCategoryWeek] = useState("");
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  const [uploadPrompt, setUploadPrompt] = useState<{
    fileCount: number;
    combinedBoard: BoardRecord;
    separateBoards: BoardRecord[];
  } | null>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.body.classList.add("hbibo-scroll");
    try {
      const theme = localStorage.getItem("hbibo.theme");
      applyTheme(theme === "dark" ? "dark" : "light");
    } catch {
      /* ignore */
    }
    return () => document.body.classList.remove("hbibo-scroll");
  }, []);

  const refresh = useCallback(async () => {
    try {
      setBoards(await listBoards());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your boards.");
      setBoards([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (renaming) renameRef.current?.focus();
  }, [renaming]);

  const openBoard = async (id: string, boardRecord?: BoardRecord) => {
    setError(null);
    const target = boardRecord || (boards ? boards.find((b) => b.id === id) : null);
    if (target) {
      const updated = { ...target, updatedAt: Date.now() };
      setWorkspaceBoardPayload(updated);
      try {
        await putBoard(updated);
      } catch (err) {
        console.warn("Failed to update board timestamp", err);
      }
    }
    navigate({ to: "/board/$boardId", params: { boardId: id } });
  };

  const handleCreate = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const board = await createBoard();
      await openBoard(board.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create a board.");
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async (b: BoardRecord) => {
    try {
      const elements = ((b.elements || []) as any[]);
      const pad = 60;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      if (elements.length > 0) {
        for (const el of elements) {
          if (el.points && Array.isArray(el.points) && el.points.length) {
            for (const p of el.points) {
              minX = Math.min(minX, p.x);
              minY = Math.min(minY, p.y);
              maxX = Math.max(maxX, p.x);
              maxY = Math.max(maxY, p.y);
            }
          } else {
            const x = el.x ?? 0;
            const y = el.y ?? 0;
            const w = el.w ?? 100;
            const h = el.h ?? 60;
            minX = Math.min(minX, x, x + w);
            minY = Math.min(minY, y, y + h);
            maxX = Math.max(maxX, x, x + w);
            maxY = Math.max(maxY, y, y + h);
          }
        }
      }
      
      if (!isFinite(minX) || !isFinite(minY)) {
        minX = 0; minY = 0; maxX = 1200; maxY = 800;
      }
      
      const width = Math.max(600, Math.ceil(maxX - minX + pad * 2));
      const height = Math.max(400, Math.ceil(maxY - minY + pad * 2));
      const canvas = document.createElement("canvas");
      const dpr = 2;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      
      // Draw background
      ctx.fillStyle = b.bgColor || "#fafafa";
      ctx.fillRect(0, 0, width, height);
      
      // Pre-load images if any
      const imagePromises: Promise<void>[] = [];
      const loadedImages = new Map<string, HTMLImageElement>();
      for (const el of elements) {
        if (el.type === "image" && el.src) {
          const p = new Promise<void>((res) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => { loadedImages.set(el.src, img); res(); };
            img.onerror = () => res();
            img.src = el.src;
          });
          imagePromises.push(p);
        }
      }
      await Promise.all(imagePromises);
      
      ctx.translate(-minX + pad, -minY + pad);
      
      for (const el of elements) {
        ctx.save();
        const bx = el.x ?? 0, by = el.y ?? 0, bw = el.w ?? 100, bh = el.h ?? 60;
        const cx = bx + bw / 2, cy = by + bh / 2;
        if (el.rotation) {
          ctx.translate(cx, cy);
          ctx.rotate((el.rotation * Math.PI) / 180);
          ctx.translate(-cx, -cy);
        }
        ctx.strokeStyle = el.color || "#1E1E1E";
        ctx.fillStyle = el.color || "#1E1E1E";
        ctx.lineWidth = el.width || 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        
        if ((el.type === "pen" || el.type === "highlighter" || el.type === "vanishing") && el.points) {
          if (el.type === "highlighter") ctx.globalAlpha = 0.4;
          ctx.beginPath();
          el.points.forEach((pt: { x: number; y: number }, idx: number) => {
            if (idx === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.stroke();
          ctx.globalAlpha = 1;
        } else if (el.type === "rect") {
          ctx.strokeRect(bx, by, bw, bh);
        } else if (el.type === "roundRect") {
          const r = Math.min(12, Math.abs(bw) / 4, Math.abs(bh) / 4);
          if (typeof ctx.roundRect === "function") {
            ctx.beginPath();
            ctx.roundRect(bx, by, bw, bh, r);
            ctx.stroke();
          } else {
            ctx.strokeRect(bx, by, bw, bh);
          }
        } else if (el.type === "circle" || el.type === "ellipse") {
          ctx.beginPath();
          ctx.ellipse(bx + bw / 2, by + bh / 2, Math.abs(bw / 2), Math.abs(bh / 2), 0, 0, Math.PI * 2);
          ctx.stroke();
        } else if (el.type === "triangle") {
          ctx.beginPath();
          ctx.moveTo(bx + bw / 2, by);
          ctx.lineTo(bx, by + bh);
          ctx.lineTo(bx + bw, by + bh);
          ctx.closePath();
          ctx.stroke();
        } else if (el.type === "diamond") {
          ctx.beginPath();
          ctx.moveTo(bx + bw / 2, by);
          ctx.lineTo(bx + bw, by + bh / 2);
          ctx.lineTo(bx + bw / 2, by + bh);
          ctx.lineTo(bx, by + bh / 2);
          ctx.closePath();
          ctx.stroke();
        } else if (el.type === "star") {
          const scx = bx + bw / 2, scy = by + bh / 2;
          const outerR = Math.min(Math.abs(bw), Math.abs(bh)) / 2;
          const innerR = outerR * 0.45;
          ctx.beginPath();
          for (let i = 0; i < 10; i++) {
            const r = i % 2 === 0 ? outerR : innerR;
            const a = (Math.PI / 5) * i - Math.PI / 2;
            ctx.lineTo(scx + Math.cos(a) * r, scy + Math.sin(a) * r);
          }
          ctx.closePath();
          ctx.stroke();
        } else if (el.type === "hexagon") {
          const hcx = bx + bw / 2, hcy = by + bh / 2, rx = bw / 2, ry = bh / 2;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i - Math.PI / 6;
            const px = hcx + Math.cos(a) * rx, py = hcy + Math.sin(a) * ry;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        } else if (el.type === "sticky") {
          ctx.fillStyle = el.bg || "#fef08a";
          ctx.fillRect(bx, by, bw, bh);
          ctx.fillStyle = el.color || "#422006";
          const sz = el.size || 16;
          ctx.font = `${sz}px Segoe UI,Inter,sans-serif`;
          ctx.textBaseline = "top";
          const lines = String(el.isPlaceholder ? "" : (el.text || "")).split("\n");
          lines.forEach((l, idx) => ctx.fillText(l, bx + 10, by + 10 + idx * sz * 1.3));
        } else if (el.type === "text") {
          ctx.fillStyle = el.color || "#111827";
          const sz = el.size || 18;
          ctx.font = `${el.bold ? "bold " : ""}${el.italic ? "italic " : ""}${sz}px ${el.font || "Segoe UI,Inter,sans-serif"}`;
          ctx.textBaseline = "top";
          const lines = String(el.isPlaceholder ? "" : (el.text || "")).split("\n");
          lines.forEach((l, idx) => ctx.fillText(l, bx, by + idx * sz * 1.25));
        } else if (el.type === "image" && el.src) {
          const img = loadedImages.get(el.src);
          if (img) ctx.drawImage(img, bx, by, bw, bh);
        } else if (el.type === "emoji") {
          ctx.font = `${bw || 32}px sans-serif`;
          ctx.textBaseline = "top";
          ctx.fillText(el.text || "⭐", bx, by);
        } else if (el.type === "line" || el.type === "arrow" || el.type === "dashed" || el.type === "doubleArrow") {
          if (el.type === "dashed") ctx.setLineDash([8, 6]);
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + bw, by + bh);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.restore();
      }
      
      const rawName = (b.name || "Untitled").trim();
      const filename = `${rawName}.png`;
      
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", url);
        downloadAnchor.setAttribute("download", filename);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        URL.revokeObjectURL(url);
      }, "image/png");
    } catch {
      setError("Could not export board to PNG.");
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    const isPdf = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);
    const isImageFile = (f: File) => f.type.startsWith("image/") || /\.(png|jpe?g|webp|svg|gif|bmp|avif)$/i.test(f.name);
    const isJsonFile = (f: File) => f.type === "application/json" || /\.json$/i.test(f.name);

    try {
      const fileEntries: {
        fileName: string;
        boardTitle: string;
        items: { name: string; src: string; w: number; h: number }[];
        jsonBoard?: BoardRecord;
      }[] = [];

      for (const file of files) {
        if (isImageFile(file) && !isPdf(file)) {
          try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => reject(new Error("File read error"));
              reader.readAsDataURL(file);
            });

            const imgDim = await new Promise<{ w: number; h: number }>((resolve) => {
              const img = new Image();
              img.onload = () => {
                const maxDim = 540;
                let w = img.naturalWidth || img.width || 480;
                let h = img.naturalHeight || img.height || 360;
                if (w > maxDim || h > maxDim) {
                  if (w >= h) {
                    h = Math.round((h / w) * maxDim);
                    w = maxDim;
                  } else {
                    w = Math.round((w / h) * maxDim);
                    h = maxDim;
                  }
                }
                resolve({ w, h });
              };
              img.onerror = () => resolve({ w: 480, h: 360 });
              img.src = dataUrl;
            });

            const cleanName = file.name.replace(/\.[^/.]+$/, "") || "Image";
            fileEntries.push({
              fileName: file.name,
              boardTitle: cleanName,
              items: [{ name: cleanName, src: dataUrl, w: imgDim.w, h: imgDim.h }],
            });
          } catch (e) {
            console.warn("Could not load image file:", file.name, e);
          }
        } else if (isPdf(file)) {
          try {
            const pages = await renderPdfToImages(file);
            const cleanName = file.name.replace(/\.pdf$/i, "") || "PDF Document";
            if (pages.length > 0) {
              fileEntries.push({
                fileName: file.name,
                boardTitle: cleanName,
                items: pages,
              });
            }
          } catch (e) {
            console.warn("Could not render PDF:", file.name, e);
          }
        } else if (isJsonFile(file)) {
          try {
            const text = await file.text();
            const raw = JSON.parse(text);
            const items: BoardRecord[] = Array.isArray(raw) ? raw : [raw];
            for (const item of items) {
              const boardName = item.name || file.name.replace(/\.json$/i, "") || "Untitled";
              fileEntries.push({
                fileName: file.name,
                boardTitle: boardName,
                items: [],
                jsonBoard: item,
              });
            }
          } catch (e) {
            console.warn("Could not parse JSON:", file.name, e);
          }
        }
      }

      if (fileEntries.length === 0) {
        setError("No valid images, PDFs, or whiteboard files could be extracted.");
        return;
      }

      const baseTime = Date.now();

      // 1. Build separate boards (one whiteboard per uploaded file)
      const separateBoards: BoardRecord[] = fileEntries.map((entry, idx) => {
        const boardTime = baseTime + idx * 10;
        const title = entry.boardTitle;
        const cat = autoExtractPhaseAndWeek(title);
        const bId = genBoardId();

        if (entry.jsonBoard) {
          const jb = entry.jsonBoard;
          let rawEls = Array.isArray(jb.elements) ? jb.elements : [];
          if (rawEls.length === 0 && Array.isArray((jb as any).layers) && (jb as any).layers.length > 0) {
            const layerEls = (jb as any).layers[0]?.elements;
            if (Array.isArray(layerEls)) rawEls = layerEls;
          }
          return {
            ...blankBoard(title),
            ...jb,
            id: bId,
            name: title,
            phase: jb.phase || cat.phase,
            week: jb.week || cat.week,
            phase_category: jb.phase_category ?? cat.phase_category,
            week_category: jb.week_category ?? cat.week_category,
            createdAt: jb.createdAt || boardTime,
            updatedAt: boardTime,
            elements: rawEls,
          };
        }

        const elements = layoutImageElements(entry.items);
        return {
          ...blankBoard(title),
          id: bId,
          name: title,
          phase: cat.phase,
          week: cat.week,
          phase_category: cat.phase_category,
          week_category: cat.week_category,
          createdAt: boardTime,
          updatedAt: boardTime,
          elements,
        };
      });

      // 2. Build combined board (all files arranged in 1 whiteboard)
      let combinedElements: any[] = [];
      const allImageItems = fileEntries.flatMap((e) => e.items);
      if (allImageItems.length > 0) {
        combinedElements = layoutImageElements(allImageItems);
      } else {
        combinedElements = fileEntries.flatMap((e) => (e.jsonBoard?.elements as any[]) || []);
      }

      const firstTitle = fileEntries[0]?.boardTitle;
      const combinedTitle = fileEntries.length === 1
        ? firstTitle
        : fileEntries.length <= 3
        ? fileEntries.map((e) => e.boardTitle).join(", ")
        : `${firstTitle} & ${fileEntries.length - 1} more`;

      const combinedCat = autoExtractPhaseAndWeek(combinedTitle);
      const combinedBoard: BoardRecord = {
        ...blankBoard(combinedTitle),
        id: genBoardId(),
        name: combinedTitle,
        phase: combinedCat.phase,
        week: combinedCat.week,
        phase_category: combinedCat.phase_category,
        week_category: combinedCat.week_category,
        createdAt: baseTime + fileEntries.length * 10,
        updatedAt: baseTime + fileEntries.length * 10,
        elements: combinedElements,
      };

      // Generate thumbnails proactively
      for (const sb of separateBoards) {
        if (!sb.thumb && sb.elements && sb.elements.length > 0) {
          try {
            sb.thumb = await generateBoardThumbnail(sb);
          } catch {
            /* ignore */
          }
        }
      }
      if (!combinedBoard.thumb && combinedBoard.elements && combinedBoard.elements.length > 0) {
        try {
          combinedBoard.thumb = await generateBoardThumbnail(combinedBoard);
        } catch {
          /* ignore */
        }
      }

      setUploadPrompt({
        fileCount: fileEntries.length,
        combinedBoard,
        separateBoards,
      });
    } catch (err) {
      console.error("Import failure:", err);
      setError("Could not process the uploaded file(s).");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleOpenCombined = async () => {
    if (!uploadPrompt) return;
    const { combinedBoard } = uploadPrompt;
    setUploadPrompt(null);
    try {
      await putBoard(combinedBoard);
      await refresh();
      openBoard(combinedBoard.id, combinedBoard);
    } catch {
      setError("Could not save the whiteboard.");
    }
  };

  const handleBackToHomepage = async () => {
    if (!uploadPrompt) return;
    const { separateBoards } = uploadPrompt;
    setUploadPrompt(null);
    try {
      for (const board of separateBoards) {
        await putBoard(board);
      }
      await refresh();
    } catch {
      setError("Could not save the whiteboard(s).");
    }
  };

  const commitRename = async (id: string) => {
    setRenaming(null);
    try {
      await renameBoard(id, renameValue);
      await refresh();
    } catch {
      setError("Could not rename that board.");
    }
  };

  const commitDetails = async () => {
    if (!editingDetails) return;
    const updated: BoardRecord = { ...editingDetails, updatedAt: Date.now() };
    const phaseVal = detailsPhase.trim();
    const weekVal = detailsWeek.trim();
    if (phaseVal) updated.phase = phaseVal;
    else delete updated.phase;
    if (weekVal) updated.week = weekVal;
    else delete updated.week;
    setEditingDetails(null);
    try {
      await putBoard(updated);
      await refresh();
    } catch {
      setError("Could not update that board's details.");
    }
  };

  const distinctPhases = useMemo(() => {
    const map = new Map<string, string>();
    (boards ?? []).forEach((b) => {
      if (b.phase && b.phase.trim()) {
        const norm = normalizePhaseString(b.phase.trim()) || b.phase.trim();
        const key = norm.toLowerCase();
        if (!map.has(key)) {
          map.set(key, norm);
        }
      }
    });
    return Array.from(map.values()).sort(naturalPhaseSort);
  }, [boards]);

  const searchedBoards = useMemo(() => {
    const all = boards ?? [];
    const sorted = [...all].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((b) => {
      const hay = [b.name, b.phase ?? "", b.week ? `week ${b.week}` : "", b.week ?? ""]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [boards, search]);

  const activePhaseBoards = useMemo(() => {
    if (phaseFilter === ALL_PHASES_VALUE) return [];
    const filterKey = phaseFilter.toLowerCase().trim();
    return searchedBoards
      .filter((b) => {
        const p = (b.phase || "").toLowerCase().trim();
        const normP = (normalizePhaseString(b.phase) || "").toLowerCase().trim();
        return p === filterKey || normP === filterKey;
      })
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }, [searchedBoards, phaseFilter]);

  const weekGroups = useMemo(() => {
    const groups = new Map<string, BoardRecord[]>();
    activePhaseBoards.forEach((b) => {
      const key = b.week?.trim() ? b.week.trim() : UNASSIGNED_WEEK_VALUE;
      const arr = groups.get(key) ?? [];
      arr.push(b);
      groups.set(key, arr);
    });
    const keys = Array.from(groups.keys()).sort((a, b) => {
      if (a === UNASSIGNED_WEEK_VALUE) return 1;
      if (b === UNASSIGNED_WEEK_VALUE) return -1;
      return naturalWeekSort(a, b);
    });
    return keys.map((k) => {
      const arr = groups.get(k)!;
      arr.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      return { week: k, boards: arr };
    });
  }, [activePhaseBoards]);

  const cardProps = useCallback(
    (b: BoardRecord): React.ComponentProps<typeof BoardCard> => ({
      b,
      onOpen: openBoard,
      selected: selectedIds.has(b.id),
      anySelected: selectedIds.size > 0,
      onToggleSelect: () => {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(b.id)) next.delete(b.id);
          else next.add(b.id);
          return next;
        });
      },
      renaming: renaming === b.id,
      renameValue,
      setRenameValue,
      onCommitRename: () => void commitRename(b.id),
      onCancelRename: () => setRenaming(null),
      onStartRename: () => {
        setRenameValue(b.name);
        setRenaming(b.id);
      },
      onDuplicate: () => {
        void duplicateBoard(b.id).then(refresh);
      },
      onDownload: () => handleDownload(b),
      onDelete: () => setPendingDelete(b),
      onEditDetails: () => {
        setDetailsPhase(b.phase ?? "");
        setDetailsWeek(b.week ?? "");
        setEditingDetails(b);
      },
      renameRef,
    }),
    [renaming, renameValue, refresh, selectedIds],
  );

  const totalCount = boards?.length ?? 0;
  const hasPhaseSelected = phaseFilter !== ALL_PHASES_VALUE;

  const isGroupAllSelected = (groupBoards: BoardRecord[]) =>
    groupBoards.length > 0 && groupBoards.every((b) => selectedIds.has(b.id));

  const toggleGroupSelection = (groupBoards: BoardRecord[]) => {
    if (isGroupAllSelected(groupBoards)) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        groupBoards.forEach((b) => next.delete(b.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        groupBoards.forEach((b) => next.add(b.id));
        return next;
      });
    }
  };

  const isSearching = search.trim().length > 0;
  const currentVisible = hasPhaseSelected
    ? activePhaseBoards
    : searchedBoards;
  const isAllVisibleSelected =
    currentVisible.length > 0 && currentVisible.every((b) => selectedIds.has(b.id));

  const selectAllVisible = () => {
    setSelectedIds(new Set(currentVisible.map((b) => b.id)));
  };

  const toggleSelectAllVisible = () => {
    if (isAllVisibleSelected) {
      clearSelection();
    } else {
      selectAllVisible();
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBatchDownload = async () => {
    const selectedList = (boards || []).filter((b) => selectedIds.has(b.id));
    if (selectedList.length === 0) return;
    setIsBatchDownloading(true);
    try {
      for (let i = 0; i < selectedList.length; i++) {
        const b = selectedList[i];
        if (b) await handleDownload(b);
        if (i < selectedList.length - 1) {
          await new Promise((r) => setTimeout(r, 220));
        }
      }
    } finally {
      setIsBatchDownloading(false);
    }
  };

  const commitBatchCategory = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const p = batchCategoryPhase.trim();
    const w = batchCategoryWeek.trim();
    for (const id of ids) {
      const b = boards?.find((x) => x.id === id);
      if (!b) continue;
      const updated: BoardRecord = { ...b, updatedAt: Date.now() };
      if (p) updated.phase = p;
      if (w) updated.week = w;
      await putBoard(updated);
    }
    setBatchCategoryOpen(false);
    setSelectedIds(new Set());
    await refresh();
  };

  const commitBatchDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    for (const id of ids) {
      await deleteBoard(id);
    }
    setBatchDeleteOpen(false);
    setSelectedIds(new Set());
    await refresh();
  };

  return (
    <main className="min-h-dvh bg-background">
      <header className="border-b bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <PanelsTopLeft className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">{t("appTitle")}</h1>
              <p className="text-xs text-muted-foreground">
                {boards
                  ? totalCount === 1
                    ? t("boardCountOne")
                    : t("boardCountOther", { n: totalCount })
                  : t("loading")}
              </p>
            </div>
          </div>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2.5">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-9 w-full max-w-xs sm:w-56"
            />
            <Select value={phaseFilter} onValueChange={setPhaseFilter}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue placeholder={t("selectPhase")} />
              </SelectTrigger>
              <SelectContent className="max-h-[216px] overflow-y-auto">
                <SelectItem value={ALL_PHASES_VALUE}>{t("allPhases")}</SelectItem>
                {distinctPhases.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Hidden File Input for Import (Boards, Images & PDFs) */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFile}
              accept=".json,image/*,.pdf,application/pdf"
              multiple
              className="hidden"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="h-9 w-9 rounded-full shrink-0"
              title="Upload whiteboard, picture, or PDF"
              aria-label="Upload whiteboard, picture, or PDF"
            >
              <Upload className="h-4 w-4" />
            </Button>

            <HomeSettings />
            <Button onClick={handleCreate} disabled={busy} className="h-9 rounded-full px-4 text-xs font-medium shadow-sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> {t("newWhiteboard")}
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {error && (
          <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {boards === null && (
          <div className="flex items-center gap-2 py-20 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {t("loadingBoards")}
          </div>
        )}

        {boards !== null && boards.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-24 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <PanelsTopLeft className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="text-base font-semibold">{t("noBoardsTitle")}</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">{t("noBoardsDesc")}</p>
            <Button onClick={handleCreate} disabled={busy} className="mt-6 rounded-full">
              <Plus className="h-4 w-4" /> {t("newWhiteboard")}
            </Button>
          </div>
        )}

        {boards !== null && boards.length > 0 && (
          <div className="space-y-6">
            {hasPhaseSelected ? (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold tracking-tight text-foreground">
                    {phaseFilter}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {activePhaseBoards.length} {activePhaseBoards.length === 1 ? "board" : "boards"}
                  </span>
                </div>
                {weekGroups.length === 0 && (
                  <p className="text-sm text-muted-foreground">{t("noBoardsTitle")}</p>
                )}
                {weekGroups.map(({ week, boards: wb }) => {
                  const isWeekAllSelected = isGroupAllSelected(wb);
                  return (
                    <section key={week} className="space-y-3">
                      <div className="flex items-center justify-between gap-3 pb-1 border-b border-border/60">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {week === UNASSIGNED_WEEK_VALUE ? t("unassignedWeek") : t("weekLabel", { w: week })}
                          </h3>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            {wb.length}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleGroupSelection(wb)}
                          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          {isWeekAllSelected ? (
                            <>
                              <CheckSquare className="h-3.5 w-3.5 text-primary" />
                              <span>Deselect Week</span>
                            </>
                          ) : (
                            <>
                              <Square className="h-3.5 w-3.5" />
                              <span>Select Week</span>
                            </>
                          )}
                        </button>
                      </div>
                      <BoardGrid boards={wb} cardProps={cardProps} />
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 pb-2 border-b border-border/70">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-base font-bold tracking-tight text-foreground">
                      {t("allWhiteboards")}
                    </h2>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      {searchedBoards.length} {searchedBoards.length === 1 ? "board" : "boards"}
                    </span>
                  </div>
                  {searchedBoards.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleGroupSelection(searchedBoards)}
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      {isAllVisibleSelected ? (
                        <>
                          <CheckSquare className="h-3.5 w-3.5 text-primary" />
                          <span>Deselect All</span>
                        </>
                      ) : (
                        <>
                          <Square className="h-3.5 w-3.5" />
                          <span>Select All</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                {searchedBoards.length > 0 ? (
                  <BoardGrid boards={searchedBoards} cardProps={cardProps} />
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {t("noBoardsTitle")}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* iOS-Style Swipe Delete Modal */}
      {pendingDelete && (
        <IosSwipeToDeleteModal
          board={pendingDelete}
          onConfirm={() => {
            const id = pendingDelete.id;
            setPendingDelete(null);
            if (id) void deleteBoard(id).then(refresh);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      <Dialog open={editingDetails !== null} onOpenChange={(open) => !open && setEditingDetails(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("editBoardDetails")}</DialogTitle>
            <DialogDescription className="sr-only">{t("editBoardDetails")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="phase-input">{t("phaseLabel")}</Label>
              <Input
                id="phase-input"
                value={detailsPhase}
                onChange={(e) => setDetailsPhase(e.target.value)}
                placeholder={t("phasePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="week-input">{t("weekFieldLabel")}</Label>
              <Input
                id="week-input"
                value={detailsWeek}
                onChange={(e) => setDetailsWeek(e.target.value)}
                placeholder={t("weekPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDetails(null)}>
              {t("cancel")}
            </Button>
            <Button onClick={() => void commitDetails()}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Assign Category Dialog */}
      <Dialog open={batchCategoryOpen} onOpenChange={(open) => !open && setBatchCategoryOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("batchCategoryTitle", { n: selectedIds.size })}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update phase and week category for all {selectedIds.size} selected whiteboards.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="batch-phase-input">{t("phaseLabel")}</Label>
              <Input
                id="batch-phase-input"
                value={batchCategoryPhase}
                onChange={(e) => setBatchCategoryPhase(e.target.value)}
                placeholder={t("phasePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch-week-input">{t("weekFieldLabel")}</Label>
              <Input
                id="batch-week-input"
                value={batchCategoryWeek}
                onChange={(e) => setBatchCategoryWeek(e.target.value)}
                placeholder={t("weekPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchCategoryOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={() => void commitBatchCategory()}>{t("apply")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Delete Confirmation Dialog */}
      <Dialog open={batchDeleteOpen} onOpenChange={(open) => !open && setBatchDeleteOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle className="text-base font-bold">
              {t("batchDeleteTitle", { n: selectedIds.size })}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t("batchDeleteDesc", { n: selectedIds.size })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setBatchDeleteOpen(false)}>
              {t("cancel")}
            </Button>
            <Button variant="destructive" onClick={() => void commitBatchDelete()}>
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Open Prompt Dialog */}
      <Dialog open={!!uploadPrompt} onOpenChange={(open) => !open && handleBackToHomepage()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Upload className="h-5 w-5" />
            </div>
            <DialogTitle className="text-base font-bold">
              {uploadPrompt?.fileCount === 1
                ? "File Uploaded Successfully"
                : `${uploadPrompt?.fileCount || 0} Files Uploaded Successfully`}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {uploadPrompt?.fileCount === 1
                ? `"${uploadPrompt.separateBoards[0]?.name}" is ready. Would you like to open it now or return to the dashboard?`
                : `Choose "Open all in 1 whiteboard" to combine all ${uploadPrompt?.fileCount || 0} files into one board, or "Back to homepage" to create ${uploadPrompt?.fileCount || 0} separate whiteboards.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => void handleBackToHomepage()}
              className="rounded-xl text-xs font-medium"
            >
              Back to homepage
            </Button>
            <Button
              onClick={() => void handleOpenCombined()}
              className="rounded-xl text-xs font-semibold"
            >
              {uploadPrompt?.fileCount === 1 ? "Open now" : "Open all in 1 whiteboard"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Multi-Selection Action Bar */}
      {selectedIds.size > 0 && (
        <aside aria-label="Batch actions toolbar" className="fixed bottom-6 inset-x-0 z-50 flex justify-center px-4 pointer-events-none animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-2xl border border-border/80 bg-background/95 p-1.5 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-2 pl-3 pr-2 py-1">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {selectedIds.size}
              </span>
              <span className="text-xs font-semibold text-foreground">
                {t("selectedCount", { n: selectedIds.size })}
              </span>
            </div>

            <div className="h-4 w-px bg-border/80 mx-1" />

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSelectAllVisible}
              className="h-8 rounded-xl px-2.5 text-xs font-medium"
            >
              {isAllVisibleSelected ? (
                <>
                  <Square className="mr-1.5 h-3.5 w-3.5" />
                  Deselect All
                </>
              ) : (
                <>
                  <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
                  {t("selectAll")}
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setBatchCategoryPhase("");
                setBatchCategoryWeek("");
                setBatchCategoryOpen(true);
              }}
              className="h-8 rounded-xl px-2.5 text-xs font-medium"
            >
              <Tags className="mr-1.5 h-3.5 w-3.5" />
              {t("assignCategory")}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              disabled={isBatchDownloading}
              onClick={() => void handleBatchDownload()}
              className="h-8 rounded-xl px-2.5 text-xs font-medium"
            >
              {isBatchDownloading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-3.5 w-3.5" />
              )}
              {t("batchDownload")}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBatchDeleteOpen(true)}
              className="h-8 rounded-xl px-2.5 text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              {t("batchDelete")}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={clearSelection}
              className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground ml-1"
              title={t("close")}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </aside>
      )}
    </main>
  );
}
