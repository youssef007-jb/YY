import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  BatchConversionQueue,
  type BatchItem,
  type BatchProgressState,
} from "../src/lib/batch-converter";
import * as boardsDb from "../src/lib/boards-db";
import * as smartPng from "../src/lib/smart-png";
import * as thumbGen from "../src/lib/thumbnail-generator";
import { embedSmartPngMetadata } from "../src/lib/smart-png";

// Helper to create a dummy PNG buffer
function createDummyPngBytes(): Uint8Array {
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82,
  ]);
}

describe("Batch Conversion Pipeline Lifecycle & Name Preservation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Queue Initialization & Name Derivation", () => {
    it("should initialize batch items strictly preserving filenames as board titles", () => {
      const file1 = new File(["dummy1"], "Sprint Planning (Phase 2 Week 3).png", {
        type: "image/png",
      });
      const file2 = new File(["dummy2"], "Architecture.v2.Draft.jpg", { type: "image/jpeg" });
      const file3 = new File(["dummy3"], "Réunion d'équipe 2026.pdf", { type: "application/pdf" });
      const file4 = new File(["dummy4"], "数学ノート.json", { type: "application/json" });

      const queue = new BatchConversionQueue([file1, file2, file3, file4]);
      const progress = queue.getProgress();

      expect(progress.total).toBe(4);
      expect(progress.items[0].boardTitle).toBe("Sprint Planning (Phase 2 Week 3)");
      expect(progress.items[0].fileName).toBe("Sprint Planning (Phase 2 Week 3).png");
      expect(progress.items[0].status).toBe("pending");

      expect(progress.items[1].boardTitle).toBe("Architecture.v2.Draft");
      expect(progress.items[2].boardTitle).toBe("Réunion d'équipe 2026");
      expect(progress.items[3].boardTitle).toBe("数学ノート");
    });
  });

  describe("Progress Tracking & State Computations", () => {
    it("should calculate exact percentages and state counters", () => {
      const files = [
        new File(["f1"], "Board1.png", { type: "image/png" }),
        new File(["f2"], "Board2.png", { type: "image/png" }),
        new File(["f3"], "Board3.png", { type: "image/png" }),
        new File(["f4"], "Board4.png", { type: "image/png" }),
      ];

      const queue = new BatchConversionQueue(files);
      const p = queue.getProgress();
      expect(p.total).toBe(4);
      expect(p.pending).toBe(4);
      expect(p.completed).toBe(0);
      expect(p.failed).toBe(0);
      expect(p.percent).toBe(0);
      expect(p.isFinished).toBe(false);
    });
  });

  describe("Smart PNG Fast-Path Lifecycle & Validation", () => {
    it("should extract embedded metadata, preserve board name, and mark needsFitToScreen: true", async () => {
      const savedBoards: boardsDb.BoardRecord[] = [];
      vi.spyOn(boardsDb, "putBoard").mockImplementation(async (b) => {
        savedBoards.push(b);
        return b;
      });
      vi.spyOn(thumbGen, "generateBoardThumbnail").mockResolvedValue(
        "data:image/webp;base64,mockThumb",
      );

      const originalName = "High Level Architecture (Phase 1 Week 2)";
      const rawPng = createDummyPngBytes();
      const smartBlob = await embedSmartPngMetadata(rawPng, {
        name: originalName,
        elements: [
          { id: "e1", type: "sticky", text: "API Gateway", x: 100, y: 100, w: 180, h: 140 },
          { id: "e2", type: "shape", shapeType: "roundRect", x: 350, y: 100, w: 200, h: 100 },
        ],
        theme: "classlight",
        bgColor: "#ffffff",
      });

      const smartFile = new File([smartBlob], "Exported_Architecture.png", { type: "image/png" });

      let completedBoard: boardsDb.BoardRecord | undefined;
      const queue = new BatchConversionQueue([smartFile], {
        concurrency: 1,
        onItemCompleted: (board) => {
          completedBoard = board;
        },
      });

      queue.start();

      // Wait for queue processing to complete
      await new Promise<void>((resolve) => {
        const check = () => {
          if (queue.getProgress().isFinished) resolve();
          else setTimeout(check, 20);
        };
        check();
      });

      expect(completedBoard).toBeDefined();
      expect(completedBoard?.name).toBe(originalName);
      expect(completedBoard?.elements).toHaveLength(2);
      expect(completedBoard?.needsFitToScreen).toBe(true);
      expect(completedBoard?.phase_category).toBe(1);
      expect(completedBoard?.week_category).toBe(2);
      expect(savedBoards).toHaveLength(1);
      expect(savedBoards[0].id).toBe(completedBoard?.id);
    });
  });

  describe("JSON Whiteboard File Import Lifecycle", () => {
    it("should parse JSON whiteboard data, preserve name, and set needsFitToScreen: true", async () => {
      const savedBoards: boardsDb.BoardRecord[] = [];
      vi.spyOn(boardsDb, "putBoard").mockImplementation(async (b) => {
        savedBoards.push(b);
        return b;
      });
      vi.spyOn(thumbGen, "generateBoardThumbnail").mockResolvedValue(
        "data:image/webp;base64,mockThumb",
      );

      const jsonPayload = JSON.stringify({
        name: "Cloud Migration Plan (Phase 3 Week 5)",
        elements: [{ id: "e10", type: "text", text: "Phase 3 Steps", x: 50, y: 50, w: 200, h: 40 }],
        theme: "classlight",
        bgColor: "#ffffff",
      });

      const jsonFile = new File([jsonPayload], "Cloud Migration Plan.json", {
        type: "application/json",
      });

      let completedBoard: boardsDb.BoardRecord | undefined;
      const queue = new BatchConversionQueue([jsonFile], {
        concurrency: 1,
        onItemCompleted: (board) => {
          completedBoard = board;
        },
      });

      queue.start();

      await new Promise<void>((resolve) => {
        const check = () => {
          if (queue.getProgress().isFinished) resolve();
          else setTimeout(check, 20);
        };
        check();
      });

      expect(completedBoard).toBeDefined();
      expect(completedBoard?.name).toBe("Cloud Migration Plan (Phase 3 Week 5)");
      expect(completedBoard?.elements).toHaveLength(1);
      expect(completedBoard?.needsFitToScreen).toBe(true);
      expect(completedBoard?.phase_category).toBe(3);
      expect(completedBoard?.week_category).toBe(5);
    });
  });

  describe("Queue Control: Cancellation & Retries", () => {
    it("should mark pending items as cancelled when cancel() is invoked", () => {
      const files = [
        new File(["f1"], "Board1.png", { type: "image/png" }),
        new File(["f2"], "Board2.png", { type: "image/png" }),
      ];

      const queue = new BatchConversionQueue(files);
      queue.cancel();

      const p = queue.getProgress();
      expect(p.isFinished).toBe(true);
      expect(p.items[0].status).toBe("failed");
      expect(p.items[0].statusText).toBe("Cancelled");
    });
  });
});
