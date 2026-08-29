import { describe, it, expect } from "vitest";
import { reconstructWhiteboardElements, type AiConversionResult } from "../src/lib/image-importer";

describe("Whiteboard Reconstruction - Element Generation & Layer Hierarchy", () => {
  // Create mock Image element with defined dimensions
  const mockImage = {
    naturalWidth: 1200,
    naturalHeight: 800,
    width: 1200,
    height: 800,
    src: "data:image/png;base64,mockSourceImageData",
  } as unknown as HTMLImageElement;

  it("should generate valid unique IDs for all reconstructed elements", () => {
    const aiResult: AiConversionResult = {
      imageWidth: 1200,
      imageHeight: 800,
      counts: {
        text: 1,
        sticky: 1,
        shapes: 1,
        connectors: 1,
        drawings: 1,
        embeddedImages: 0,
        total: 5,
      },
      objects: [
        { type: "text", text: "Title", x: 100, y: 50, width: 200, height: 40 },
        { type: "sticky", text: "Note", x: 100, y: 120, width: 180, height: 140 },
        { type: "shape", shapeType: "circle", x: 400, y: 200, width: 100, height: 100 },
        {
          type: "connector",
          connectorType: "arrow",
          startX: 200,
          startY: 100,
          endX: 400,
          endY: 200,
        },
        {
          type: "drawing",
          points: [
            { x: 10, y: 10 },
            { x: 50, y: 50 },
          ],
        },
      ],
    };

    const reconstructed = reconstructWhiteboardElements(aiResult, mockImage);
    expect(reconstructed.elements).toHaveLength(5);

    const ids = reconstructed.elements.map((el) => el.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(5);
    ids.forEach((id) => {
      expect(id).toMatch(/^e/);
      expect(id.length).toBeGreaterThan(5);
    });
  });

  it("should enforce strict z-order layering: background -> sticky -> shapes -> drawings -> text -> connectors", () => {
    const aiResult: AiConversionResult = {
      imageWidth: 1200,
      imageHeight: 800,
      counts: {
        text: 1,
        sticky: 1,
        shapes: 2,
        connectors: 1,
        drawings: 1,
        embeddedImages: 0,
        total: 6,
      },
      // Mix them up randomly in the AI input
      objects: [
        { type: "connector", connectorType: "arrow", startX: 10, startY: 10, endX: 100, endY: 100 },
        { type: "text", text: "Text On Top", x: 50, y: 50, width: 100, height: 30 },
        { type: "shape", shapeType: "rect", x: 0, y: 0, width: 800, height: 600, fill: true }, // Large filled rect -> background container
        {
          type: "drawing",
          points: [
            { x: 5, y: 5 },
            { x: 15, y: 15 },
          ],
        },
        { type: "sticky", text: "Sticky", x: 60, y: 60, width: 180, height: 140 },
        { type: "shape", shapeType: "circle", x: 200, y: 200, width: 50, height: 50 }, // standard shape
      ],
    };

    const reconstructed = reconstructWhiteboardElements(aiResult, mockImage);
    const types = reconstructed.elements.map((el) => el.type);

    // 1. Background rect card
    expect(types[0]).toBe("rect");
    // 2. Sticky note
    expect(types[1]).toBe("sticky");
    // 3. Small circle shape
    expect(types[2]).toBe("circle");
    // 4. Drawing (pen)
    expect(types[3]).toBe("pen");
    // 5. Text
    expect(types[4]).toBe("text");
    // 6. Connector
    expect(types[5]).toBe("arrow");
  });

  it("should calculate correct bounding box centered at requested coordinates", () => {
    const aiResult: AiConversionResult = {
      imageWidth: 1200,
      imageHeight: 800,
      counts: {
        text: 1,
        sticky: 0,
        shapes: 0,
        connectors: 0,
        drawings: 0,
        embeddedImages: 0,
        total: 1,
      },
      objects: [{ type: "text", text: "Centered", x: 100, y: 100, width: 200, height: 40 }],
    };

    const reconstructed = reconstructWhiteboardElements(aiResult, mockImage, {
      targetCenter: { x: 500, y: 300 },
      maxCanvasWidth: 1200,
    });

    expect(reconstructed.bounds.width).toBe(1200);
    expect(reconstructed.bounds.height).toBe(800);
    expect(reconstructed.bounds.x).toBe(500 - 600); // centerX - totalWidth/2 = -100
    expect(reconstructed.bounds.y).toBe(300 - 400); // centerY - totalHeight/2 = -100
  });

  it("should generate a backup original image element when keepOriginalImage is enabled", () => {
    const aiResult: AiConversionResult = {
      imageWidth: 1200,
      imageHeight: 800,
      counts: {
        text: 1,
        sticky: 0,
        shapes: 0,
        connectors: 0,
        drawings: 0,
        embeddedImages: 0,
        total: 1,
      },
      objects: [{ type: "text", text: "Test", x: 10, y: 10, width: 50, height: 20 }],
    };

    const reconstructed = reconstructWhiteboardElements(aiResult, mockImage, {
      keepOriginalImage: true,
      targetCenter: { x: 0, y: 0 },
    });

    expect(reconstructed.originalImageElement).toBeDefined();
    expect(reconstructed.originalImageElement?.type).toBe("image");
    expect(reconstructed.originalImageElement?.src).toBe(mockImage.src);
    // Original image should be placed offset to the left of the reconstructed elements
    expect(reconstructed.originalImageElement?.x).toBeLessThan(reconstructed.bounds.x);
  });
});
