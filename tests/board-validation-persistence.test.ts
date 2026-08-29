import { describe, it, expect } from "vitest";
import {
  blankBoard,
  normalizeBoard,
  autoExtractPhaseAndWeek,
  extractPhaseAndWeekCategories,
  normalizePhaseString,
  type BoardRecord,
} from "../src/lib/boards-db";

describe("Board Record Integrity & Validation Before Persistence", () => {
  describe("Name Preservation & Normalization", () => {
    it("should strictly preserve explicit board names", () => {
      const board: BoardRecord = {
        id: "b123",
        name: "Sprint Planning & Retrospective (Q3 2026)",
        createdAt: 1000,
        updatedAt: 1000,
        elements: [],
        camera: { x: 0, y: 0, zoom: 1 },
        gridStyle: "none",
        gridSpacing: 24,
        bgColor: "#ffffff",
        theme: "classlight",
        toolbarPos: "bottom",
        stickyAutoEdit: false,
        thumb: null,
      };

      const normalized = normalizeBoard(board);
      expect(normalized.name).toBe("Sprint Planning & Retrospective (Q3 2026)");
    });

    it("should preserve Unicode names in board records", () => {
      const board: BoardRecord = {
        ...blankBoard("数学ノート - Phase 1 Week 3"),
        name: "Réunion d'équipe & 企画書 (Phase 2 Week 4) 🚀",
      };

      const normalized = normalizeBoard(board);
      expect(normalized.name).toBe("Réunion d'équipe & 企画書 (Phase 2 Week 4) 🚀");
    });

    it("should fallback to 'Untitled' when name is empty string", () => {
      const board: BoardRecord = {
        ...blankBoard(""),
        name: "",
      };

      const normalized = normalizeBoard(board);
      expect(normalized.name).toBe("Untitled");
    });
  });

  describe("Phase & Week Metadata Extraction", () => {
    it("should extract phase and week while leaving original name unmodified", () => {
      const testCases = [
        {
          input: "Phase 2 Week 4 Architecture Diagram",
          expectedPhase: "Phase 2",
          expectedWeek: "4",
          expectedPhaseCat: 2,
          expectedWeekCat: 4,
        },
        {
          input: "Phase 1 Week 3 Backend Service Design",
          expectedPhase: "Phase 1",
          expectedWeek: "3",
          expectedPhaseCat: 1,
          expectedWeekCat: 3,
        },
        {
          input: "Sprint Review - Week 12",
          expectedPhase: undefined,
          expectedWeek: "12",
          expectedPhaseCat: null,
          expectedWeekCat: 12,
        },
        {
          input: "Phase 5 Kickoff Meeting",
          expectedPhase: "Phase 5",
          expectedWeek: undefined,
          expectedPhaseCat: 5,
          expectedWeekCat: null,
        },
        {
          input: "No numbers in title",
          expectedPhase: undefined,
          expectedWeek: undefined,
          expectedPhaseCat: null,
          expectedWeekCat: null,
        },
      ];

      for (const tc of testCases) {
        const cat = autoExtractPhaseAndWeek(tc.input);
        expect(cat.phase).toBe(tc.expectedPhase);
        expect(cat.week).toBe(tc.expectedWeek);
        expect(cat.phase_category).toBe(tc.expectedPhaseCat);
        expect(cat.week_category).toBe(tc.expectedWeekCat);
      }
    });

    it("should normalize phase strings correctly", () => {
      expect(normalizePhaseString("phase 3")).toBe("Phase 3");
      expect(normalizePhaseString("Phase1")).toBe("Phase 1");
      expect(normalizePhaseString("Phase 2 Final")).toBe("Phase 2 Final");
      expect(normalizePhaseString("")).toBeUndefined();
      expect(normalizePhaseString(null)).toBeUndefined();
    });
  });

  describe("Element Structure & Legacy Layer Migration", () => {
    it("should extract elements from legacy layers if elements array is empty", () => {
      const legacyBoard: BoardRecord = {
        id: "b-legacy",
        name: "Legacy Layer Board",
        createdAt: 1000,
        updatedAt: 1000,
        elements: [],
        camera: { x: 0, y: 0, zoom: 1 },
        gridStyle: "none",
        gridSpacing: 24,
        bgColor: "#ffffff",
        theme: "classlight",
        toolbarPos: "bottom",
        stickyAutoEdit: false,
        thumb: null,
        layers: [
          {
            id: "layer-1",
            elements: [
              { id: "e1", type: "sticky", text: "Restored from layer" },
              { id: "e2", type: "text", text: "Restored text" },
            ],
          },
        ],
      };

      const normalized = normalizeBoard(legacyBoard);
      expect(normalized.elements).toHaveLength(2);
      expect((normalized.elements[0] as any).text).toBe("Restored from layer");
      expect((normalized.elements[1] as any).text).toBe("Restored text");
    });

    it("should initialize blank boards with valid required properties and default camera", () => {
      const b = blankBoard("New Project Board");
      expect(b.id).toMatch(/^b/);
      expect(b.name).toBe("New Project Board");
      expect(Array.isArray(b.elements)).toBe(true);
      expect(b.elements).toHaveLength(0);
      expect(b.camera).toEqual({ x: 0, y: 0, zoom: 1 });
      expect(b.createdAt).toBeGreaterThan(0);
      expect(b.updatedAt).toBeGreaterThan(0);
      expect(b.bgColor).toBe("#ffffff");
      expect(b.theme).toBe("classlight");
    });
  });
});
