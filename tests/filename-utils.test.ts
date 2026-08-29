import { describe, it, expect } from "vitest";
import { stripFileExtension, buildDownloadFilename } from "../src/lib/filename-utils";

describe("Filename Utils - Name Preservation and Extension Handling", () => {
  describe("stripFileExtension", () => {
    it("should strip single standard file extensions", () => {
      expect(stripFileExtension("My Whiteboard.png")).toBe("My Whiteboard");
      expect(stripFileExtension("Project Notes.jpg")).toBe("Project Notes");
      expect(stripFileExtension("Weekly Sprint.jpeg")).toBe("Weekly Sprint");
      expect(stripFileExtension("Architecture Diagram.pdf")).toBe("Architecture Diagram");
      expect(stripFileExtension("Exported Canvas.json")).toBe("Exported Canvas");
      expect(stripFileExtension("Artwork.webp")).toBe("Artwork");
    });

    it("should preserve multiple dots within the filename and only strip the last extension", () => {
      expect(stripFileExtension("Sprint.Review.v2.5.draft.png")).toBe("Sprint.Review.v2.5.draft");
      expect(stripFileExtension("model.spec.final.v1.0.pdf")).toBe("model.spec.final.v1.0");
      expect(stripFileExtension("app.config.backup.2026.08.28.json")).toBe(
        "app.config.backup.2026.08.28",
      );
    });

    it("should preserve exact casing", () => {
      expect(stripFileExtension("MiXeD CaSe FiLeNaMe.PNG")).toBe("MiXeD CaSe FiLeNaMe");
      expect(stripFileExtension("ALL_CAPS_BOARD.PDF")).toBe("ALL_CAPS_BOARD");
      expect(stripFileExtension("camelCaseTitle.jpeg")).toBe("camelCaseTitle");
    });

    it("should preserve Unicode and non-Latin characters literally", () => {
      expect(stripFileExtension("Réunion d'équipe 2026.png")).toBe("Réunion d'équipe 2026");
      expect(stripFileExtension("Проектная доска.jpg")).toBe("Проектная доска");
      expect(stripFileExtension("数学ノート (Phase 2 Week 4).json")).toBe(
        "数学ノート (Phase 2 Week 4)",
      );
      expect(stripFileExtension("خطة العمل السنوية.pdf")).toBe("خطة العمل السنوية");
      expect(stripFileExtension("Übersicht & Entwurf.png")).toBe("Übersicht & Entwurf");
    });

    it("should preserve spaces, hyphens, underscores, brackets, and punctuation", () => {
      expect(stripFileExtension("[Phase 1] Sprint #3 - Architecture & API (v2).png")).toBe(
        "[Phase 1] Sprint #3 - Architecture & API (v2)",
      );
      expect(stripFileExtension("user_flow_diagram_v3_final.jpg")).toBe(
        "user_flow_diagram_v3_final",
      );
      expect(stripFileExtension("Q3 Review: Wins, Losses & Next Steps.pdf")).toBe(
        "Q3 Review: Wins, Losses & Next Steps",
      );
    });

    it("should handle edge cases such as filenames with no extension or empty input", () => {
      expect(stripFileExtension("WhiteboardWithoutExtension")).toBe("WhiteboardWithoutExtension");
      expect(stripFileExtension(".gitignore")).toBe(".gitignore");
      expect(stripFileExtension("")).toBe("");
      // @ts-expect-error test non-string runtime values
      expect(stripFileExtension(null)).toBe("");
      // @ts-expect-error test non-string runtime values
      expect(stripFileExtension(undefined)).toBe("");
    });
  });

  describe("buildDownloadFilename", () => {
    it("should build download filename with provided extension", () => {
      expect(buildDownloadFilename("Team Roadmap", "png")).toBe("Team Roadmap.png");
      expect(buildDownloadFilename("Architecture", ".pdf")).toBe("Architecture.pdf");
      expect(buildDownloadFilename("Backup Data", "json")).toBe("Backup Data.json");
    });

    it("should preserve Unicode and punctuation in download filenames", () => {
      expect(buildDownloadFilename("Réunion & Stratégie (2026)", "png")).toBe(
        "Réunion & Stratégie (2026).png",
      );
      expect(buildDownloadFilename("数学ノート.v2", "json")).toBe("数学ノート.v2.json");
    });

    it("should fallback to 'Whiteboard' when board name is empty, null, or undefined", () => {
      expect(buildDownloadFilename("", "png")).toBe("Whiteboard.png");
      expect(buildDownloadFilename(null, "pdf")).toBe("Whiteboard.pdf");
      expect(buildDownloadFilename(undefined, ".json")).toBe("Whiteboard.json");
    });
  });
});
