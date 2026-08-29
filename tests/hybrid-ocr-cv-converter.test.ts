import { describe, it, expect } from "vitest";
import { runOcrAndComputerVision } from "../src/server/ocr-cv-pipeline";
import { convertWhiteboardImage } from "../src/server/image-converter";
import { reconstructWhiteboardElements } from "../src/lib/image-importer";

describe("Hybrid OCR + Computer Vision + AI Fallback Pipeline", () => {
  it("should run deterministic OCR/CV pipeline and return structured objects with confidence scoring", async () => {
    // Minimal 1x1 base64 image
    const sampleBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const result = await runOcrAndComputerVision({
      imageBase64: sampleBase64,
      mimeType: "image/png",
      width: 800,
      height: 600,
    });

    expect(result).toBeDefined();
    expect(typeof result.confidence).toBe("number");
    expect(typeof result.isConfident).toBe("boolean");
    expect(Array.isArray(result.objects)).toBe(true);
  });

  it("should reconstruct structured flowchart diagram (e.g. [ LOGIN ] -> [ DASHBOARD ]) into native Whiteboard objects", () => {
    const mockImage = {
      naturalWidth: 1000,
      naturalHeight: 600,
      width: 1000,
      height: 600,
      src: "data:image/png;base64,mockImage",
    } as unknown as HTMLImageElement;

    // Simulate OCR + CV detected flowchart
    const hybridDetectionResult = {
      imageWidth: 1000,
      imageHeight: 600,
      counts: {
        text: 2,
        sticky: 0,
        shapes: 2,
        connectors: 1,
        drawings: 0,
        embeddedImages: 0,
        total: 5,
      },
      objects: [
        { type: "shape" as const, shapeType: "rect" as const, x: 100, y: 100, width: 200, height: 80, color: "#2563eb", fill: false, strokeWidth: 2 },
        { type: "text" as const, text: "LOGIN", x: 140, y: 125, width: 120, height: 30, fontSize: 18, bold: true },
        { type: "connector" as const, connectorType: "arrow" as const, startX: 200, startY: 180, endX: 200, endY: 280, color: "#1e1e1e", strokeWidth: 2 },
        { type: "shape" as const, shapeType: "rect" as const, x: 100, y: 280, width: 200, height: 80, color: "#16a34a", fill: false, strokeWidth: 2 },
        { type: "text" as const, text: "DASHBOARD", x: 125, y: 305, width: 150, height: 30, fontSize: 18, bold: true },
      ],
    };

    const reconstructed = reconstructWhiteboardElements(hybridDetectionResult, mockImage);
    expect(reconstructed.elements).toHaveLength(5);

    // Verify types match native whiteboard types
    const types = reconstructed.elements.map((e) => e.type);
    expect(types.filter((t) => t === "rect")).toHaveLength(2);
    expect(types.filter((t) => t === "text")).toHaveLength(2);
    expect(types.filter((t) => t === "arrow")).toHaveLength(1);

    // Verify text contents
    const textEls = reconstructed.elements.filter((e) => e.type === "text");
    expect(textEls.map((e) => e.text)).toContain("LOGIN");
    expect(textEls.map((e) => e.text)).toContain("DASHBOARD");
  });

  it("should preserve existing native object formats without modifying canvas or object schemas", () => {
    const mockImage = {
      naturalWidth: 800,
      naturalHeight: 600,
      width: 800,
      height: 600,
      src: "data:image/png;base64,mock",
    } as unknown as HTMLImageElement;

    const hybridResult = {
      imageWidth: 800,
      imageHeight: 600,
      counts: { text: 1, sticky: 1, shapes: 1, connectors: 1, drawings: 1, embeddedImages: 0, total: 5 },
      objects: [
        { type: "text" as const, text: "Editable Text", x: 50, y: 50, width: 120, height: 30, fontSize: 16 },
        { type: "sticky" as const, text: "Sticky Note", x: 200, y: 50, width: 180, height: 140, bg: "#fef08a" },
        { type: "shape" as const, shapeType: "circle" as const, x: 450, y: 50, width: 80, height: 80, color: "#1e1e1e" },
        { type: "connector" as const, connectorType: "arrow" as const, startX: 100, startY: 100, endX: 200, endY: 100 },
        { type: "drawing" as const, points: [{ x: 10, y: 10 }, { x: 20, y: 20 }] },
      ],
    };

    const output = reconstructWhiteboardElements(hybridResult, mockImage);
    output.elements.forEach((el) => {
      // Check required base whiteboard element properties
      expect(el.id).toBeDefined();
      expect(typeof el.type).toBe("string");
      if (el.type !== "pen" && el.type !== "highlighter") {
        expect(typeof el.x).toBe("number");
        expect(typeof el.y).toBe("number");
      }
    });
  });

  it("should map complex geometric primitives (diamonds, sticky notes, connectors) directly into native objects", () => {
    const mockImage = {
      naturalWidth: 1200,
      naturalHeight: 800,
      width: 1200,
      height: 800,
      src: "data:image/png;base64,mock",
    } as unknown as HTMLImageElement;

    const hybridResult = {
      imageWidth: 1200,
      imageHeight: 800,
      counts: { text: 1, sticky: 1, shapes: 2, connectors: 1, drawings: 0, embeddedImages: 0, total: 5 },
      objects: [
        { type: "shape" as const, shapeType: "diamond" as const, x: 200, y: 150, width: 140, height: 100, color: "#9333ea" },
        { type: "text" as const, text: "Is Authenticated?", x: 210, y: 185, width: 120, height: 30, fontSize: 14 },
        { type: "connector" as const, connectorType: "arrow" as const, startX: 340, startY: 200, endX: 450, endY: 200, color: "#1e1e1e" },
        { type: "sticky" as const, text: "Important Note:\nVerify JWT token expiry", x: 480, y: 150, width: 200, height: 160, bg: "#bbf7d0", color: "#14532d" },
        { type: "shape" as const, shapeType: "roundRect" as const, x: 100, y: 400, width: 220, height: 90, color: "#2563eb", fill: true },
      ],
    };

    const output = reconstructWhiteboardElements(hybridResult, mockImage);
    expect(output.elements).toHaveLength(5);

    const diamond = output.elements.find((e) => e.type === "diamond");
    expect(diamond).toBeDefined();
    expect(diamond?.color).toBe("#9333ea");

    const sticky = output.elements.find((e) => e.type === "sticky");
    expect(sticky).toBeDefined();
    expect(sticky?.bg).toBe("#bbf7d0");
    expect((sticky as any)?.text).toContain("Verify JWT token expiry");
  });
});
