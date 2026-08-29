/**
 * Advanced Image / PNG Whiteboard Converter Engine
 * Converts raster whiteboard screenshots into native, editable whiteboard canvas elements.
 */

export interface DetectedAiObject {
  type: "text" | "sticky" | "shape" | "connector" | "drawing" | "embeddedImage";
  [key: string]: any;
}

export interface AiConversionResult {
  title?: string;
  imageWidth: number;
  imageHeight: number;
  objects: DetectedAiObject[];
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

export interface PreparedWhiteboardObject {
  id: string;
  type: string;
  [key: string]: any;
}

/**
 * Optimizes and encodes an image File/Blob for AI vision analysis.
 */
export async function prepareImageForAnalysis(file: File | Blob): Promise<{
  dataUrl: string;
  base64: string;
  mimeType: string;
  width: number;
  height: number;
  originalImg: HTMLImageElement;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image element"));
      img.onload = () => {
        const origW = img.naturalWidth || img.width || 1200;
        const origH = img.naturalHeight || img.height || 800;

        // Resize down if extreme (>2048px) to keep network and inference fast while retaining high OCR precision
        const maxDim = 2048;
        let targetW = origW;
        let targetH = origH;

        if (origW > maxDim || origH > maxDim) {
          if (origW >= origH) {
            targetH = Math.round((origH / origW) * maxDim);
            targetW = maxDim;
          } else {
            targetW = Math.round((origW / origH) * maxDim);
            targetH = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas 2D context unavailable"));
          return;
        }

        // Fill clean white background for transparency handling
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, 0, 0, targetW, targetH);

        const optimizedDataUrl = canvas.toDataURL("image/jpeg", 0.92);
        const base64 = optimizedDataUrl.split(",")[1] || "";

        resolve({
          dataUrl,
          base64,
          mimeType: "image/jpeg",
          width: targetW,
          height: targetH,
          originalImg: img,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Sends image data to server-side AI Vision endpoint for structured whiteboard object recognition.
 */
export async function analyzeWhiteboardImage(
  imageInfo: { base64: string; mimeType: string; width: number; height: number },
  onStatusUpdateOrOptions?: ((status: string) => void) | { onStatusUpdate?: (status: string) => void; signal?: AbortSignal },
  signalOrLegacy?: AbortSignal
): Promise<AiConversionResult> {
  const onStatusUpdate = typeof onStatusUpdateOrOptions === "function"
    ? onStatusUpdateOrOptions
    : onStatusUpdateOrOptions?.onStatusUpdate;
  const signal = (onStatusUpdateOrOptions && typeof onStatusUpdateOrOptions === "object" && onStatusUpdateOrOptions.signal)
    || signalOrLegacy;

  onStatusUpdate?.("Analyzing image with AI vision...");

  const response = await fetch("/api/convert-whiteboard-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    signal,
    body: JSON.stringify({
      imageBase64: imageInfo.base64,
      mimeType: imageInfo.mimeType,
      width: imageInfo.width,
      height: imageInfo.height,
    }),
  });

  let rawText = "";
  try {
    rawText = await response.text();
  } catch {
    throw new Error("Failed to read server response");
  }

  if (!response.ok) {
    let errorMsg = `Server returned status ${response.status}`;
    try {
      const errJson = JSON.parse(rawText);
      if (errJson && errJson.error) {
        errorMsg = errJson.error;
      }
    } catch {
      // Keep status error
    }
    throw new Error(errorMsg);
  }

  onStatusUpdate?.("Recognizing objects & geometry...");

  let data: AiConversionResult;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error("Received an unexpected response format from server. Please try again.");
  }

  return data;
}

/**
 * Crops a sub-region from the source image to preserve embedded images or uncertain regions.
 */
export function cropImageRegion(
  sourceImg: HTMLImageElement,
  crop: { x: number; y: number; width: number; height: number },
  scaleX: number,
  scaleY: number
): string {
  try {
    const srcX = Math.max(0, Math.round(crop.x * scaleX));
    const srcY = Math.max(0, Math.round(crop.y * scaleY));
    const srcW = Math.min(sourceImg.naturalWidth - srcX, Math.round(crop.width * scaleX));
    const srcH = Math.min(sourceImg.naturalHeight - srcY, Math.round(crop.height * scaleY));

    if (srcW <= 0 || srcH <= 0) return "";

    const c = document.createElement("canvas");
    c.width = srcW;
    c.height = srcH;
    const ctx = c.getContext("2d");
    if (!ctx) return "";

    ctx.drawImage(sourceImg, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
    return c.toDataURL("image/png");
  } catch (err) {
    console.warn("Failed to crop sub-image region:", err);
    return "";
  }
}

function genId(): string {
  return "e" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export interface ReconstructOptions {
  targetCenter?: { x: number; y: number };
  maxCanvasWidth?: number;
  keepOriginalImage?: boolean;
}

/**
 * Converts the AI detection result into native Whiteboard elements matching the application's exact format.
 */
export function reconstructWhiteboardElements(
  result: AiConversionResult,
  sourceImg: HTMLImageElement,
  options: ReconstructOptions = {}
): {
  elements: PreparedWhiteboardObject[];
  originalImageElement?: PreparedWhiteboardObject | undefined;
  bounds: { x: number; y: number; width: number; height: number };
  title: string;
} {
  const origImgW = sourceImg.naturalWidth || sourceImg.width || result.imageWidth;
  const origImgH = sourceImg.naturalHeight || sourceImg.height || result.imageHeight;

  // Analysis coordinate space scale relative to natural image
  const scaleToNaturalX = origImgW / (result.imageWidth || origImgW);
  const scaleToNaturalY = origImgH / (result.imageHeight || origImgH);

  // Target world scale for whiteboard canvas (typically 800 - 1400px wide for optimal whiteboard viewing)
  const maxAllowedWidth = options.maxCanvasWidth || Math.min(1400, Math.max(800, origImgW));
  const worldScale = maxAllowedWidth / origImgW;

  const totalWorldW = Math.round(origImgW * worldScale);
  const totalWorldH = Math.round(origImgH * worldScale);

  // Target placement offset
  const centerX = options.targetCenter?.x ?? 0;
  const centerY = options.targetCenter?.y ?? 0;
  const originX = Math.round(centerX - totalWorldW / 2);
  const originY = Math.round(centerY - totalWorldH / 2);

  // Helper to map image analysis coordinates (X, Y) to whiteboard world coordinates
  const mapX = (x: number) => Math.round(originX + x * scaleToNaturalX * worldScale);
  const mapY = (y: number) => Math.round(originY + y * scaleToNaturalY * worldScale);
  const mapDim = (dim: number, isY = false) =>
    Math.max(1, Math.round(dim * (isY ? scaleToNaturalY : scaleToNaturalX) * worldScale));

  const backgroundShapes: PreparedWhiteboardObject[] = [];
  const stickyNotes: PreparedWhiteboardObject[] = [];
  const standardShapes: PreparedWhiteboardObject[] = [];
  const embeddedImages: PreparedWhiteboardObject[] = [];
  const freehandDrawings: PreparedWhiteboardObject[] = [];
  const textElements: PreparedWhiteboardObject[] = [];
  const connectorElements: PreparedWhiteboardObject[] = [];

  for (const rawObj of result.objects) {
    const obj = rawObj as any;
    if (!obj || !obj.type) continue;

    switch (obj.type) {
      case "text": {
        const text = String(obj.text || "").trim();
        if (!text) break;
        const wx = mapX(obj.x);
        const wy = mapY(obj.y);
        const baseFontSize = Number(obj.fontSize) || 18;
        const scaledSize = Math.max(12, Math.min(120, Math.round(baseFontSize * worldScale * scaleToNaturalX)));

        textElements.push({
          id: genId(),
          type: "text",
          text,
          x: wx,
          y: wy,
          w: mapDim(obj.width || 150),
          h: mapDim(obj.height || 40, true),
          size: scaledSize,
          font: "Segoe UI,Inter,system-ui,sans-serif",
          color: obj.color || "#1E1E1E",
          bold: Boolean(obj.bold),
          italic: Boolean(obj.italic),
          underline: Boolean(obj.underline),
          rotation: Number(obj.rotation) || 0,
          isPlaceholder: false,
        });
        break;
      }

      case "sticky": {
        const text = String(obj.text || "");
        const wx = mapX(obj.x);
        const wy = mapY(obj.y);
        const w = mapDim(obj.width || 180);
        const h = mapDim(obj.height || 140, true);
        const baseFontSize = Number(obj.fontSize) || 16;
        const scaledSize = Math.max(12, Math.min(48, Math.round(baseFontSize * worldScale * scaleToNaturalX)));

        stickyNotes.push({
          id: genId(),
          type: "sticky",
          text,
          x: wx,
          y: wy,
          w,
          h,
          bg: obj.bg || "#fef08a",
          color: obj.color || "#422006",
          size: scaledSize,
          font: "Segoe UI,Inter,system-ui,sans-serif",
          rotation: Number(obj.rotation) || 0,
          isPlaceholder: !text.trim(),
        });
        break;
      }

      case "shape": {
        const shapeType = obj.shapeType || "rect";
        const wx = mapX(obj.x);
        const wy = mapY(obj.y);
        const w = mapDim(obj.width || 120);
        const h = mapDim(obj.height || 100, true);
        const strokeW = Math.max(1, Math.min(16, Math.round((Number(obj.strokeWidth) || 2) * worldScale * scaleToNaturalX)));

        const el: PreparedWhiteboardObject = {
          id: genId(),
          type: shapeType,
          x: wx,
          y: wy,
          w,
          h,
          color: obj.color || "#1E1E1E",
          fill: Boolean(obj.fill),
          width: strokeW,
          rotation: Number(obj.rotation) || 0,
        };

        // If shape is a large filled rectangle acting like a container card/section, place in background
        if ((shapeType === "rect" || shapeType === "roundRect") && w > 300 && h > 200 && obj.fill) {
          backgroundShapes.push(el);
        } else {
          standardShapes.push(el);
        }
        break;
      }

      case "connector": {
        const connectorType = obj.connectorType || "arrow";
        const sx = mapX(obj.startX);
        const sy = mapY(obj.startY);
        const ex = mapX(obj.endX);
        const ey = mapY(obj.endY);
        const strokeW = Math.max(1, Math.min(14, Math.round((Number(obj.strokeWidth) || 2) * worldScale * scaleToNaturalX)));

        connectorElements.push({
          id: genId(),
          type: connectorType,
          x: sx,
          y: sy,
          w: ex - sx,
          h: ey - sy,
          color: obj.color || "#1E1E1E",
          width: strokeW,
        });
        break;
      }

      case "drawing": {
        const pts = Array.isArray(obj.points)
          ? obj.points.map((p: { x: number; y: number }) => ({
              x: mapX(p.x),
              y: mapY(p.y),
            }))
          : [];

        if (pts.length > 0) {
          const strokeW = Math.max(1, Math.min(24, Math.round((Number(obj.strokeWidth) || 3) * worldScale * scaleToNaturalX)));
          const isHighlighter = Boolean(obj.isHighlighter);

          if (isHighlighter) {
            freehandDrawings.push({
              id: genId(),
              type: "highlighter",
              points: pts,
              color: obj.color || "#FF6B00",
              width: Math.max(8, strokeW * 2),
              highlighterStyle: 0,
            });
          } else {
            freehandDrawings.push({
              id: genId(),
              type: "pen",
              points: pts,
              color: obj.color || "#1E1E1E",
              width: strokeW,
              penStyle: 0,
              opacity: 1,
            });
          }
        }
        break;
      }

      case "embeddedImage": {
        const cropDataUrl = cropImageRegion(
          sourceImg,
          { x: obj.x, y: obj.y, width: obj.width, height: obj.height },
          scaleToNaturalX,
          scaleToNaturalY
        );

        if (cropDataUrl) {
          const wx = mapX(obj.x);
          const wy = mapY(obj.y);
          const w = mapDim(obj.width || 120);
          const h = mapDim(obj.height || 100, true);

          const imgObj = new Image();
          imgObj.src = cropDataUrl;

          embeddedImages.push({
            id: genId(),
            type: "image",
            src: cropDataUrl,
            img: imgObj,
            x: wx,
            y: wy,
            w,
            h,
            rotation: 0,
          });
        }
        break;
      }
    }
  }

  // Proper visual z-order layering:
  // 1. Background cards & large section containers
  // 2. Sticky notes
  // 3. Geometric shapes
  // 4. Embedded cropped images / uncertain regions
  // 5. Freehand drawings & highlighter strokes
  // 6. Text blocks
  // 7. Connectors, arrows & annotations
  const finalOrderedElements = [
    ...backgroundShapes,
    ...stickyNotes,
    ...standardShapes,
    ...embeddedImages,
    ...freehandDrawings,
    ...textElements,
    ...connectorElements,
  ];

  let originalImageElement: PreparedWhiteboardObject | undefined;
  if (options.keepOriginalImage) {
    const backupImg = new Image();
    backupImg.src = sourceImg.src;
    // Place original image cleanly to the left or right of the reconstructed diagram
    const backupX = originX - totalWorldW - 60;
    const backupY = originY;

    originalImageElement = {
      id: genId(),
      type: "image",
      src: sourceImg.src,
      img: backupImg,
      x: backupX,
      y: backupY,
      w: totalWorldW,
      h: totalWorldH,
      rotation: 0,
    };
  }

  return {
    elements: finalOrderedElements,
    originalImageElement,
    bounds: {
      x: originX,
      y: originY,
      width: totalWorldW,
      height: totalWorldH,
    },
    title: result.title || "Imported Whiteboard",
  };
}
