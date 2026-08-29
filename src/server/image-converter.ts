import { GoogleGenAI } from "@google/genai";
import { runOcrAndComputerVision } from "./ocr-cv-pipeline";

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

function getAiKey(): { type: "gemini" | "lovable"; key: string } | null {
  const geminiKey = process.env["GEMINI_API_KEY"];
  if (geminiKey) {
    return { type: "gemini", key: geminiKey };
  }
  const lovableKey = process.env["LOVABLE_API_KEY"];
  if (lovableKey) {
    return { type: "lovable", key: lovableKey };
  }
  return null;
}

export interface ConvertImageRequest {
  imageBase64: string;
  mimeType: string;
  width: number;
  height: number;
}

export interface DetectedTextObject {
  type: "text";
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  rotation?: number;
}

export interface DetectedStickyObject {
  type: "sticky";
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  bg?: string;
  color?: string;
  fontSize?: number;
  rotation?: number;
}

export interface DetectedShapeObject {
  type: "shape";
  shapeType: "rect" | "roundRect" | "circle" | "ellipse" | "triangle" | "diamond" | "star" | "hexagon" | "heart";
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  fill?: boolean;
  strokeWidth?: number;
  rotation?: number;
}

export interface DetectedConnectorObject {
  type: "connector";
  connectorType: "line" | "arrow" | "doubleArrow" | "dashed";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color?: string;
  strokeWidth?: number;
}

export interface DetectedDrawingObject {
  type: "drawing";
  points: Array<{ x: number; y: number }>;
  color?: string;
  strokeWidth?: number;
  isHighlighter?: boolean;
}

export interface DetectedEmbeddedImageObject {
  type: "embeddedImage";
  x: number;
  y: number;
  width: number;
  height: number;
  description?: string;
}

export type DetectedObject =
  | DetectedTextObject
  | DetectedStickyObject
  | DetectedShapeObject
  | DetectedConnectorObject
  | DetectedDrawingObject
  | DetectedEmbeddedImageObject;

export interface ConversionResponse {
  title?: string;
  imageWidth: number;
  imageHeight: number;
  objects: DetectedObject[];
  source?: "ocr-cv" | "gemini-fallback";
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

// Candidate Gemini models in order of capability, quality, and availability
const GEMINI_MODELS = [
  "gemini-3.7-flash",
  "gemini-3.1-flash-lite",
];

const CANDIDATE_MODELS = [
  "google/gemini-3.7-flash",
  "google/gemini-3.1-flash-lite",
];

function cleanErrorMessage(rawError: unknown): string {
  if (!rawError) return "Unknown error occurred during conversion.";
  const str = rawError instanceof Error ? rawError.message : String(rawError);

  try {
    const jsonMatch = str.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.error && parsed.error.message) {
        return parsed.error.message;
      }
      if (parsed.message) {
        return parsed.message;
      }
    }
  } catch {
    // Ignore JSON parsing errors
  }

  return str.replace(/^ApiError:\s*/i, "").trim();
}

function isQuotaOrRateLimitError(errStr: string): boolean {
  return (
    errStr.includes("RESOURCE_EXHAUSTED") ||
    errStr.includes("429") ||
    errStr.includes("quota") ||
    errStr.includes("Quota") ||
    errStr.includes("rate limit") ||
    errStr.includes("Rate limit") ||
    errStr.includes("exceeded your current quota")
  );
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function compileConversionResponse(
  title: string,
  width: number,
  height: number,
  validObjects: DetectedObject[],
  source: "ocr-cv" | "gemini-fallback" = "ocr-cv"
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
    else if (obj.type === "shape") shapesCount++;
    else if (obj.type === "connector") connectorsCount++;
    else if (obj.type === "drawing") drawingsCount++;
    else if (obj.type === "embeddedImage") imagesCount++;
  }

  return {
    title,
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

export async function convertWhiteboardImage(req: ConvertImageRequest): Promise<ConversionResponse> {
  const { imageBase64, mimeType, width, height } = req;
  const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");

  // 1. OCR + Computer Vision Stage (Fast & Deterministic)
  let ocrCvResult: Awaited<ReturnType<typeof runOcrAndComputerVision>> | null = null;
  try {
    ocrCvResult = await runOcrAndComputerVision(req);
    // If OCR + CV is confident, return immediately without calling Gemini
    if (ocrCvResult && ocrCvResult.isConfident && ocrCvResult.objects.length > 0) {
      return compileConversionResponse(
        ocrCvResult.title || "Imported Whiteboard",
        width,
        height,
        ocrCvResult.objects,
        "ocr-cv"
      );
    }
  } catch (ocrErr) {
    console.warn("OCR/CV preliminary pass caught error, proceeding to AI fallback:", ocrErr);
  }

  // 2. Gemini AI Fallback
  const auth = getAiKey();
  if (!auth) {
    // If no AI key is configured, check if we have usable OCR/CV results
    if (ocrCvResult && ocrCvResult.objects.length > 0) {
      return compileConversionResponse(
        ocrCvResult.title || "Imported Whiteboard",
        width,
        height,
        ocrCvResult.objects,
        "ocr-cv"
      );
    }
    throw new Error("Gemini API key is not configured. Please set GEMINI_API_KEY.");
  }

  const ocrContextPrompt = ocrCvResult && ocrCvResult.rawOcrText
    ? `\n\nPreliminary OCR detected text tokens in the image:\n${ocrCvResult.rawOcrText}\nUse this OCR context to ensure exact spelling, wording, and positioning.`
    : "";

  const prompt = `You are a precision computer vision whiteboard and diagram reconstruction engine.
Analyze this whiteboard image / diagram screenshot (dimensions: ${width}x${height} pixels) and break it down into native vector whiteboard objects.
${ocrContextPrompt}

Coordinate system:
- Use image pixel coordinates (X from 0 to ${width}, Y from 0 to ${height}).
- Top-left is (0, 0), bottom-right is (${width}, ${height}).

Identify and extract all elements:
1. TYPED / DIGITAL TEXT ("type": "text"):
   - Read exact text accurately (keep multiline breaks with \\n).
   - "x", "y", "width", "height", "fontSize" (approx in px), "color" (hex color like "#1E1E1E", "#2563EB", etc.), "bold" (boolean), "italic" (boolean), "rotation" (degrees, 0 if upright).
   - Do NOT invent text if OCR is blurry.

2. STICKY NOTES ("type": "sticky"):
   - Post-it / sticky notes (often yellow #fef08a, orange #fed7aa, green #bbf7d0, blue #bfdbfe, pink #fbcfe8, purple #e9d5ff, white #ffffff).
   - "x", "y", "width", "height", "text" (inner text content), "bg" (hex background color), "color" (text color, usually "#422006" or "#1E1E1E"), "fontSize", "rotation".

3. GEOMETRIC SHAPES ("type": "shape"):
   - "shapeType": "rect" | "roundRect" | "circle" | "ellipse" | "triangle" | "diamond" | "star" | "hexagon" | "heart".
   - "x", "y", "width", "height", "color" (hex outline color), "fill" (boolean, true if filled with solid color), "strokeWidth" (px), "rotation".

4. CONNECTORS & ARROWS ("type": "connector"):
   - "connectorType": "arrow" | "line" | "doubleArrow" | "dashed".
   - "startX", "startY", "endX", "endY", "color" (hex), "strokeWidth" (px).

5. FREEHAND INK & DRAWINGS ("type": "drawing"):
   - Hand-drawn doodles, handwriting strokes, arrows or marks that are not clean shapes.
   - "points": array of { "x": number, "y": number } representing the stroke path points.
   - "color" (hex), "strokeWidth" (px), "isHighlighter" (boolean, true if wide transparent highlighter marker).

6. EMBEDDED PHOTOS / UNCERTAIN REGIONS ("type": "embeddedImage"):
   - Complex illustrations, charts, photos, stamps, logos, or ambiguous content that cannot be represented accurately as pure text or simple vectors.
   - "x", "y", "width", "height", "description".
   - This region will be cropped directly from the original image to preserve pixel accuracy.

Output STRICT JSON in this exact structure:
{
  "title": "Detected Whiteboard Title",
  "objects": [
    ...
  ]
}`;

  let lastError: unknown = null;
  let responseText: string | null = null;

  if (auth.type === "gemini") {
    const ai = new GoogleGenAI({
      apiKey: auth.key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    for (const modelName of GEMINI_MODELS) {
      try {
        const resp = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: mimeType || "image/png",
                    data: cleanBase64,
                  },
                },
              ],
            },
          ],
          config: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        });
        if (resp.text) {
          responseText = resp.text;
          break;
        }
      } catch (err: any) {
        lastError = err;
        const errStr = String(err?.message || err);
        console.warn(`Gemini model ${modelName} failed: ${errStr}`);
        if (isQuotaOrRateLimitError(errStr) || errStr.includes("NOT_FOUND") || errStr.includes("404")) {
          continue;
        }
      }
    }
  } else {
    // Lovable AI Gateway fallback
    for (const modelName of CANDIDATE_MODELS) {
      const maxRetries = 1;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            await sleep(500);
          }

          const res = await fetch(AI_GATEWAY_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${auth.key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: modelName,
              temperature: 0.1,
              response_format: { type: "json_object" },
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: prompt },
                    {
                      type: "image_url",
                      image_url: { url: `data:${mimeType || "image/png"};base64,${cleanBase64}` },
                    },
                  ],
                },
              ],
            }),
          });

          if (!res.ok) {
            const errBody = await res.text().catch(() => "");
            throw new Error(`${res.status} ${errBody}`);
          }

          const json = (await res.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const content = json.choices?.[0]?.message?.content;
          if (content) {
            responseText = content;
            break;
          }
        } catch (err: any) {
          lastError = err;
          const errStr = String(err?.message || err);
          console.warn(`Model ${modelName} attempt ${attempt + 1} failed: ${errStr}`);

          if (isQuotaOrRateLimitError(errStr) || errStr.includes("NOT_FOUND") || errStr.includes("404")) {
            break;
          }
        }
      }

      if (responseText) {
        break;
      }
    }
  }

  // Graceful fallback: If Gemini failed but OCR/CV yielded usable results, use OCR/CV!
  if (!responseText) {
    if (ocrCvResult && ocrCvResult.objects.length > 0) {
      console.info("Gemini AI was unavailable; gracefully falling back to deterministic OCR/CV results.");
      return compileConversionResponse(
        ocrCvResult.title || "Imported Whiteboard",
        width,
        height,
        ocrCvResult.objects,
        "ocr-cv"
      );
    }

    const cleanMsg = cleanErrorMessage(lastError);
    if (isQuotaOrRateLimitError(cleanMsg)) {
      throw new Error("AI Vision rate limit reached. Please wait a few seconds and try again, or configure your GEMINI_API_KEY.");
    }
    throw new Error(cleanMsg || "The AI vision service is currently experiencing high demand. Please try again shortly.");
  }

  let parsed: { title?: string; objects?: DetectedObject[] };

  try {
    const cleaned = responseText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error("Failed to parse Gemini vision response as JSON:", responseText, err);
    if (ocrCvResult && ocrCvResult.objects.length > 0) {
      return compileConversionResponse(
        ocrCvResult.title || "Imported Whiteboard",
        width,
        height,
        ocrCvResult.objects,
        "ocr-cv"
      );
    }
    throw new Error("Could not parse image analysis response from AI vision service.");
  }

  const rawObjects = Array.isArray(parsed.objects) ? parsed.objects : [];
  const validObjects: DetectedObject[] = [];

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
        break;
      }
      case "shape": {
        const allowedShapes = ["rect", "roundRect", "circle", "ellipse", "triangle", "diamond", "star", "hexagon", "heart"];
        const sType = allowedShapes.includes(obj.shapeType) ? obj.shapeType : "rect";
        validObjects.push({
          type: "shape",
          shapeType: sType as DetectedShapeObject["shapeType"],
          x: Math.round(Number(obj.x) || 0),
          y: Math.round(Number(obj.y) || 0),
          width: Math.max(5, Math.round(Number(obj.width) || 100)),
          height: Math.max(5, Math.round(Number(obj.height) || 100)),
          color: typeof obj.color === "string" ? obj.color : "#1E1E1E",
          fill: Boolean(obj.fill),
          strokeWidth: Math.max(1, Math.min(20, Math.round(Number(obj.strokeWidth) || 2))),
          rotation: Math.round(Number(obj.rotation) || 0),
        });
        break;
      }
      case "connector": {
        const allowedConn = ["line", "arrow", "doubleArrow", "dashed"];
        const cType = allowedConn.includes(obj.connectorType) ? obj.connectorType : "arrow";
        validObjects.push({
          type: "connector",
          connectorType: cType as DetectedConnectorObject["connectorType"],
          startX: Math.round(Number(obj.startX) || 0),
          startY: Math.round(Number(obj.startY) || 0),
          endX: Math.round(Number(obj.endX) || 100),
          endY: Math.round(Number(obj.endY) || 100),
          color: typeof obj.color === "string" ? obj.color : "#1E1E1E",
          strokeWidth: Math.max(1, Math.min(20, Math.round(Number(obj.strokeWidth) || 2))),
        });
        break;
      }
      case "drawing": {
        const pts = Array.isArray(obj.points)
          ? obj.points
              .filter((p) => p && typeof p.x === "number" && typeof p.y === "number")
              .map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }))
          : [];
        if (pts.length > 0) {
          validObjects.push({
            type: "drawing",
            points: pts,
            color: typeof obj.color === "string" ? obj.color : "#1E1E1E",
            strokeWidth: Math.max(1, Math.min(30, Math.round(Number(obj.strokeWidth) || 4))),
            isHighlighter: Boolean(obj.isHighlighter),
          });
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
            ...(typeof obj.description === "string" ? { description: obj.description } : {}),
          });
        }
        break;
      }
    }
  }

  // If Gemini produced zero valid objects but OCR/CV had objects, use OCR/CV
  if (validObjects.length === 0 && ocrCvResult && ocrCvResult.objects.length > 0) {
    return compileConversionResponse(
      ocrCvResult.title || "Imported Whiteboard",
      width,
      height,
      ocrCvResult.objects,
      "ocr-cv"
    );
  }

  return compileConversionResponse(
    parsed.title || "Converted Whiteboard",
    width,
    height,
    validObjects,
    "gemini-fallback"
  );
}
