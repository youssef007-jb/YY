import { describe, it, expect } from "vitest";
import type {
  DetectedTextObject,
  DetectedStickyObject,
  DetectedShapeObject,
  DetectedConnectorObject,
  DetectedDrawingObject,
  DetectedEmbeddedImageObject,
  ConversionResponse,
} from "../src/server/image-converter";

// Sanitizer function mirroring the server-side conversion parser for testing pure validation rules
function validateAndSanitizeConversion(
  rawObjects: any[],
  width = 1200,
  height = 800,
  detectedTitle = "Converted Whiteboard"
): ConversionResponse {
  const validObjects: any[] = [];
  let textCount = 0;
  let stickyCount = 0;
  let shapesCount = 0;
  let connectorsCount = 0;
  let drawingsCount = 0;
  let imagesCount = 0;

  for (const obj of rawObjects) {
    if (!obj || typeof obj !== "object" || !("type" in obj)) continue;

    switch (obj.type) {
      case "text": {
        if (typeof obj.text === "string" && obj.text.trim()) {
          validObjects.push({
            type: "text",
            text: obj.text,
            x: Math.round(Number(obj.x) || 0),
            y: Math.round(Number(obj.y) || 0),
            width: Math.max(10, Math.round(Number(obj.width) || 120)),
            height: Math.max(10, Math.round(Number(obj.height) || 30)),
            fontSize: Math.max(10, Math.min(160, Math.round(Number(obj.fontSize) || 18))),
            color: typeof obj.color === "string" ? obj.color : "#1E1E1E",
            bold: Boolean(obj.bold),
            italic: Boolean(obj.italic),
            underline: Boolean(obj.underline),
            rotation: Math.round(Number(obj.rotation) || 0),
          });
          textCount++;
        }
        break;
      }
      case "sticky": {
        validObjects.push({
          type: "sticky",
          text: typeof obj.text === "string" ? obj.text : "",
          x: Math.round(Number(obj.x) || 0),
          y: Math.round(Number(obj.y) || 0),
          width: Math.max(40, Math.round(Number(obj.width) || 180)),
          height: Math.max(40, Math.round(Number(obj.height) || 140)),
          bg: typeof obj.bg === "string" ? obj.bg : "#fef08a",
          color: typeof obj.color === "string" ? obj.color : "#422006",
          fontSize: Math.max(10, Math.min(48, Math.round(Number(obj.fontSize) || 16))),
          rotation: Math.round(Number(obj.rotation) || 0),
        });
        stickyCount++;
        break;
      }
      case "shape": {
        const allowedShapes = ["rect", "roundRect", "circle", "ellipse", "triangle", "diamond", "star", "hexagon", "heart"];
        const sType = allowedShapes.includes(obj.shapeType) ? obj.shapeType : "rect";
        validObjects.push({
          type: "shape",
          shapeType: sType,
          x: Math.round(Number(obj.x) || 0),
          y: Math.round(Number(obj.y) || 0),
          width: Math.max(5, Math.round(Number(obj.width) || 100)),
          height: Math.max(5, Math.round(Number(obj.height) || 100)),
          color: typeof obj.color === "string" ? obj.color : "#1E1E1E",
          fill: Boolean(obj.fill),
          strokeWidth: Math.max(1, Math.min(20, Math.round(Number(obj.strokeWidth) || 2))),
          rotation: Math.round(Number(obj.rotation) || 0),
        });
        shapesCount++;
        break;
      }
      case "connector": {
        const allowedConn = ["line", "arrow", "doubleArrow", "dashed"];
        const cType = allowedConn.includes(obj.connectorType) ? obj.connectorType : "arrow";
        validObjects.push({
          type: "connector",
          connectorType: cType,
          startX: Math.round(Number(obj.startX) || 0),
          startY: Math.round(Number(obj.startY) || 0),
          endX: Math.round(Number(obj.endX) || 100),
          endY: Math.round(Number(obj.endY) || 100),
          color: typeof obj.color === "string" ? obj.color : "#1E1E1E",
          strokeWidth: Math.max(1, Math.min(20, Math.round(Number(obj.strokeWidth) || 2))),
        });
        connectorsCount++;
        break;
      }
      case "drawing": {
        const pts = Array.isArray(obj.points)
          ? obj.points
              .filter((p: any) => p && typeof p.x === "number" && typeof p.y === "number")
              .map((p: any) => ({ x: Math.round(p.x), y: Math.round(p.y) }))
          : [];
        if (pts.length > 0) {
          validObjects.push({
            type: "drawing",
            points: pts,
            color: typeof obj.color === "string" ? obj.color : "#1E1E1E",
            strokeWidth: Math.max(1, Math.min(30, Math.round(Number(obj.strokeWidth) || 4))),
            isHighlighter: Boolean(obj.isHighlighter),
          });
          drawingsCount++;
        }
        break;
      }
      case "embeddedImage": {
        const w = Math.round(Number(obj.width) || 100);
        const h = Math.round(Number(obj.height) || 100);
        if (w > 5 && h > 5) {
          validObjects.push({
            type: "embeddedImage",
            x: Math.max(0, Math.round(Number(obj.x) || 0)),
            y: Math.max(0, Math.round(Number(obj.y) || 0)),
            width: Math.min(width, w),
            height: Math.min(height, h),
            description: typeof obj.description === "string" ? obj.description : undefined,
          });
          imagesCount++;
        }
        break;
      }
    }
  }

  return {
    title: detectedTitle || "Converted Whiteboard",
    imageWidth: width,
    imageHeight: height,
    objects: validObjects,
    counts: {
      text: textCount,
      sticky: stickyCount,
      shapes: shapesCount,
      connectors: connectorsCount,
      drawings: drawingsCount,
      embeddedImages: imagesCount,
      total: validObjects.length,
    },
  };
}

describe("Image Converter Validation - Output Sanitization & Integrity", () => {
  it("should validate and sanitize text objects with proper clamping and type coercions", () => {
    const raw = [
      {
        type: "text",
        text: "Valid Headline",
        x: "150.8",
        y: "200.2",
        width: 300,
        height: 50,
        fontSize: 300, // exceeds max limit, should clamp to 160
        color: "#2563EB",
        bold: true,
      },
      {
        type: "text",
        text: "", // Empty text -> should be discarded
        x: 0,
        y: 0,
      },
      {
        type: "text",
        text: "   \n\t  ", // Whitespace only -> should be discarded
      },
      {
        type: "text",
        text: "Tiny Font",
        fontSize: 2, // below min limit, should clamp to 10
      },
    ];

    const res = validateAndSanitizeConversion(raw);
    expect(res.counts.text).toBe(2);
    expect(res.counts.total).toBe(2);

    const first = res.objects[0] as DetectedTextObject;
    expect(first.text).toBe("Valid Headline");
    expect(first.x).toBe(151);
    expect(first.y).toBe(200);
    expect(first.fontSize).toBe(160);
    expect(first.bold).toBe(true);

    const second = res.objects[1] as DetectedTextObject;
    expect(second.text).toBe("Tiny Font");
    expect(second.fontSize).toBe(10);
  });

  it("should validate sticky notes and handle missing fields gracefully", () => {
    const raw = [
      {
        type: "sticky",
        text: "Action Item #1",
        x: 50,
        y: 80,
        width: 200,
        height: 150,
        bg: "#bbf7d0",
        color: "#166534",
        fontSize: 18,
      },
      {
        type: "sticky",
        // Missing dimensions, text, bg -> should apply sensible defaults
      },
    ];

    const res = validateAndSanitizeConversion(raw);
    expect(res.counts.sticky).toBe(2);

    const s1 = res.objects[0] as DetectedStickyObject;
    expect(s1.text).toBe("Action Item #1");
    expect(s1.bg).toBe("#bbf7d0");

    const s2 = res.objects[1] as DetectedStickyObject;
    expect(s2.text).toBe("");
    expect(s2.width).toBe(180);
    expect(s2.height).toBe(140);
    expect(s2.bg).toBe("#fef08a");
  });

  it("should fallback unknown shape and connector types to valid defaults", () => {
    const raw = [
      {
        type: "shape",
        shapeType: "unsupportedNonExistentShape",
        x: 10,
        y: 20,
        width: 100,
        height: 80,
      },
      {
        type: "shape",
        shapeType: "circle",
        x: 150,
        y: 20,
        width: 80,
        height: 80,
        fill: true,
      },
      {
        type: "connector",
        connectorType: "unknownCurve",
        startX: 0,
        startY: 0,
        endX: 100,
        endY: 100,
      },
    ];

    const res = validateAndSanitizeConversion(raw);
    expect(res.counts.shapes).toBe(2);
    expect(res.counts.connectors).toBe(1);

    const shape1 = res.objects[0] as DetectedShapeObject;
    expect(shape1.shapeType).toBe("rect"); // Fallback to rect

    const shape2 = res.objects[1] as DetectedShapeObject;
    expect(shape2.shapeType).toBe("circle");
    expect(shape2.fill).toBe(true);

    const conn1 = res.objects[2] as DetectedConnectorObject;
    expect(conn1.connectorType).toBe("arrow"); // Fallback to arrow
  });

  it("should validate freehand drawings and discard empty stroke point lists", () => {
    const raw = [
      {
        type: "drawing",
        points: [
          { x: 10.2, y: 15.6 },
          { x: 25.1, y: 30.8 },
          { x: 40.0, y: 50.0 },
        ],
        color: "#EF4444",
        strokeWidth: 5,
        isHighlighter: false,
      },
      {
        type: "drawing",
        points: [], // Empty points -> should be discarded
      },
      {
        type: "drawing",
        points: null, // Null points -> should be discarded
      },
    ];

    const res = validateAndSanitizeConversion(raw);
    expect(res.counts.drawings).toBe(1);

    const drawing = res.objects[0] as DetectedDrawingObject;
    expect(drawing.points).toEqual([
      { x: 10, y: 16 },
      { x: 25, y: 31 },
      { x: 40, y: 50 },
    ]);
    expect(drawing.strokeWidth).toBe(5);
  });

  it("should validate embedded image boundaries against container dimensions", () => {
    const containerW = 1000;
    const containerH = 800;
    const raw = [
      {
        type: "embeddedImage",
        x: 100,
        y: 150,
        width: 1500, // exceeds container width
        height: 400,
        description: "Company Logo",
      },
      {
        type: "embeddedImage",
        x: 0,
        y: 0,
        width: 2, // too small -> should be discarded
        height: 2,
      },
    ];

    const res = validateAndSanitizeConversion(raw, containerW, containerH);
    expect(res.counts.embeddedImages).toBe(1);

    const imgObj = res.objects[0] as DetectedEmbeddedImageObject;
    expect(imgObj.width).toBe(containerW); // clamped to container
    expect(imgObj.description).toBe("Company Logo");
  });
});
