/**
 * Precision AI Vision & Multimodal Whiteboard Converter Engine
 *
 * Extracts and reconstructs editable native YY Whiteboard elements from:
 * - Microsoft Whiteboard exports & screenshots
 * - Photos of physical whiteboards
 * - Flowcharts, mind maps, architecture diagrams, wireframes & sketches
 *
 * Capabilities:
 * - Server-side Gemini Vision API (`@google/genai` with `DEFAULT_GEMINI_VISION_MODEL = "gemini-2.5-flash"`)
 * - Emits exact WhiteboardCanvasObject structures matching the native YY Canvas engine:
 *   (id, type, x, y, w, h, rotation, color, fill, width, text, size, font, bold, italic, underline, bg, points, src)
 */

import { GoogleGenAI } from "@google/genai";

/**
 * Default Gemini Vision model.
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
  source: "gemini-vision";
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
 * Processes and normalizes raw AI-detected objects from Gemini into native WhiteboardCanvasObjects.
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

      const x = Math.max(0, Math.min(width - 10, Math.round(rawX)));
      const y = Math.max(0, Math.min(height - 10, Math.round(rawY)));
      const w = Math.max(20, Math.min(width, Math.round(rawW)));
      const h = Math.max(16, Math.min(height, Math.round(rawH)));

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
    // 2. Rect / Sticky elements -> native "rect" / "roundRect" / "sticky" shape element type
    else if (rawType === "rect" || rawType === "roundrect" || rawType === "sticky") {
      const rx = Number(item["rx"]) || 0;
      const isSticky =
        rawType === "sticky" || (item["type"] === "rect" && rx >= 12 && item["text"]);
      const targetType: WhiteboardCanvasType = isSticky ? "sticky" : rx > 4 ? "roundRect" : "rect";

      const rawX = Number(item["x"]) || 0;
      const rawY = Number(item["y"]) || 0;
      const rawW = Number(item["width"] ?? item["w"]) || (isSticky ? 180 : 120);
      const rawH = Number(item["height"] ?? item["h"]) || (isSticky ? 140 : 80);

      const x = Math.max(0, Math.min(width - 10, Math.round(rawX)));
      const y = Math.max(0, Math.min(height - 10, Math.round(rawY)));
      const w = Math.max(16, Math.min(width, Math.round(rawW)));
      const h = Math.max(16, Math.min(height, Math.round(rawH)));

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

      const x = Math.max(0, Math.min(width - 10, Math.round(rawX)));
      const y = Math.max(0, Math.min(height - 10, Math.round(rawY)));
      const w = Math.max(16, Math.min(width, Math.round(rawW)));
      const h = Math.max(16, Math.min(height, Math.round(rawH)));

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
    // 4. Line / Arrow elements -> native "line" / "arrow" element type
    else if (
      rawType === "line" ||
      rawType === "arrow" ||
      rawType === "doublearrow" ||
      rawType === "dashed" ||
      rawType === "connector"
    ) {
      const targetType: WhiteboardCanvasType =
        rawType === "arrow" || rawType === "connector" ? "arrow" : "line";

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
        rotation: 0,
        color: stroke,
        width: strokeW,
        startX: sx,
        startY: sy,
        endX: ex,
        endY: ey,
      });
    }
  }

  return convertedObjects;
}

/**
 * Calls server-side Gemini Vision API using @google/genai with gemini-2.5-flash.
 * Exactly one request per conversion.
 */
async function callGeminiVision(
  rawBase64: string,
  mimeType: string,
  width: number,
  height: number,
): Promise<{ title: string; objects: WhiteboardCanvasObject[] }> {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
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
Extract all visible text elements, rectangles/boxes, circles/ellipses, and lines/arrows into structured vector elements.

Requirements:
- x/y are top-left pixel coordinates matching the image dimensions (${width}x${height}).
- Split text into separate elements (title vs. paragraph vs. label).
- Estimate font size (fontSize) from how large the text visually appears in pixels.
- Use real hex colors seen in the image for fill, stroke, and text colors.
- Only include elements actually visible in the image.
- Return raw JSON only matching the schema.

Output MUST be a single JSON object with this exact schema:
{
  "canvasWidth": ${width},
  "canvasHeight": ${height},
  "backgroundColor": "#ffffff",
  "elements": [
    { "type": "text", "text": "string", "x": number, "y": number, "width": number, "height": number, "fontSize": number, "fontWeight": "normal" | "bold", "color": "#hex", "textAlign": "left" | "center" | "right" },
    { "type": "rect", "x": number, "y": number, "width": number, "height": number, "fill": "#hex" | "transparent", "stroke": "#hex", "strokeWidth": number },
    { "type": "circle", "x": number, "y": number, "radius": number, "fill": "#hex" | "transparent", "stroke": "#hex", "strokeWidth": number },
    { "type": "line", "x1": number, "y1": number, "x2": number, "y2": number, "stroke": "#hex", "strokeWidth": number }
  ]
}`;

  const candidateModels = [
    "gemini-3.1-flash-lite",
    "gemini-3.7-flash",
    "gemini-flash-latest",
    DEFAULT_GEMINI_VISION_MODEL,
  ];

  let rawText = "";
  let lastError: Error | null = null;

  for (const modelName of candidateModels) {
    try {
      console.log(`[ImageConverter] Calling Gemini Vision model: ${modelName}`);
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
      rawText = response.text || "";
      console.log(
        `[ImageConverter] Gemini Vision (${modelName}) responded in ${duration}ms, response length: ${rawText.length}`,
      );

      if (rawText.trim()) {
        break;
      }
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[ImageConverter] Model ${modelName} failed:`, lastError.message);
      // Immediately fallback to next model on error (including 429 rate limit or 404)
    }
  }

  if (!rawText.trim()) {
    if (
      lastError &&
      (lastError.message.includes("429") ||
        lastError.message.includes("RESOURCE_EXHAUSTED") ||
        lastError.message.includes("Quota exceeded"))
    ) {
      throw new Error("Gemini API rate limit reached. Please wait a few seconds and try again.");
    }
    throw lastError || new Error("Gemini returned an empty response.");
  }

  const parsed = extractAndParseJson(rawText);
  if (!parsed) {
    throw new Error("Failed to parse JSON response from Gemini.");
  }

  const rawElements = Array.isArray(parsed["elements"])
    ? (parsed["elements"] as Array<Record<string, unknown>>)
    : Array.isArray(parsed["objects"])
      ? (parsed["objects"] as Array<Record<string, unknown>>)
      : [];

  console.log(`[ImageConverter] Parsed ${rawElements.length} raw elements from Gemini Vision`);

  const convertedObjects = processRawAiObjects(rawElements, width, height);

  if (convertedObjects.length === 0) {
    throw new Error("No editable whiteboard elements could be detected in the uploaded image.");
  }

  return {
    title: typeof parsed["title"] === "string" ? parsed["title"] : "Imported Whiteboard",
    objects: convertedObjects,
  };
}

export function compileConversionResponse(
  title: string,
  width: number,
  height: number,
  validObjects: WhiteboardCanvasObject[],
): ConversionResponse {
  let textCount = 0;
  let stickyCount = 0;
  let shapesCount = 0;
  let connectorsCount = 0;
  let drawingsCount = 0;
  let imagesCount = 0;

  for (const obj of validObjects) {
    if (obj.type === "text") textCount++;
    else if (obj.type === "sticky") stickyCount++;
    else if (obj.type === "rect" || obj.type === "roundRect" || obj.type === "circle")
      shapesCount++;
    else if (obj.type === "line" || obj.type === "arrow") connectorsCount++;
    else if (obj.type === "pen" || obj.type === "highlighter") drawingsCount++;
    else if (obj.type === "image") imagesCount++;
  }

  return {
    title: title || "Imported Whiteboard",
    imageWidth: width,
    imageHeight: height,
    objects: validObjects,
    source: "gemini-vision",
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
 * Exactly one Gemini 2.5 flash call. Never returns a flat image fallback.
 */
export async function convertWhiteboardImage(
  req: ConvertImageRequest,
): Promise<ConversionResponse> {
  const { width, height, imageBase64, mimeType } = req;

  console.log(`[ImageConverter] ========================================`);
  console.log(`[ImageConverter] Conversion started`);
  console.log(`[ImageConverter] Target image dimensions: ${width}x${height}`);

  const geminiResult = await callGeminiVision(imageBase64, mimeType, width, height);

  console.log(
    `[ImageConverter] Successfully extracted ${geminiResult.objects.length} editable objects via Gemini 2.5 Flash`,
  );

  return compileConversionResponse(geminiResult.title, width, height, geminiResult.objects);
}
