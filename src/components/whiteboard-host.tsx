import { useEffect } from "react";
import markup from "../whiteboard-markup.html?raw";
import { getBoard, getWorkspaceBoardPayload, type BoardRecord } from "@/lib/boards-db";
import { renderPdfToImages } from "@/lib/pdf-importer";
import {
  embedSmartPngMetadata,
  extractSmartPngMetadata,
  isSmartPngFile,
} from "@/lib/smart-png";
import {
  prepareImageForAnalysis,
  analyzeWhiteboardImage,
  reconstructWhiteboardElements,
} from "@/lib/image-importer";

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(
      `script[data-hbibo="${src}"]`,
    ) as HTMLScriptElement | null;
    if (existing) {
      if (existing.getAttribute("data-loaded") === "1") resolve();
      else existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.setAttribute("data-hbibo", src);
    s.onload = () => {
      s.setAttribute("data-loaded", "1");
      resolve();
    };
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(s);
  });
}

type HbiboWindow = {
  __hbiboInit?: (opts?: {
    boardId?: string | undefined;
    board?: BoardRecord | null | undefined;
    onHome?: (() => void) | undefined;
  }) => void;
  __hbiboDestroy?: () => void;
  renderPdfToImages?: typeof renderPdfToImages;
  SmartPNG?: {
    embedSmartPngMetadata: typeof embedSmartPngMetadata;
    extractSmartPngMetadata: typeof extractSmartPngMetadata;
    isSmartPngFile: typeof isSmartPngFile;
  };
  SmartImageImporter?: {
    prepareImageForAnalysis: typeof prepareImageForAnalysis;
    analyzeWhiteboardImage: typeof analyzeWhiteboardImage;
    reconstructWhiteboardElements: typeof reconstructWhiteboardElements;
  };
};

export function WhiteboardHost({
  boardId,
  onHome,
}: {
  boardId: string;
  onHome?: () => void;
}) {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Expose PDF importer, Smart PNG engine, and Smart Image Importer for whiteboard canvas
      const win = window as unknown as HbiboWindow;
      win.renderPdfToImages = renderPdfToImages;
      win.SmartPNG = {
        embedSmartPngMetadata,
        extractSmartPngMetadata,
        isSmartPngFile,
      };
      win.SmartImageImporter = {
        prepareImageForAnalysis,
        analyzeWhiteboardImage,
        reconstructWhiteboardElements,
      };

      let initialBoard: BoardRecord | null = getWorkspaceBoardPayload(boardId);
      if (!initialBoard) {
        try {
          initialBoard = await getBoard(boardId);
        } catch (err) {
          console.warn("Could not pre-fetch board record", err);
        }
      }
      if (cancelled) return;

      try {
        await loadScript("/lucide.min.js");
      } catch {
        /* icons optional */
      }
      if (cancelled) return;
      try {
        await loadScript("/whiteboard-store.js");
        await loadScript("/whiteboard-app.js");
      } catch (err) {
        console.error(err);
        return;
      }
      if (cancelled) return;
      const w = window as unknown as HbiboWindow;
      w.__hbiboInit?.({ boardId, board: initialBoard, onHome });
    })();
    return () => {
      cancelled = true;
      (window as unknown as HbiboWindow).__hbiboDestroy?.();
    };
  }, [boardId, onHome]);

  return (
    <div
      className="relative h-dvh w-screen overflow-hidden font-sans text-slate-800"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

