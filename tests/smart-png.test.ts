import { describe, it, expect } from "vitest";
import {
  embedSmartPngMetadata,
  extractSmartPngMetadata,
  isPngBuffer,
  isSmartPngFile,
  type SmartCanvasPayload,
} from "../src/lib/smart-png";

// Helper to create a minimal valid PNG 1x1 buffer with PNG signature + IHDR + IDAT + IEND
function createDummyPngBuffer(): Uint8Array {
  // Standard 1x1 transparent PNG binary bytes
  const bytes = new Uint8Array([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a, // PNG Signature
    // IHDR chunk (13 bytes payload)
    0x00,
    0x00,
    0x00,
    0x0d, // Length: 13
    0x49,
    0x48,
    0x44,
    0x52, // Chunk type: IHDR
    0x00,
    0x00,
    0x00,
    0x01, // Width: 1
    0x00,
    0x00,
    0x00,
    0x01, // Height: 1
    0x08,
    0x06,
    0x00,
    0x00,
    0x00, // Bit depth, Color type, Comp, Filter, Interlace
    0x1f,
    0x15,
    0xc4,
    0x89, // CRC
    // IDAT chunk (empty image data)
    0x00,
    0x00,
    0x00,
    0x0a, // Length: 10
    0x49,
    0x44,
    0x41,
    0x54, // Chunk type: IDAT
    0x78,
    0x9c,
    0x63,
    0x00,
    0x01,
    0x00,
    0x00,
    0x05,
    0x00,
    0x01,
    0x0d,
    0x0a,
    0x2d,
    0xb4, // CRC
    // IEND chunk
    0x00,
    0x00,
    0x00,
    0x00, // Length: 0
    0x49,
    0x45,
    0x4e,
    0x44, // Chunk type: IEND
    0xae,
    0x42,
    0x60,
    0x82, // CRC
  ]);
  return bytes;
}

describe("Smart PNG Pipeline - Metadata Embedding, Extraction & Name Preservation", () => {
  it("should accurately identify valid PNG buffers and reject non-PNG buffers", () => {
    const validPng = createDummyPngBuffer();
    expect(isPngBuffer(validPng)).toBe(true);

    const nonPng = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
    expect(isPngBuffer(nonPng)).toBe(false);

    const shortBuffer = new Uint8Array([0x89, 0x50]);
    expect(isPngBuffer(shortBuffer)).toBe(false);
  });

  it("should embed canvas metadata and preserve exact whiteboard title through extraction", async () => {
    const rawPng = createDummyPngBuffer();
    const boardTitle = "Sprint #4: Architecture & Design (Phase 2 Week 3)";
    const elements = [
      {
        id: "e1",
        type: "sticky",
        text: "Important note",
        x: 100,
        y: 200,
        w: 180,
        h: 140,
        bg: "#fef08a",
      },
      {
        id: "e2",
        type: "text",
        text: "Database Schema",
        x: 350,
        y: 200,
        w: 200,
        h: 40,
        size: 24,
      },
    ];

    const smartBlob = await embedSmartPngMetadata(rawPng, {
      name: boardTitle,
      elements,
      bgColor: "#f8fafc",
      theme: "classlight",
      gridStyle: "dot-grid",
      gridSpacing: 32,
      camera: { x: 150, y: -80, zoom: 1.25 },
    });

    expect(smartBlob.type).toBe("image/png");
    expect(smartBlob.size).toBeGreaterThan(rawPng.length);

    const extracted = await extractSmartPngMetadata(smartBlob);
    expect(extracted).not.toBeNull();
    expect(extracted?.name).toBe(boardTitle);
    expect(extracted?.elements).toHaveLength(2);
    expect(extracted?.elements[0].id).toBe("e1");
    expect(extracted?.elements[0].text).toBe("Important note");
    expect(extracted?.bgColor).toBe("#f8fafc");
    expect(extracted?.theme).toBe("classlight");
    expect(extracted?.gridStyle).toBe("dot-grid");
    expect(extracted?.gridSpacing).toBe(32);
    expect(extracted?.camera).toEqual({ x: 150, y: -80, zoom: 1.25 });
  });

  it("should preserve Unicode whiteboard names and characters in Smart PNG", async () => {
    const rawPng = createDummyPngBuffer();
    const unicodeTitle = "数学ノート - Réunion d'équipe & 企画書 🚀 (2026)";
    const elements = [
      {
        id: "el-unicode",
        type: "text",
        text: "مرحبا بالعالم - Здравствуйте - こんにちは",
        x: 50,
        y: 50,
        w: 300,
        h: 50,
      },
    ];

    const smartBlob = await embedSmartPngMetadata(rawPng, {
      name: unicodeTitle,
      elements,
    });

    const extracted = await extractSmartPngMetadata(smartBlob);
    expect(extracted).not.toBeNull();
    expect(extracted?.name).toBe(unicodeTitle);
    expect(extracted?.elements[0].text).toBe("مرحبا بالعالم - Здравствуйте - こんにちは");
  });

  it("should strip ephemeral runtime DOM properties before embedding", async () => {
    const rawPng = createDummyPngBuffer();
    const runtimeElements = [
      {
        id: "el-dom",
        type: "image",
        src: "data:image/png;base64,iVBORw0KGgo...",
        img: { naturalWidth: 800, naturalHeight: 600 }, // Ephemeral DOM reference
        _handles: ["tl", "tr", "bl", "br"], // Runtime transient state
        _fadeInterval: 12345, // Runtime timer ID
        fireStarted: true, // Ephemeral animation state
        _fresh: true,
        x: 0,
        y: 0,
        w: 400,
        h: 300,
      },
      {
        id: "el-vanishing",
        type: "vanishing",
        opacity: 0.35, // Was fading out during export
        points: [
          { x: 10, y: 10 },
          { x: 20, y: 20 },
        ],
      },
    ];

    const smartBlob = await embedSmartPngMetadata(rawPng, {
      name: "Cleaned Board",
      elements: runtimeElements,
    });

    const extracted = await extractSmartPngMetadata(smartBlob);
    expect(extracted).not.toBeNull();
    const cleanImg = extracted?.elements[0];
    expect(cleanImg.img).toBeUndefined();
    expect(cleanImg._handles).toBeUndefined();
    expect(cleanImg._fadeInterval).toBeUndefined();
    expect(cleanImg.fireStarted).toBeUndefined();
    expect(cleanImg._fresh).toBeUndefined();
    expect(cleanImg.x).toBe(0);
    expect(cleanImg.w).toBe(400);

    // Vanishing strokes opacity should reset to 1
    const cleanVanishing = extracted?.elements[1];
    expect(cleanVanishing.opacity).toBe(1);
  });

  it("should return null when reading a standard non-Smart PNG", async () => {
    const standardPng = createDummyPngBuffer();
    const extracted = await extractSmartPngMetadata(standardPng);
    expect(extracted).toBeNull();
  });

  it("should correctly identify Smart PNG vs standard PNG using isSmartPngFile", async () => {
    const standardPng = createDummyPngBuffer();
    const isSmart1 = await isSmartPngFile(new Blob([standardPng], { type: "image/png" }));
    expect(isSmart1).toBe(false);

    const smartBlob = await embedSmartPngMetadata(standardPng, {
      name: "Smart Board",
      elements: [{ id: "1", type: "text", text: "Hello" }],
    });
    const isSmart2 = await isSmartPngFile(smartBlob);
    expect(isSmart2).toBe(true);
  });
});
