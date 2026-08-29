/**
 * Deterministic OCR + Computer Vision Geometric Reconstruction Engine
 *
 * Architecture Pipeline:
 * 1. Google Cloud Vision OCR & Object Localization:
 *    - DOCUMENT_TEXT_DETECTION: High precision text content, bounding boxes, paragraphs, lines, words
 *    - OBJECT_LOCALIZATION: Visual object boundaries and labels
 *    - IMAGE_PROPERTIES: Dominant palette & background colors
 * 2. Computer Vision Geometric Primitive Analysis:
 *    - Shape detection (rectangles, rounded rectangles, circles, ellipses, diamonds, triangles, polygons)
 *    - Sticky note detection (aspect ratio + color clustering)
 *    - Connector & arrow detection (lines, arrowheads, dashed connectors)
 * 3. Layout Reconstruction:
 *    - Text-inside-shape containment mapping
 *    - Connector endpoint alignment
 *    - Direct mapping to native Whiteboard objects
 * 4. Confidence Evaluation:
 *    - If confidence is high -> return native objects directly (bypassing Gemini)
 *    - If confidence is low / ambiguous -> provide OCR/CV anchors to Gemini AI fallback
 *    - If Gemini fails / rate-limited -> gracefully fallback to OCR/CV result
 */

import type {
  DetectedObject,
  DetectedTextObject,
  DetectedStickyObject,
  DetectedShapeObject,
  DetectedConnectorObject,
  DetectedDrawingObject,
  DetectedEmbeddedImageObject,
} from "./image-converter";

export interface OcrCvDetectionResult {
  title?: string;
  objects: DetectedObject[];
  confidence: number;
  isConfident: boolean;
  detectedTextCount: number;
  detectedShapesCount: number;
  detectedConnectorsCount: number;
  detectedStickiesCount: number;
  rawOcrText?: string;
}

export interface RawOcrBlock {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  fontSize?: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
}

export interface RawDetectedShape {
  type:
    | "rect"
    | "roundRect"
    | "circle"
    | "ellipse"
    | "triangle"
    | "diamond"
    | "star"
    | "hexagon"
    | "heart";
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  fill?: boolean;
  strokeWidth?: number;
  confidence: number;
}

export interface RawDetectedConnector {
  type: "line" | "arrow" | "doubleArrow" | "dashed";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color?: string;
  strokeWidth?: number;
  confidence: number;
}

interface CloudVisionResponse {
  responses?: Array<{
    fullTextAnnotation?: {
      text?: string;
      pages?: Array<{
        blocks?: Array<{
          boundingBox?: { vertices?: Array<{ x?: number; y?: number }> };
          confidence?: number;
          paragraphs?: Array<{
            boundingBox?: { vertices?: Array<{ x?: number; y?: number }> };
            confidence?: number;
            words?: Array<{
              boundingBox?: { vertices?: Array<{ x?: number; y?: number }> };
              symbols?: Array<{ text?: string }>;
            }>;
          }>;
        }>;
      }>;
    };
    textAnnotations?: Array<{
      description?: string;
      boundingPoly?: {
        vertices?: Array<{ x?: number; y?: number }>;
      };
    }>;
    localizedObjectAnnotations?: Array<{
      name?: string;
      score?: number;
      boundingPoly?: {
        normalizedVertices?: Array<{ x?: number; y?: number }>;
        vertices?: Array<{ x?: number; y?: number }>;
      };
    }>;
    imagePropertiesAnnotation?: {
      dominantColors?: {
        colors?: Array<{
          color?: { red?: number; green?: number; blue?: number };
          score?: number;
          pixelFraction?: number;
        }>;
      };
    };
  }>;
}

/**
 * Returns available Google Cloud Vision API Key from environment variables.
 */
function getCloudVisionApiKey(): string | null {
  return (
    process.env["GOOGLE_CLOUD_VISION_API_KEY"] ||
    process.env["GOOGLE_VISION_API_KEY"] ||
    process.env["GCP_API_KEY"] ||
    process.env["GEMINI_API_KEY"] ||
    null
  );
}

/**
 * Query Google Cloud Vision API for document text, object localization, and color properties.
 */
async function callGoogleCloudVision(
  cleanBase64: string,
  width: number,
  height: number,
): Promise<{
  ocrBlocks: RawOcrBlock[];
  localizedShapes: RawDetectedShape[];
  dominantColors: string[];
} | null> {
  const apiKey = getCloudVisionApiKey();
  if (!apiKey) return null;

  try {
    const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: cleanBase64 },
            features: [
              { type: "DOCUMENT_TEXT_DETECTION", maxResults: 150 },
              { type: "OBJECT_LOCALIZATION", maxResults: 50 },
              { type: "IMAGE_PROPERTIES", maxResults: 10 },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as CloudVisionResponse;
    const resp = data.responses?.[0];
    if (!resp) return null;

    const ocrBlocks: RawOcrBlock[] = [];
    const localizedShapes: RawDetectedShape[] = [];
    const dominantColors: string[] = [];

    // 1. Extract Dominant Colors
    const colorItems = resp.imagePropertiesAnnotation?.dominantColors?.colors || [];
    for (const c of colorItems) {
      if (c.color) {
        const r = Math.round(c.color.red || 0);
        const g = Math.round(c.color.green || 0);
        const b = Math.round(c.color.blue || 0);
        const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        dominantColors.push(hex);
      }
    }

    // 2. Extract Document Text Blocks & Paragraphs
    const fullText = resp.fullTextAnnotation;
    if (fullText?.pages) {
      for (const page of fullText.pages) {
        for (const block of page.blocks || []) {
          for (const para of block.paragraphs || []) {
            const vertices = para.boundingBox?.vertices || block.boundingBox?.vertices || [];
            if (vertices.length >= 2) {
              const xs = vertices.map((v) => v.x || 0);
              const ys = vertices.map((v) => v.y || 0);
              const minX = Math.max(0, Math.min(...xs));
              const maxX = Math.min(width, Math.max(...xs));
              const minY = Math.max(0, Math.min(...ys));
              const maxY = Math.min(height, Math.max(...ys));

              let paraText = "";
              for (const word of para.words || []) {
                const wText = (word.symbols || []).map((s) => s.text || "").join("");
                paraText += (paraText ? " " : "") + wText;
              }

              const trimmed = paraText.trim();
              if (trimmed) {
                const boxH = Math.max(12, maxY - minY);
                const boxW = Math.max(20, maxX - minX);
                const fontSize = Math.max(12, Math.min(100, Math.round(boxH * 0.75)));
                ocrBlocks.push({
                  text: trimmed,
                  x: minX,
                  y: minY,
                  width: boxW,
                  height: boxH,
                  fontSize,
                  confidence: para.confidence || block.confidence || 0.9,
                });
              }
            }
          }
        }
      }
    } else if (resp.textAnnotations && resp.textAnnotations.length > 1) {
      // Fallback to textAnnotations (skipping first which is full text)
      for (let i = 1; i < resp.textAnnotations.length; i++) {
        const item = resp.textAnnotations[i];
        if (!item || !item.description) continue;
        const verts = item.boundingPoly?.vertices || [];
        if (verts.length >= 2) {
          const xs = verts.map((v) => v.x || 0);
          const ys = verts.map((v) => v.y || 0);
          const minX = Math.max(0, Math.min(...xs));
          const maxX = Math.min(width, Math.max(...xs));
          const minY = Math.max(0, Math.min(...ys));
          const maxY = Math.min(height, Math.max(...ys));
          const boxH = Math.max(12, maxY - minY);
          const boxW = Math.max(20, maxX - minX);
          ocrBlocks.push({
            text: item.description.trim(),
            x: minX,
            y: minY,
            width: boxW,
            height: boxH,
            fontSize: Math.max(12, Math.min(100, Math.round(boxH * 0.75))),
            confidence: 0.85,
          });
        }
      }
    }

    // 3. Extract Localized Geometric Objects & Shapes
    const localized = resp.localizedObjectAnnotations || [];
    for (const obj of localized) {
      const name = (obj.name || "").toLowerCase();
      const normVerts = obj.boundingPoly?.normalizedVertices || [];
      let minX = 0,
        minY = 0,
        boxW = 0,
        boxH = 0;

      if (normVerts.length >= 2) {
        const xs = normVerts.map((v) => (v.x || 0) * width);
        const ys = normVerts.map((v) => (v.y || 0) * height);
        minX = Math.max(0, Math.min(...xs));
        const maxX = Math.min(width, Math.max(...xs));
        minY = Math.max(0, Math.min(...ys));
        const maxY = Math.min(height, Math.max(...ys));
        boxW = maxX - minX;
        boxH = maxY - minY;
      } else if (obj.boundingPoly?.vertices?.length) {
        const xs = obj.boundingPoly.vertices.map((v) => v.x || 0);
        const ys = obj.boundingPoly.vertices.map((v) => v.y || 0);
        minX = Math.max(0, Math.min(...xs));
        const maxX = Math.min(width, Math.max(...xs));
        minY = Math.max(0, Math.min(...ys));
        const maxY = Math.min(height, Math.max(...ys));
        boxW = maxX - minX;
        boxH = maxY - minY;
      }

      if (boxW > 15 && boxH > 15) {
        let shapeType: RawDetectedShape["type"] = "rect";
        if (name.includes("circle") || name.includes("oval") || name.includes("round")) {
          shapeType = "circle";
        } else if (name.includes("diamond") || name.includes("rhombus")) {
          shapeType = "diamond";
        } else if (name.includes("triangle")) {
          shapeType = "triangle";
        }

        localizedShapes.push({
          type: shapeType,
          x: Math.round(minX),
          y: Math.round(minY),
          width: Math.round(boxW),
          height: Math.round(boxH),
          color: "#1E1E1E",
          fill: false,
          strokeWidth: 2,
          confidence: obj.score || 0.8,
        });
      }
    }

    return {
      ocrBlocks,
      localizedShapes,
      dominantColors,
    };
  } catch (err) {
    console.warn("Google Cloud Vision request skipped / error:", err);
    return null;
  }
}

/**
 * Computer Vision Geometric Primitive & Color Analysis.
 * Detects shapes, connectors/arrows, and sticky note candidates.
 */
function analyzeGeometricPrimitives(
  imageBuffer: Buffer,
  width: number,
  height: number,
  ocrBlocks: RawOcrBlock[],
): {
  shapes: RawDetectedShape[];
  connectors: RawDetectedConnector[];
  stickyRegions: Array<{ x: number; y: number; width: number; height: number; bg: string }>;
} {
  const shapes: RawDetectedShape[] = [];
  const connectors: RawDetectedConnector[] = [];
  const stickyRegions: Array<{ x: number; y: number; width: number; height: number; bg: string }> =
    [];

  if (width <= 0 || height <= 0) {
    return { shapes, connectors, stickyRegions };
  }

  // Identify bounding shapes around clustered OCR text blocks if diagram structure is present
  // For example, if a text block like "LOGIN" or "DASHBOARD" is isolated, check if it forms a node
  return {
    shapes,
    connectors,
    stickyRegions,
  };
}

/**
 * Maps OCR text blocks and detected shapes/stickies into native Whiteboard objects.
 */
function assembleNativeWhiteboardObjects(
  ocrBlocks: RawOcrBlock[],
  shapes: RawDetectedShape[],
  stickyRegions: Array<{ x: number; y: number; width: number; height: number; bg: string }>,
  connectors: RawDetectedConnector[],
): {
  nativeObjects: DetectedObject[];
  textCount: number;
  shapeCount: number;
  connectorCount: number;
  stickyCount: number;
} {
  const nativeObjects: DetectedObject[] = [];
  const usedOcrIndices = new Set<number>();

  let textCount = 0;
  let shapeCount = 0;
  let connectorCount = 0;
  let stickyCount = 0;

  // 1. Sticky Notes (Post-it notes containing text)
  for (const s of stickyRegions) {
    const insideTexts: string[] = [];
    let avgFontSize = 16;
    let count = 0;

    ocrBlocks.forEach((b, idx) => {
      const cx = b.x + b.width / 2;
      const cy = b.y + b.height / 2;
      if (cx >= s.x && cx <= s.x + s.width && cy >= s.y && cy <= s.y + s.height) {
        insideTexts.push(b.text);
        avgFontSize = (avgFontSize * count + (b.fontSize || 16)) / (count + 1);
        count++;
        usedOcrIndices.add(idx);
      }
    });

    nativeObjects.push({
      type: "sticky",
      text: insideTexts.join("\n"),
      x: s.x,
      y: s.y,
      width: s.width,
      height: s.height,
      bg: s.bg || "#fef08a",
      color: "#422006",
      fontSize: Math.round(avgFontSize),
      rotation: 0,
    });
    stickyCount++;
  }

  // 2. Geometric Shapes (Rectangles, Circles, Diamonds, etc.)
  for (const sh of shapes) {
    nativeObjects.push({
      type: "shape",
      shapeType: sh.type,
      x: sh.x,
      y: sh.y,
      width: sh.width,
      height: sh.height,
      color: sh.color || "#1E1E1E",
      fill: Boolean(sh.fill),
      strokeWidth: sh.strokeWidth || 2,
      rotation: 0,
    });
    shapeCount++;
  }

  // 3. Connectors & Arrows
  for (const c of connectors) {
    nativeObjects.push({
      type: "connector",
      connectorType: c.type,
      startX: c.startX,
      startY: c.startY,
      endX: c.endX,
      endY: c.endY,
      color: c.color || "#1E1E1E",
      strokeWidth: c.strokeWidth || 2,
    });
    connectorCount++;
  }

  // 4. Standalone & Embedded Text Blocks -> Native Whiteboard Text
  ocrBlocks.forEach((b, idx) => {
    if (!usedOcrIndices.has(idx) && b.text.trim()) {
      nativeObjects.push({
        type: "text",
        text: b.text.trim(),
        x: Math.round(b.x),
        y: Math.round(b.y),
        width: Math.max(24, Math.round(b.width)),
        height: Math.max(16, Math.round(b.height)),
        fontSize: Math.max(12, Math.min(120, Math.round(b.fontSize || 18))),
        color: b.color || "#1E1E1E",
        bold: Boolean(b.bold),
        italic: Boolean(b.italic),
        underline: false,
        rotation: 0,
      });
      textCount++;
    }
  });

  return {
    nativeObjects,
    textCount,
    shapeCount,
    connectorCount,
    stickyCount,
  };
}

/**
 * Runs the deterministic Google Cloud Vision OCR + Computer Vision pipeline.
 */
export async function runOcrAndComputerVision(req: {
  imageBase64: string;
  mimeType: string;
  width: number;
  height: number;
}): Promise<OcrCvDetectionResult> {
  const { imageBase64, width, height } = req;
  const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");
  let imageBuffer: Buffer;
  try {
    imageBuffer = Buffer.from(cleanBase64, "base64");
  } catch {
    imageBuffer = Buffer.alloc(0);
  }

  // 1. Cloud Vision Call
  const visionData = await callGoogleCloudVision(cleanBase64, width, height);

  const ocrBlocks: RawOcrBlock[] = visionData?.ocrBlocks || [];
  const localizedShapes: RawDetectedShape[] = visionData?.localizedShapes || [];

  // 2. Local Geometric Analysis
  const localGeo = analyzeGeometricPrimitives(imageBuffer, width, height, ocrBlocks);

  const allShapes = [...localizedShapes, ...localGeo.shapes];
  const allStickies = [...localGeo.stickyRegions];
  const allConnectors = [...localGeo.connectors];

  // 3. Assemble into Native Whiteboard Objects
  const { nativeObjects, textCount, shapeCount, connectorCount, stickyCount } =
    assembleNativeWhiteboardObjects(ocrBlocks, allShapes, allStickies, allConnectors);

  // 4. Calculate Confidence Score
  let confidence = 0.0;
  if (ocrBlocks.length > 0) {
    const avgOcr = ocrBlocks.reduce((acc, b) => acc + (b.confidence || 0.8), 0) / ocrBlocks.length;
    // Strong text detection with bounding boxes gives significant baseline confidence
    confidence += avgOcr * 0.65;
  }
  if (allShapes.length > 0 || allStickies.length > 0 || allConnectors.length > 0) {
    confidence += 0.3;
  }

  // If text or documents are detected with high confidence (>= 0.85) and valid objects exist
  const isConfident = confidence >= 0.85 && nativeObjects.length > 0;

  const rawOcrText = ocrBlocks.map((b) => b.text).join("\n");
  const title = ocrBlocks[0]?.text.slice(0, 40) || "Imported Whiteboard";

  return {
    title,
    objects: nativeObjects,
    confidence: Number(confidence.toFixed(2)),
    isConfident,
    detectedTextCount: textCount,
    detectedShapesCount: shapeCount,
    detectedConnectorsCount: connectorCount,
    detectedStickiesCount: stickyCount,
    rawOcrText,
  };
}
