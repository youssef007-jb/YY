/**
 * Fast Batch Whiteboard Conversion Engine with Controlled Concurrency
 * Converts batches of PNG/JPG/Smart PNG files into native YY Whiteboards asynchronously.
 *
 * Features:
 * - Worker pool with controlled concurrency (default: 3 concurrent AI requests)
 * - Non-blocking: background processing while UI remains fully responsive
 * - First-finished = First-displayed reactive stream
 * - Smart PNG fast-path (instant client-side extraction, bypassing AI latency)
 * - Automatic fallback to standard image whiteboard on transient errors
 * - Proactive thumbnail generation
 */

import {
  putBoard,
  blankBoard,
  genBoardId,
  autoExtractPhaseAndWeek,
  type BoardRecord,
} from "./boards-db";
import {
  prepareImageForAnalysis,
  prepareDataUrlForAnalysis,
  analyzeWhiteboardImage,
  reconstructWhiteboardElements,
} from "./image-importer";
import { extractSmartPngMetadata } from "./smart-png";
import { renderPdfToImages } from "./pdf-importer";
import { generateBoardThumbnail } from "./thumbnail-generator";
import { stripFileExtension } from "./filename-utils";

export interface BatchItem {
  id: string;
  file: File;
  fileName: string;
  boardTitle: string;
  status: "pending" | "processing" | "completed" | "failed";
  statusText: string;
  board?: BoardRecord;
  error?: string;
  isSmartPng?: boolean;
}

export interface BatchProgressState {
  total: number;
  completed: number;
  failed: number;
  processing: number;
  pending: number;
  percent: number;
  items: BatchItem[];
  isFinished: boolean;
}

export interface BatchConverterOptions {
  concurrency?: number;
  onProgress?: (state: BatchProgressState) => void;
  onItemCompleted?: (board: BoardRecord, item: BatchItem) => void;
  onItemFailed?: (error: string, item: BatchItem) => void;
  onAllFinished?: (boards: BoardRecord[], state: BatchProgressState) => void;
}

/**
 * Executes batch conversion with worker-pool concurrency.
 */
export class BatchConversionQueue {
  private items: BatchItem[] = [];
  private concurrency: number;
  private activeCount = 0;
  private queueIndex = 0;
  private isCancelled = false;
  private completedBoards: BoardRecord[] = [];
  private onProgress?: ((state: BatchProgressState) => void) | undefined;
  private onItemCompleted?: ((board: BoardRecord, item: BatchItem) => void) | undefined;
  private onItemFailed?: ((error: string, item: BatchItem) => void) | undefined;
  private onAllFinished?: ((boards: BoardRecord[], state: BatchProgressState) => void) | undefined;

  constructor(files: File[], options: BatchConverterOptions = {}) {
    this.concurrency = Math.max(1, Math.min(6, options.concurrency || 3));
    this.onProgress = options.onProgress;
    this.onItemCompleted = options.onItemCompleted;
    this.onItemFailed = options.onItemFailed;
    this.onAllFinished = options.onAllFinished;

    this.items = files.map((file, idx) => {
      const cleanTitle = stripFileExtension(file.name) || file.name || `Whiteboard ${idx + 1}`;
      return {
        id: `batch-${idx}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        fileName: file.name,
        boardTitle: cleanTitle,
        status: "pending",
        statusText: "Queued",
      };
    });
  }

  public start() {
    this.isCancelled = false;
    this.emitProgress();

    // Spawn up to `concurrency` concurrent workers
    const initialWorkers = Math.min(this.concurrency, this.items.length);
    for (let i = 0; i < initialWorkers; i++) {
      void this.next();
    }
  }

  public cancel() {
    this.isCancelled = true;
    for (const item of this.items) {
      if (item.status === "pending") {
        item.status = "failed";
        item.statusText = "Cancelled";
      }
    }
    this.emitProgress();
  }

  public retryItem(itemId: string) {
    const item = this.items.find((i) => i.id === itemId);
    if (!item || item.status === "processing") return;
    item.status = "pending";
    item.statusText = "Queued for retry";
    delete item.error;
    this.isCancelled = false;
    this.emitProgress();
    void this.processSingleItem(item);
  }

  public retryAllFailed() {
    const failedItems = this.items.filter((i) => i.status === "failed");
    if (failedItems.length === 0) return;
    this.isCancelled = false;
    for (const item of failedItems) {
      item.status = "pending";
      item.statusText = "Queued for retry";
      delete item.error;
    }
    this.emitProgress();
    const workersToLaunch = Math.min(this.concurrency - this.activeCount, failedItems.length);
    for (let i = 0; i < Math.max(1, workersToLaunch); i++) {
      void this.nextPending();
    }
  }

  private async nextPending(): Promise<void> {
    if (this.isCancelled) return;
    const pendingItem = this.items.find((i) => i.status === "pending");
    if (!pendingItem) {
      if (this.activeCount === 0) {
        const state = this.getProgress();
        this.onAllFinished?.(this.completedBoards, state);
      }
      return;
    }
    await this.processSingleItem(pendingItem);
    void this.nextPending();
  }

  private async processSingleItem(item: BatchItem): Promise<void> {
    if (this.isCancelled) return;
    this.activeCount++;
    item.status = "processing";
    item.statusText = "Starting conversion...";
    this.emitProgress();

    try {
      const board = await this.convertFile(item);
      item.status = "completed";
      item.statusText = "Completed";
      item.board = board;
      this.completedBoards.push(board);
      this.onItemCompleted?.(board, item);
    } catch (err: any) {
      console.warn(`[BatchQueue] Item ${item.fileName} failed:`, err);
      item.status = "failed";
      item.error = err?.message || "Conversion failed";
      item.statusText = "Failed";
      this.onItemFailed?.(item.error || "Unknown error", item);
    } finally {
      this.activeCount--;
      this.emitProgress();
    }
  }

  public async fallbackToImage(itemId: string): Promise<BoardRecord | null> {
    const item = this.items.find((i) => i.id === itemId);
    if (!item) return null;
    item.status = "processing";
    item.statusText = "Saving as image whiteboard...";
    delete item.error;
    this.emitProgress();

    try {
      const board = await this.createImageBoard(item);
      item.status = "completed";
      item.statusText = "Saved as image";
      item.board = board;
      this.completedBoards.push(board);
      this.onItemCompleted?.(board, item);
      return board;
    } catch (err: any) {
      console.warn(`[BatchQueue] Failed to save ${item.fileName} as image:`, err);
      item.status = "failed";
      item.error = err?.message || "Failed to save image";
      item.statusText = "Failed";
      this.onItemFailed?.(item.error || "Failed to save image", item);
      return null;
    } finally {
      this.emitProgress();
      if (
        this.activeCount === 0 &&
        !this.items.some((i) => i.status === "processing" || i.status === "pending")
      ) {
        const state = this.getProgress();
        this.onAllFinished?.(this.completedBoards, state);
      }
    }
  }

  public async fallbackAllFailedToImage(): Promise<BoardRecord[]> {
    const failedItems = this.items.filter((i) => i.status === "failed");
    const results: BoardRecord[] = [];
    for (const item of failedItems) {
      const board = await this.fallbackToImage(item.id);
      if (board) results.push(board);
    }
    return results;
  }

  private async createImageBoard(item: BatchItem): Promise<BoardRecord> {
    const file = item.file;
    const baseTime = Date.now();
    const cleanTitle = item.boardTitle;
    const cat = autoExtractPhaseAndWeek(cleanTitle);

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read image file"));
      reader.readAsDataURL(file);
    });

    const imgDim = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 800;
        let w = img.naturalWidth || img.width || 600;
        let h = img.naturalHeight || img.height || 450;
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
      img.onerror = () => resolve({ w: 600, h: 450 });
      img.src = dataUrl;
    });

    const newBoard: BoardRecord = {
      ...blankBoard(cleanTitle),
      id: genBoardId(),
      name: cleanTitle,
      phase: cat.phase,
      week: cat.week,
      phase_category: cat.phase_category,
      week_category: cat.week_category,
      createdAt: baseTime,
      updatedAt: baseTime,
      needsFitToScreen: true,
      elements: [
        {
          id: genBoardId(),
          type: "image",
          src: dataUrl,
          x: -Math.round(imgDim.w / 2),
          y: -Math.round(imgDim.h / 2),
          w: imgDim.w,
          h: imgDim.h,
          rotation: 0,
        },
      ],
      camera: { x: 0, y: 0, zoom: 1 },
    };

    try {
      newBoard.thumb = await generateBoardThumbnail(newBoard);
    } catch {
      /* ignore */
    }

    await putBoard(newBoard);
    return newBoard;
  }

  public getProgress(): BatchProgressState {
    const total = this.items.length;
    const completed = this.items.filter((i) => i.status === "completed").length;
    const failed = this.items.filter((i) => i.status === "failed").length;
    const processing = this.items.filter((i) => i.status === "processing").length;
    const pending = this.items.filter((i) => i.status === "pending").length;
    const percent = total === 0 ? 100 : Math.round(((completed + failed) / total) * 100);

    return {
      total,
      completed,
      failed,
      processing,
      pending,
      percent,
      items: [...this.items],
      isFinished: completed + failed === total || this.isCancelled,
    };
  }

  private emitProgress() {
    if (this.onProgress) {
      this.onProgress(this.getProgress());
    }
  }

  private async next(): Promise<void> {
    if (this.isCancelled) return;
    if (this.queueIndex >= this.items.length) {
      if (this.activeCount === 0) {
        const state = this.getProgress();
        this.onAllFinished?.(this.completedBoards, state);
      }
      return;
    }

    const currentIndex = this.queueIndex++;
    const item = this.items[currentIndex];
    if (!item) return;

    this.activeCount++;
    item.status = "processing";
    item.statusText = "Starting conversion...";
    this.emitProgress();

    try {
      const board = await this.convertFile(item);
      item.status = "completed";
      item.statusText = "Completed";
      item.board = board;
      this.completedBoards.push(board);
      this.onItemCompleted?.(board, item);
    } catch (err: any) {
      console.warn(`[BatchQueue] Item ${item.fileName} failed:`, err);
      item.status = "failed";
      item.error = err?.message || "Conversion failed";
      item.statusText = "Failed";
      this.onItemFailed?.(item.error || "Unknown error", item);
    } finally {
      this.activeCount--;
      this.emitProgress();

      // Launch next item in queue
      void this.next();
    }
  }

  private async convertFile(item: BatchItem): Promise<BoardRecord> {
    const file = item.file;
    const baseTime = Date.now();
    const isPng = file.type === "image/png" || /\.png$/i.test(file.name);
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    const isJson = file.type === "application/json" || /\.json$/i.test(file.name);

    // 1. FAST-PATH: Smart PNG with embedded whiteboard metadata
    if (isPng) {
      try {
        item.statusText = "Checking Smart PNG data...";
        const smartData = await extractSmartPngMetadata(file);
        if (smartData && Array.isArray(smartData.elements) && smartData.elements.length > 0) {
          item.isSmartPng = true;
          item.statusText = "Restoring native whiteboard...";
          const title = smartData.name || item.boardTitle;
          const cat = autoExtractPhaseAndWeek(title);
          const board: BoardRecord = {
            ...blankBoard(title),
            id: genBoardId(),
            name: title,
            phase: smartData["phase"] || cat.phase,
            week: smartData["week"] || cat.week,
            phase_category: smartData["phase_category"] ?? cat.phase_category,
            week_category: smartData["week_category"] ?? cat.week_category,
            createdAt: baseTime,
            updatedAt: baseTime,
            needsFitToScreen: true,
            elements: smartData.elements,
            bgColor: smartData.bgColor || "#ffffff",
            theme: smartData.theme || "classlight",
            gridStyle: smartData.gridStyle || "none",
            gridSpacing: smartData.gridSpacing || 24,
            camera: smartData.camera || { x: 0, y: 0, zoom: 1 },
            toolbarPos: (smartData as any)["toolbarPos"] || "bottom",
            stickyAutoEdit: (smartData as any)["stickyAutoEdit"] ?? true,
            thumb: (smartData as any)["thumb"] ?? null,
          };

          if (!board.thumb && board.elements.length > 0) {
            try {
              board.thumb = await generateBoardThumbnail(board);
            } catch {
              /* ignore */
            }
          }

          await putBoard(board);
          return board;
        }
      } catch (err) {
        console.warn("Smart PNG extraction fallback:", err);
      }
    }

    // 2. JSON Whiteboard file
    if (isJson) {
      item.statusText = "Parsing whiteboard data...";
      const text = await file.text();
      const raw = JSON.parse(text);
      const jb: BoardRecord = Array.isArray(raw) ? raw[0] : raw;
      const title = jb.name || item.boardTitle;
      const cat = autoExtractPhaseAndWeek(title);
      const board: BoardRecord = {
        ...blankBoard(title),
        ...jb,
        id: genBoardId(),
        name: title,
        phase: jb.phase || cat.phase,
        week: jb.week || cat.week,
        phase_category: jb.phase_category ?? cat.phase_category,
        week_category: jb.week_category ?? cat.week_category,
        createdAt: baseTime,
        updatedAt: baseTime,
        needsFitToScreen: true,
        elements: Array.isArray(jb.elements) ? jb.elements : [],
      };

      if (!board.thumb && board.elements.length > 0) {
        try {
          board.thumb = await generateBoardThumbnail(board);
        } catch {
          /* ignore */
        }
      }

      await putBoard(board);
      return board;
    }

    // 3. PDF Document -> AI Whiteboard Reconstruction
    if (isPdf) {
      item.statusText = "Rendering PDF pages...";
      const pages = await renderPdfToImages(file);
      const cat = autoExtractPhaseAndWeek(item.boardTitle);
      const elements: any[] = [];
      let currentX = 0;

      for (let pIdx = 0; pIdx < pages.length; pIdx++) {
        const page = pages[pIdx];
        if (!page) continue;
        item.statusText = `Reconstructing page ${pIdx + 1} of ${pages.length}...`;
        this.emitProgress();

        try {
          const prepared = await prepareDataUrlForAnalysis(page.dataUrl);
          const aiResult = await analyzeWhiteboardImage(
            {
              base64: prepared.base64,
              mimeType: prepared.mimeType,
              width: prepared.width,
              height: prepared.height,
            },
            (status) => {
              item.statusText = `Page ${pIdx + 1}/${pages.length}: ${status}`;
              this.emitProgress();
            },
          );

          const reconstructed = reconstructWhiteboardElements(aiResult, prepared.originalImg, {
            targetCenter: {
              x: currentX + page.w / 2,
              y: page.h / 2,
            },
          });

          if (reconstructed.elements && reconstructed.elements.length > 0) {
            elements.push(...reconstructed.elements);
          } else {
            elements.push({
              id: genBoardId(),
              type: "image",
              src: page.src,
              x: currentX,
              y: 0,
              w: page.w,
              h: page.h,
              rotation: 0,
            });
          }
        } catch (pageErr) {
          console.warn(
            `[BatchQueue] Page ${pIdx + 1} vision reconstruction failed, using page image:`,
            pageErr,
          );
          elements.push({
            id: genBoardId(),
            type: "image",
            src: page.src,
            x: currentX,
            y: 0,
            w: page.w,
            h: page.h,
            rotation: 0,
          });
        }

        currentX += page.w + 60;
      }

      const board: BoardRecord = {
        ...blankBoard(item.boardTitle),
        id: genBoardId(),
        name: item.boardTitle,
        phase: cat.phase,
        week: cat.week,
        phase_category: cat.phase_category,
        week_category: cat.week_category,
        createdAt: baseTime,
        updatedAt: baseTime,
        needsFitToScreen: true,
        elements,
      };

      if (board.elements.length > 0) {
        try {
          board.thumb = await generateBoardThumbnail(board);
        } catch {
          /* ignore */
        }
      }

      await putBoard(board);
      return board;
    }

    // 4. Standard Raster Image -> AI Whiteboard Reconstruction Engine
    item.statusText = "Optimizing image payload...";
    const prepared = await prepareImageForAnalysis(file);

    let reconstructedElements: any[] = [];
    const detectedTitle = item.boardTitle;
    let boundsCenter = { x: 0, y: 0 };

    item.statusText = "Reconstructing with AI vision...";
    const aiResult = await analyzeWhiteboardImage(
      {
        base64: prepared.base64,
        mimeType: prepared.mimeType,
        width: prepared.width,
        height: prepared.height,
      },
      (status) => {
        item.statusText = status;
        this.emitProgress();
      },
    );

    const reconstructed = reconstructWhiteboardElements(aiResult, prepared.originalImg, {
      targetCenter: { x: 0, y: 0 },
    });

    reconstructedElements = reconstructed.elements;
    boundsCenter = {
      x: reconstructed.bounds.x + reconstructed.bounds.width / 2,
      y: reconstructed.bounds.y + reconstructed.bounds.height / 2,
    };

    // Assemble Native YY Whiteboard Record strictly preserving the uploaded filename
    const boardTitle = item.boardTitle;
    const cat = autoExtractPhaseAndWeek(boardTitle);
    const newBoard: BoardRecord = {
      ...blankBoard(boardTitle),
      id: genBoardId(),
      name: boardTitle,
      phase: cat.phase,
      week: cat.week,
      phase_category: cat.phase_category,
      week_category: cat.week_category,
      createdAt: baseTime,
      updatedAt: baseTime,
      needsFitToScreen: true,
      elements: reconstructedElements,
      camera: {
        x: -boundsCenter.x,
        y: -boundsCenter.y,
        zoom: 1,
      },
    };

    // Proactive thumbnail generation
    try {
      item.statusText = "Generating preview thumbnail...";
      newBoard.thumb = await generateBoardThumbnail(newBoard);
    } catch {
      /* ignore */
    }

    await putBoard(newBoard);
    return newBoard;
  }
}

type BatchListener = (state: BatchProgressState | null) => void;
type ItemCompletedListener = (board: BoardRecord, item: BatchItem) => void;

/**
 * GlobalBatchManager persists batch conversions across navigation / component unmounts.
 */
class GlobalBatchManager {
  private queue: BatchConversionQueue | null = null;
  private currentProgress: BatchProgressState | null = null;
  private listeners: Set<BatchListener> = new Set();
  private itemCompletedListeners: Set<ItemCompletedListener> = new Set();

  public getProgress(): BatchProgressState | null {
    return this.currentProgress;
  }

  public getQueue(): BatchConversionQueue | null {
    return this.queue;
  }

  public subscribe(listener: BatchListener): () => void {
    this.listeners.add(listener);
    listener(this.currentProgress ? { ...this.currentProgress } : null);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public onItemCompleted(listener: ItemCompletedListener): () => void {
    this.itemCompletedListeners.add(listener);
    return () => {
      this.itemCompletedListeners.delete(listener);
    };
  }

  private notify() {
    const payload = this.currentProgress ? { ...this.currentProgress } : null;
    for (const listener of this.listeners) {
      try {
        listener(payload);
      } catch (err) {
        console.error("Batch listener error:", err);
      }
    }
  }

  public startBatch(
    files: File[],
    options: {
      concurrency?: number;
      onItemCompleted?: (board: BoardRecord, item: BatchItem) => void;
      onItemFailed?: (errMsg: string, item: BatchItem) => void;
      onAllFinished?: () => void;
    } = {}
  ): BatchConversionQueue {
    if (this.queue && !this.currentProgress?.isFinished) {
      this.queue.cancel();
    }

    const queue = new BatchConversionQueue(files, {
      concurrency: options.concurrency ?? 3,
      onProgress: (prog) => {
        this.currentProgress = { ...prog };
        this.notify();
      },
      onItemCompleted: (board, item) => {
        options.onItemCompleted?.(board, item);
        for (const cb of this.itemCompletedListeners) {
          try {
            cb(board, item);
          } catch (e) {
            console.error(e);
          }
        }
      },
      onItemFailed: (errMsg, item) => {
        options.onItemFailed?.(errMsg, item);
      },
      onAllFinished: () => {
        options.onAllFinished?.();
      },
    });

    this.queue = queue;
    queue.start();
    return queue;
  }

  public retryItem(itemId: string) {
    this.queue?.retryItem(itemId);
  }

  public retryAllFailed() {
    this.queue?.retryAllFailed();
  }

  public async fallbackToImage(itemId: string) {
    await this.queue?.fallbackToImage(itemId);
  }

  public async fallbackAllFailedToImage() {
    await this.queue?.fallbackAllFailedToImage();
  }

  public cancel() {
    this.queue?.cancel();
  }

  public dismiss() {
    this.currentProgress = null;
    this.notify();
  }
}

export const globalBatchManager = new GlobalBatchManager();

