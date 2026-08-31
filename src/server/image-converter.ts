/**
 * Precision AI Vision & Multimodal Whiteboard Converter Engine
 *
 * Extracts and reconstructs editable native YY Whiteboard elements from:
 * - Microsoft Whiteboard exports & screenshots
 * - Photos of physical whiteboards
 * - Flowcharts, mind maps, architecture diagrams, wireframes & sketches
 *
 * Capabilities:
 * - Server-side Gemini Vision API (`@google/genai` with configurable `DEFAULT_GEMINI_VISION_MODEL = "gemini-2.5-flash"`)
 * - OpenRouter Vision integration fallback
 * - Deterministic OCR + Geometric Computer Vision fallback pipeline
 * - Emits exact WhiteboardCanvasObject structures matching the native YY Canvas engine:
 *   (id, type, x, y, w, h, rotation, color, fill, width, text, size, font, bold, italic, underline, bg, points, src)
 */

import { GoogleGenAI } from "@google/genai";
import { runOcrAndComputerVision } from "./ocr-cv-pipeline";

/**
 * Single configurable constant for default Gemini Vision model.
 * Easy to update if Google updates or retires model aliases.
 */
export const DEFAULT_GEMINI_VISION_MODEL = "gemini-3.6-flash";

export interface ConvertImageRequest {
  imageBase64: string;
  mimeType: string;
  width: number;
  height: number;
}

export type WhiteboardCanvasType =
  | "rect"
  | "roundRect"
  | "circle"
  | "ellipse"
  | "triangle"
  | "diamond"
  | "star"
  | "hexagon"
  | "heart"
  | "text"
  | "sticky"
  | "line"
  | "arrow"
  | "doubleArrow"
  | "dashed"
  | "pen"
  | "highlighter"
  | "image"
  | "emoji";

export interface WhiteboardCanvasObject {
  id: string;
  type: WhiteboardCanvasType;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  color?: string;
  fill?: boolean;
  width?: number; // stroke width in px
  text?: string;
  size?: number; // font size in px
  font?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  bg?: string; // background color for sticky notes or filled shapes
  points?: Array<{ x: number; y: number }>; // for pen / highlighter
  src?: string; // image source
  opacity?: number;
  isPlaceholder?: boolean;
  penStyle?: number;
  highlighterStyle?: number;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
}

export type DetectedObject = WhiteboardCanvasObject;

export interface ConversionResponse {
  title: string;
  imageWidth: number;
  imageHeight: number;
  objects: WhiteboardCanvasObject[];
  source: "gemini-vision" | "openrouter-vision" | "deepai-vision" | "ocr-cv" | "fallback";
  counts: {
    text: number;
    sticky: number;
    shapes: number;
    connectors: number;
    drawings: number;
    embeddedImages: number;
    total: number;
  };
}

function genId(): string {
  return `el_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Returns clean base64 data string without header prefixes.
 */
function cleanBase64(input: string): string {
  if (input.includes(",")) {
    return input.split(",")[1] || "";
  }
  return input;
}

/**
 * Defensive JSON extractor and parser.
 * Extracts clean JSON or parses the first balanced {...} block if markdown/wrapper exists.
 */
function extractAndParseJson(text: string): Record<string, unknown> | null {
  if (!text || typeof text !== "string") return null;
  let cleaned = text.trim();

  // Strip markdown code fences if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
  }

  // 1. Direct JSON parse
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
  } catch {
    // 2. Extract first {...} block
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        const sub = cleaned.substring(firstBrace, lastBrace + 1);
        const parsed = JSON.parse(sub);
        if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
      } catch (e) {
        console.warn("[ImageConverter] Defensive JSON block extraction failed:", e);
      }
    }
  }

  return null;
}

/**
 * Parses bounding box format normalized 0..1000, 0..1, or pixel coords.
 */
function parseBoundingBox(
  box: unknown,
  imgWidth: number,
  imgHeight: number,
): { x: number; y: number; w: number; h: number } | null {
  if (!box) return null;
  if (Array.isArray(box) && box.length >= 4) {
    const [v0, v1, v2, v3] = box.map(Number);
    if (isNaN(v0) || isNaN(v1) || isNaN(v2) || isNaN(v3)) return null;

    let x = 0;
    let y = 0;
    let w = 0;
    let h = 0;

    if (v0 <= 1 && v1 <= 1 && v2 <= 1 && v3 <= 1) {
      // 0..1 normalized [ymin, xmin, ymax, xmax]
      const ymin = v0 * imgHeight;
      const xmin = v1 * imgWidth;
      const ymax = v2 * imgHeight;
      const xmax = v3 * imgWidth;
      x = xmin;
      y = ymin;
      w = Math.max(16, xmax - xmin);
      h = Math.max(16, ymax - ymin);
    } else if (v0 <= 1000 && v1 <= 1000 && v2 <= 1000 && v3 <= 1000 && (v2 > v0 || v3 > v1)) {
      // 0..1000 normalized [ymin, xmin, ymax, xmax] (Standard Gemini box_2d format)
      const ymin = (v0 / 1000) * imgHeight;
      const xmin = (v1 / 1000) * imgWidth;
      const ymax = (v2 / 1000) * imgHeight;
      const xmax = (v3 / 1000) * imgWidth;
      x = xmin;
      y = ymin;
      w = Math.max(16, xmax - xmin);
      h = Math.max(16, ymax - ymin);
    } else {
      // Pixel coordinates [ymin, xmin, ymax, xmax] or [x, y, w, h]
      if (v2 > v0 && v3 > v1 && (v2 <= imgHeight * 1.5 || v3 <= imgWidth * 1.5)) {
        x = v1;
        y = v0;
        w = Math.max(16, v3 - v1);
        h = Math.max(16, v2 - v0);
      } else {
        x = v0;
        y = v1;
        w = Math.max(16, v2);
        h = Math.max(16, v3);
      }
    }

    return {
      x: Math.max(0, Math.min(imgWidth - 10, Math.round(x))),
      y: Math.max(0, Math.min(imgHeight - 10, Math.round(y))),
      w: Math.max(16, Math.min(imgWidth, Math.round(w))),
      h: Math.max(16, Math.min(imgHeight, Math.round(h))),
    };
  } else if (typeof box === "object" && box !== null) {
    const b = box as Record<string, unknown>;
    const rawX = b["x"] ?? b["xmin"] ?? b["left"];
    const rawY = b["y"] ?? b["ymin"] ?? b["top"];
    const rawW = b["w"] ?? b["width"];
    const rawH = b["h"] ?? b["height"];

    let x = typeof rawX === "number" ? rawX : Number(rawX) || 0;
    let y = typeof rawY === "number" ? rawY : Number(rawY) || 0;
    let w =
      typeof rawW === "number"
        ? rawW
        : typeof b["xmax"] === "number"
          ? (b["xmax"] as number) - x
          : 120;
    let h =
      typeof rawH === "number"
        ? rawH
        : typeof b["ymax"] === "number"
          ? (b["ymax"] as number) - y
          : 80;

    if (x <= 1 && y <= 1 && w <= 1 && h <= 1) {
      x *= imgWidth;
      y *= imgHeight;
      w *= imgWidth;
      h *= imgHeight;
    } else if (x <= 1000 && y <= 1000 && w <= 1000 && h <= 1000 && (x > 1 || y > 1)) {
      x = (x / 1000) * imgWidth;
      y = (y / 1000) * imgHeight;
      w = (w / 1000) * imgWidth;
      h = (h / 1000) * imgHeight;
    }

    return {
      x: Math.max(0, Math.min(imgWidth - 10, Math.round(x))),
      y: Math.max(0, Math.min(imgHeight - 10, Math.round(y))),
      w: Math.max(16, Math.min(imgWidth, Math.round(w))),
      h: Math.max(16, Math.min(imgHeight, Math.round(h))),
    };
  }
  return null;
}

/**
 * Normalizes raw type string into native WhiteboardCanvasType.
 */
function normalizeCanvasType(rawType: string): WhiteboardCanvasType {
  const t = (rawType || "").toLowerCase().trim();
  if (t === "sticky" || t.includes("post-it") || t.includes("note")) return "sticky";
  if (t === "text" || t.includes("label") || t.includes("title") || t.includes("heading"))
    return "text";
  if (t === "roundrect" || t.includes("rounded")) return "roundRect";
  if (t === "rect" || t.includes("box") || t.includes("square")) return "rect";
  if (t === "circle" || t.includes("oval") || t.includes("ellipse")) return "circle";
  if (t === "triangle" || t.includes("delta")) return "triangle";
  if (t === "diamond" || t.includes("rhombus") || t.includes("decision")) return "diamond";
  if (t === "star") return "star";
  if (t === "hexagon" || t.includes("polygon")) return "hexagon";
  if (t === "heart") return "heart";
  if (t === "doublearrow" || t.includes("bidirectional")) return "doubleArrow";
  if (t === "arrow" || t.includes("pointer")) return "arrow";
  if (t === "dashed" || t.includes("dotted")) return "dashed";
  if (t === "line" || t.includes("divider")) return "line";
  if (t === "highlighter") return "highlighter";
  if (t === "pen" || t.includes("draw") || t.includes("sketch")) return "pen";
  if (t === "image" || t.includes("photo") || t.includes("icon")) return "image";
  return "rect";
}

/**
 * Processes and normalizes raw AI-detected objects into native WhiteboardCanvasObjects.
 * Maps exact JSON schema from prompt into internal whiteboard element types.
 */
function processRawAiObjects(
  rawObjects: Array<Record<string, unknown>>,
  width: number,
  height: number,
): WhiteboardCanvasObject[] {
  const convertedObjects: WhiteboardCanvasObject[] = [];

  for (const item of rawObjects) {
    if (!item || typeof item !== "object") continue;

    const rawType = String(item["type"] || "rect")
      .toLowerCase()
      .trim();

    // 1. Text elements -> native "text" element type
    if (rawType === "text") {
      const text = item["text"] != null ? String(item["text"]).trim() : "";
      if (!text) continue;

      const rawX = Number(item["x"]) || 0;
      const rawY = Number(item["y"]) || 0;
      const rawW = Number(item["width"] ?? item["w"]) || 160;
      const rawH = Number(item["height"] ?? item["h"]) || 36;
      const rawFontSize = Number(item["fontSize"] ?? item["size"]) || 18;

      const box =
        parseBoundingBox(item["box_2d"], width, height) ||
        parseBoundingBox(item["box"], width, height) ||
        parseBoundingBox({ x: rawX, y: rawY, w: rawW, h: rawH }, width, height);

      const x = box ? box.x : Math.max(0, Math.round(rawX));
      const y = box ? box.y : Math.max(0, Math.round(rawY));
      const w = box ? box.w : Math.max(40, Math.round(rawW));
      const h = box ? box.h : Math.max(20, Math.round(rawH));

      const color =
        typeof item["color"] === "string" && item["color"].startsWith("#")
          ? item["color"]
          : "#1E1E1E";

      const bold = item["fontWeight"] === "bold" || Boolean(item["bold"]);
      const italic = item["fontStyle"] === "italic" || Boolean(item["italic"]);
      const fontFamily =
        typeof item["fontFamily"] === "string" && item["fontFamily"].trim()
          ? item["fontFamily"].trim()
          : typeof item["font"] === "string" && item["font"].trim()
            ? item["font"].trim()
            : "Segoe UI,Inter,system-ui,sans-serif";

      convertedObjects.push({
        id: genId(),
        type: "text",
        x,
        y,
        w,
        h,
        rotation: 0,
        text,
        color,
        size: Math.max(12, Math.min(120, Math.round(rawFontSize))),
        font: fontFamily,
        bold,
        italic,
        underline: Boolean(item["underline"]),
        isPlaceholder: false,
      });
    }
    // 2. Rect elements -> native "rect" / "roundRect" shape element type (or sticky note if sticky)
    else if (rawType === "rect" || rawType === "roundrect" || rawType === "sticky") {
      const rx = Number(item["rx"]) || 0;
      const isSticky =
        rawType === "sticky" || (item["type"] === "rect" && rx >= 12 && item["text"]);
      const targetType: WhiteboardCanvasType = isSticky ? "sticky" : rx > 4 ? "roundRect" : "rect";

      const rawX = Number(item["x"]) || 0;
      const rawY = Number(item["y"]) || 0;
      const rawW = Number(item["width"] ?? item["w"]) || (isSticky ? 180 : 120);
      const rawH = Number(item["height"] ?? item["h"]) || (isSticky ? 140 : 80);

      const box =
        parseBoundingBox(item["box_2d"], width, height) ||
        parseBoundingBox(item["box"], width, height) ||
        parseBoundingBox({ x: rawX, y: rawY, w: rawW, h: rawH }, width, height);

      const x = box ? box.x : Math.max(0, Math.round(rawX));
      const y = box ? box.y : Math.max(0, Math.round(rawY));
      const w = box ? box.w : Math.max(16, Math.round(rawW));
      const h = box ? box.h : Math.max(16, Math.round(rawH));

      const stroke =
        typeof item["stroke"] === "string" && item["stroke"].startsWith("#")
          ? item["stroke"]
          : typeof item["color"] === "string" && item["color"].startsWith("#")
            ? item["color"]
            : isSticky
              ? "#422006"
              : "#1E1E1E";

      const fillVal = item["fill"];
      const isFilled = fillVal !== "transparent" && fillVal !== false && Boolean(fillVal);
      const bg =
        typeof fillVal === "string" && fillVal.startsWith("#")
          ? fillVal
          : typeof item["bg"] === "string" && item["bg"].startsWith("#")
            ? item["bg"]
            : isSticky
              ? "#fef08a"
              : isFilled
                ? stroke
                : undefined;

      const strokeW = Math.max(
        1,
        Math.min(16, Math.round(Number(item["strokeWidth"] ?? item["width"]) || 2)),
      );
      const text = item["text"] != null ? String(item["text"]).trim() : "";

      if (targetType === "sticky") {
        convertedObjects.push({
          id: genId(),
          type: "sticky",
          x,
          y,
          w: Math.max(100, w),
          h: Math.max(80, h),
          rotation: 0,
          text,
          bg: bg || "#fef08a",
          color: stroke || "#422006",
          size: Math.max(12, Math.min(36, Number(item["fontSize"] ?? item["size"]) || 16)),
          font: "Segoe UI,Inter,system-ui,sans-serif",
          bold: Boolean(item["bold"]),
          italic: Boolean(item["italic"]),
          underline: false,
          isPlaceholder: !text,
        });
      } else {
        convertedObjects.push({
          id: genId(),
          type: targetType,
          x,
          y,
          w,
          h,
          rotation: 0,
          color: stroke,
          fill: isFilled,
          bg: isFilled ? bg : undefined,
          width: strokeW,
        });

        // If a shape container had embedded label text, emit a paired text object inside the shape
        if (text) {
          convertedObjects.push({
            id: genId(),
            type: "text",
            x: x + 8,
            y: y + Math.max(4, Math.round(h / 2 - 12)),
            w: Math.max(40, w - 16),
            h: Math.max(20, Math.round(h / 2)),
            rotation: 0,
            text,
            color: stroke,
            size: Math.max(12, Math.min(28, Math.round(h * 0.25))),
            font: "Segoe UI,Inter,system-ui,sans-serif",
            bold: true,
            italic: false,
            underline: false,
            isPlaceholder: false,
          });
        }
      }
    }
    // 3. Circle / Ellipse elements -> native "circle" shape element type
    else if (rawType === "circle" || rawType === "ellipse") {
      const radius = Number(item["radius"]) || 0;
      const rawW = radius > 0 ? radius * 2 : Number(item["width"] ?? item["w"]) || 100;
      const rawH = radius > 0 ? radius * 2 : Number(item["height"] ?? item["h"]) || 100;
      const rawX = Number(item["x"]) || 0;
      const rawY = Number(item["y"]) || 0;

      const box =
        parseBoundingBox(item["box_2d"], width, height) ||
        parseBoundingBox(item["box"], width, height) ||
        parseBoundingBox({ x: rawX, y: rawY, w: rawW, h: rawH }, width, height);

      const x = box ? box.x : Math.max(0, Math.round(rawX));
      const y = box ? box.y : Math.max(0, Math.round(rawY));
      const w = box ? box.w : Math.max(16, Math.round(rawW));
      const h = box ? box.h : Math.max(16, Math.round(rawH));

      const stroke =
        typeof item["stroke"] === "string" && item["stroke"].startsWith("#")
          ? item["stroke"]
          : typeof item["color"] === "string" && item["color"].startsWith("#")
            ? item["color"]
            : "#1E1E1E";

      const fillVal = item["fill"];
      const isFilled = fillVal !== "transparent" && fillVal !== false && Boolean(fillVal);
      const bg =
        typeof fillVal === "string" && fillVal.startsWith("#")
          ? fillVal
          : typeof item["bg"] === "string" && item["bg"].startsWith("#")
            ? item["bg"]
            : isFilled
              ? stroke
              : undefined;

      const strokeW = Math.max(
        1,
        Math.min(16, Math.round(Number(item["strokeWidth"] ?? item["width"]) || 2)),
      );

      convertedObjects.push({
        id: genId(),
        type: "circle",
        x,
        y,
        w,
        h,
        rotation: 0,
        color: stroke,
        fill: isFilled,
        bg: isFilled ? bg : undefined,
        width: strokeW,
      });

      const text = item["text"] != null ? String(item["text"]).trim() : "";
      if (text) {
        convertedObjects.push({
          id: genId(),
          type: "text",
          x: x + 8,
          y: y + Math.max(4, Math.round(h / 2 - 12)),
          w: Math.max(40, w - 16),
          h: Math.max(20, Math.round(h / 2)),
          rotation: 0,
          text,
          color: stroke,
          size: Math.max(12, Math.min(28, Math.round(h * 0.25))),
          font: "Segoe UI,Inter,system-ui,sans-serif",
          bold: true,
          italic: false,
          underline: false,
          isPlaceholder: false,
        });
      }
    }
    // 4. Line / Arrow / Connector elements -> native "line" / "arrow" element type
    else if (
      rawType === "line" ||
      rawType === "arrow" ||
      rawType === "doublearrow" ||
      rawType === "dashed" ||
      rawType === "connector"
    ) {
      const targetType: WhiteboardCanvasType =
        rawType === "arrow" || rawType === "connector" ? "arrow" : normalizeCanvasType(rawType);

      const x1 = Number(item["x1"]);
      const y1 = Number(item["y1"]);
      const x2 = Number(item["x2"]);
      const y2 = Number(item["y2"]);

      let sx = 0,
        sy = 0,
        ex = 100,
        ey = 50,
        x = 0,
        y = 0,
        w = 100,
        h = 50;

      if (!isNaN(x1) && !isNaN(x2) && !isNaN(y1) && !isNaN(y2)) {
        sx = Math.round(x1);
        sy = Math.round(y1);
        ex = Math.round(x2);
        ey = Math.round(y2);
        x = Math.min(sx, ex);
        y = Math.min(sy, ey);
        w = Math.max(1, Math.abs(ex - sx));
        h = Math.max(1, Math.abs(ey - sy));
      } else {
        const rawX = Number(item["x"]) || 0;
        const rawY = Number(item["y"]) || 0;
        const rawW = Number(item["width"] ?? item["w"]) || 100;
        const rawH = Number(item["height"] ?? item["h"]) || 2;
        x = Math.max(0, Math.round(rawX));
        y = Math.max(0, Math.round(rawY));
        w = Math.max(1, Math.round(rawW));
        h = Math.max(1, Math.round(rawH));
        sx = x;
        sy = y;
        ex = x + w;
        ey = y + h;
      }

      const stroke =
        typeof item["stroke"] === "string" && item["stroke"].startsWith("#")
          ? item["stroke"]
          : typeof item["color"] === "string" && item["color"].startsWith("#")
            ? item["color"]
            : "#1E1E1E";

      const strokeW = Math.max(
        1,
        Math.min(16, Math.round(Number(item["strokeWidth"] ?? item["width"]) || 2)),
      );

      convertedObjects.push({
        id: genId(),
        type: targetType,
        x,
        y,
        w,
        h,
        startX: sx,
        startY: sy,
        endX: ex,
        endY: ey,
        rotation: 0,
        color: stroke,
        width: strokeW,
      });
    }
    // 5. Other geometric shapes (triangle, diamond, star, hexagon, heart)
    else {
      const targetType = normalizeCanvasType(rawType);
      const rawX = Number(item["x"]) || 0;
      const rawY = Number(item["y"]) || 0;
      const rawW = Number(item["width"] ?? item["w"]) || 100;
      const rawH = Number(item["height"] ?? item["h"]) || 80;

      const box =
        parseBoundingBox(item["box_2d"], width, height) ||
        parseBoundingBox(item["box"], width, height) ||
        parseBoundingBox({ x: rawX, y: rawY, w: rawW, h: rawH }, width, height);

      const x = box ? box.x : Math.max(0, Math.round(rawX));
      const y = box ? box.y : Math.max(0, Math.round(rawY));
      const w = box ? box.w : Math.max(16, Math.round(rawW));
      const h = box ? box.h : Math.max(16, Math.round(rawH));

      const stroke =
        typeof item["stroke"] === "string" && item["stroke"].startsWith("#")
          ? item["stroke"]
          : typeof item["color"] === "string" && item["color"].startsWith("#")
            ? item["color"]
            : "#1E1E1E";

      const fillVal = item["fill"];
      const isFilled = fillVal !== "transparent" && fillVal !== false && Boolean(fillVal);
      const bg =
        typeof fillVal === "string" && fillVal.startsWith("#")
          ? fillVal
          : typeof item["bg"] === "string" && item["bg"].startsWith("#")
            ? item["bg"]
            : isFilled
              ? stroke
              : undefined;

      const strokeW = Math.max(
        1,
        Math.min(16, Math.round(Number(item["strokeWidth"] ?? item["width"]) || 2)),
      );

      convertedObjects.push({
        id: genId(),
        type: targetType,
        x,
        y,
        w,
        h,
        rotation: 0,
        color: stroke,
        fill: isFilled,
        bg: isFilled ? bg : undefined,
        width: strokeW,
      });
    }
  }

  return convertedObjects;
}

/**
 * Calls server-side Gemini Vision API using @google/genai with the configurable default model.
 * Exactly one request per conversion.
 */
async function callGeminiVision(
  rawBase64: string,
  mimeType: string,
  width: number,
  height: number,
): Promise<{ title: string; objects: WhiteboardCanvasObject[] } | null> {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    console.warn("[ImageConverter] GEMINI_API_KEY not found in environment.");
    return null;
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { "User-Agent": "aistudio-build" } },
  });

  const base64Data = cleanBase64(rawBase64);
  const cleanMime =
    mimeType.includes("jpeg") || mimeType.includes("jpg")
      ? "image/jpeg"
      : mimeType.includes("webp")
        ? "image/webp"
        : "image/png";

  const prompt = `Analyze this whiteboard/diagram image (${width}x${height}px).
Extract all visible text elements, rectangles/boxes/sticky notes, circles/ellipses, and lines/connectors into structured vector elements.

Requirements:
- x/y are top-left pixel coordinates matching the image's actual pixel dimensions (${width}x${height}).
- Split text into separate elements the way a human editor would (title vs. paragraph vs. label).
- Estimate font size (fontSize) from how large the text visually appears in pixels.
- Use the real hex colors seen in the image for fill, stroke, and text colors.
- Only include shapes and lines that are actually visible in the image.
- Return raw JSON only, no markdown fences or commentary.

Output MUST be a single JSON object with this exact schema:
{
  "canvasWidth": ${width},
  "canvasHeight": ${height},
  "backgroundColor": "#ffffff",
  "elements": [
    { "type": "text", "text": "string", "x": number, "y": number, "width": number, "height": number, "fontSize": number, "fontWeight": "normal" | "bold", "fontStyle": "normal" | "italic", "color": "#hex", "textAlign": "left" | "center" | "right", "fontFamily": "string" },
    { "type": "rect", "x": number, "y": number, "width": number, "height": number, "fill": "#hex" | "transparent", "stroke": "#hex", "strokeWidth": number, "rx": number },
    { "type": "circle", "x": number, "y": number, "radius": number, "fill": "#hex" | "transparent", "stroke": "#hex", "strokeWidth": number },
    { "type": "line", "x1": number, "y1": number, "x2": number, "y2": number, "stroke": "#hex", "strokeWidth": number }
  ]
}`;

  const candidateModels = [
    DEFAULT_GEMINI_VISION_MODEL,
    "gemini-flash-latest",
    "gemini-3.1-flash-lite",
  ];

  for (const modelName of candidateModels) {
    try {
      console.log(`[ImageConverter] Calling Gemini Vision with model: ${modelName}`);
      const startTime = Date.now();

      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data: base64Data,
                  mimeType: cleanMime,
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
        },
      });

      const duration = Date.now() - startTime;
      const rawText = response.text || "";
      console.log(
        `[ImageConverter] Gemini Vision responded in ${duration}ms, response length: ${rawText.length}`,
      );

      if (!rawText.trim()) continue;

      const parsed = extractAndParseJson(rawText);
      if (!parsed) {
        continue;
      }

      const rawElements = Array.isArray(parsed["elements"])
        ? (parsed["elements"] as Array<Record<string, unknown>>)
        : Array.isArray(parsed["objects"])
          ? (parsed["objects"] as Array<Record<string, unknown>>)
          : [];

      console.log(
        `[ImageConverter] Parsed ${rawElements.length} raw elements from Gemini Vision (${modelName})`,
      );

      const convertedObjects = processRawAiObjects(rawElements, width, height);

      if (convertedObjects.length > 0) {
        return {
          title: typeof parsed["title"] === "string" ? parsed["title"] : "Imported Whiteboard",
          objects: convertedObjects,
        };
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const isQuota =
        errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED");
      if (isQuota) {
        console.log(
          `[ImageConverter] Gemini model ${modelName} quota limit reached. Trying next model or fallback.`,
        );
      } else {
        console.log(
          `[ImageConverter] Gemini model ${modelName} unavailable. Trying next model or fallback.`,
        );
      }
    }
  }

  return null;
}

/**
 * Calls OpenRouter Vision API as a fallback when Gemini is unavailable or fails.
 */
async function callOpenRouterVision(
  rawBase64: string,
  mimeType: string,
  width: number,
  height: number,
): Promise<{ title: string; objects: WhiteboardCanvasObject[] } | null> {
  const apiKey = process.env["OPENROUTER_API_KEY"];
  if (!apiKey || !apiKey.trim()) {
    console.log("[ImageConverter] OPENROUTER_API_KEY not configured, skipping OpenRouter fallback");
    return null;
  }

  const base64Data = cleanBase64(rawBase64);
  const cleanMime =
    mimeType.includes("jpeg") || mimeType.includes("jpg")
      ? "image/jpeg"
      : mimeType.includes("webp")
        ? "image/webp"
        : "image/png";

  const dataUri = `data:${cleanMime};base64,${base64Data}`;

  const promptText = `Analyze this whiteboard/diagram image (${width}x${height}px).
Extract all visible text elements, rectangles/boxes/sticky notes, circles/ellipses, and lines/connectors into structured vector elements.

Requirements:
- x/y are top-left pixel coordinates matching the image's actual pixel dimensions (${width}x${height}).
- Split text into separate elements the way a human editor would (title vs. paragraph vs. label).
- Estimate font size (fontSize) from how large the text visually appears in pixels.
- Use the real hex colors seen in the image for fill, stroke, and text colors.
- Only include shapes and lines that are actually visible in the image.
- Return raw JSON only, no markdown fences or commentary.

Output MUST be a single JSON object with this exact schema:
{
  "canvasWidth": ${width},
  "canvasHeight": ${height},
  "backgroundColor": "#ffffff",
  "elements": [
    { "type": "text", "text": "string", "x": number, "y": number, "width": number, "height": number, "fontSize": number, "fontWeight": "normal" | "bold", "fontStyle": "normal" | "italic", "color": "#hex", "textAlign": "left" | "center" | "right", "fontFamily": "string" },
    { "type": "rect", "x": number, "y": number, "width": number, "height": number, "fill": "#hex" | "transparent", "stroke": "#hex", "strokeWidth": number, "rx": number },
    { "type": "circle", "x": number, "y": number, "radius": number, "fill": "#hex" | "transparent", "stroke": "#hex", "strokeWidth": number },
    { "type": "line", "x1": number, "y1": number, "x2": number, "y2": number, "stroke": "#hex", "strokeWidth": number }
  ]
}`;

  const candidateModels = [
    "google/gemini-2.0-flash-001",
    "qwen/qwen-2.5-vl-72b-instruct:free",
    "meta-llama/llama-3.2-11b-vision-instruct:free",
    "mistralai/pixtral-12b:free",
    "openai/gpt-4o-mini",
  ];

  for (const model of candidateModels) {
    try {
      console.log(`[ImageConverter] Calling OpenRouter Vision fallback with model: ${model}`);
      const startTime = Date.now();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://ai.studio",
          "X-Title": "Whiteboard AI Converter",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: promptText,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: dataUri,
                  },
                },
              ],
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        console.warn(
          `[ImageConverter] OpenRouter model ${model} HTTP ${res.status} error:`,
          errBody.slice(0, 200),
        );
        continue;
      }

      const json = await res.json();
      const content = json.choices?.[0]?.message?.content;
      console.log(
        `[ImageConverter] OpenRouter (${model}) responded in ${duration}ms, content length: ${content?.length || 0}`,
      );

      if (!content || typeof content !== "string" || !content.trim()) continue;

      const parsed = extractAndParseJson(content);
      if (!parsed) continue;

      const rawElements = Array.isArray(parsed["elements"])
        ? (parsed["elements"] as Array<Record<string, unknown>>)
        : Array.isArray(parsed["objects"])
          ? (parsed["objects"] as Array<Record<string, unknown>>)
          : [];

      console.log(
        `[ImageConverter] Parsed ${rawElements.length} raw elements from OpenRouter (${model})`,
      );

      const convertedObjects = processRawAiObjects(rawElements, width, height);

      if (convertedObjects.length > 0) {
        return {
          title: typeof parsed["title"] === "string" ? parsed["title"] : "Imported Whiteboard",
          objects: convertedObjects,
        };
      }
    } catch (err) {
      console.warn(`[ImageConverter] OpenRouter model ${model} failed:`, err);
    }
  }

  return null;
}

export function compileConversionResponse(
  title: string,
  width: number,
  height: number,
  validObjects: WhiteboardCanvasObject[],
  source: "gemini-vision" | "openrouter-vision" | "deepai-vision" | "ocr-cv" | "fallback",
): ConversionResponse {
  let textCount = 0;
  let stickyCount = 0;
  let shapesCount = 0;
  let connectorsCount = 0;
  let drawingsCount = 0;
  let imagesCount = 0;

  const shapeTypes = new Set([
    "rect",
    "roundRect",
    "circle",
    "ellipse",
    "triangle",
    "diamond",
    "star",
    "hexagon",
    "heart",
  ]);
  const connectorTypes = new Set(["line", "arrow", "doubleArrow", "dashed"]);

  for (const obj of validObjects) {
    if (obj.type === "text") textCount++;
    else if (obj.type === "sticky") stickyCount++;
    else if (shapeTypes.has(obj.type)) shapesCount++;
    else if (connectorTypes.has(obj.type)) connectorsCount++;
    else if (obj.type === "pen" || obj.type === "highlighter") drawingsCount++;
    else if (obj.type === "image") imagesCount++;
  }

  return {
    title: title || "Imported Whiteboard",
    imageWidth: width,
    imageHeight: height,
    objects: validObjects,
    source,
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

/**
 * Converts a whiteboard image / screenshot / diagram into native, editable whiteboard objects.
 * Exactly ONE AI call per conversion, via Lovable's built-in AI gateway.
 * Never falls back to a flat image: failures throw so the UI can show an inline error.
 */
export async function convertWhiteboardImage(
  req: ConvertImageRequest,
): Promise<ConversionResponse> {
  const { width, height, imageBase64, mimeType } = req;

  console.log(`[ImageConverter] Conversion started (${width}x${height}, ${mimeType})`);

  const result = await callLovableVision(imageBase64, mimeType, width, height);

  if (!result || result.objects.length === 0) {
    throw new Error(
      "The AI could not extract any editable elements from this image. Please try a clearer image.",
    );
  }

  console.log(`[ImageConverter] Extracted ${result.objects.length} editable objects`);
  return compileConversionResponse(result.title, width, height, result.objects, "gemini-vision");
}

