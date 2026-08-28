import { stripFileExtension } from "./filename-utils";

export type RenderedPage = {
  name: string;
  src: string;
  dataUrl: string;
  w: number;
  h: number;
};

export async function renderPdfToImages(file: File | Blob): Promise<RenderedPage[]> {
  if (typeof window === "undefined") {
    throw new Error("PDF rendering is only supported in browser environments.");
  }

  try {
    const pdfjsLib = await import("pdfjs-dist");
    try {
      if (pdfjsLib.GlobalWorkerOptions) {
        const version = pdfjsLib.version || "6.2.108";
        // Use jsdelivr CDN with the exact matching pdfjs-dist version
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
      }
    } catch (e) {
      console.warn("Could not set PDF.js workerSrc", e);
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useWorkerFetch: false,
      useSystemFonts: true,
    });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const results: RenderedPage[] = [];

    const fileName = file instanceof File ? (stripFileExtension(file.name) || file.name) : "PDF Document";

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const originalViewport = page.getViewport({ scale: 1 });

      // Target high crisp resolution (~1400px width/height)
      const maxRenderDim = 1400;
      let scale = 1.6;
      if (originalViewport.width > originalViewport.height) {
        if (originalViewport.width * scale > maxRenderDim) scale = maxRenderDim / originalViewport.width;
      } else {
        if (originalViewport.height * scale > maxRenderDim) scale = maxRenderDim / originalViewport.height;
      }

      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;

      // Fill white background for pages with transparent backgrounds
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render PDF page
      // @ts-expect-error type compatibility with canvasContext
      await page.render({ canvasContext: ctx, viewport }).promise;
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

      // Desired whiteboard display dimension
      const maxDisplayDim = 580;
      let dw = originalViewport.width;
      let dh = originalViewport.height;
      if (dw > maxDisplayDim || dh > maxDisplayDim) {
        if (dw >= dh) {
          dh = Math.round((dh / dw) * maxDisplayDim);
          dw = maxDisplayDim;
        } else {
          dh = Math.round((dw / dh) * maxDisplayDim);
          dh = maxDisplayDim;
        }
      }

      results.push({
        name: numPages === 1 ? fileName : `${fileName} • Page ${pageNum}`,
        src: dataUrl,
        dataUrl,
        w: Math.round(dw),
        h: Math.round(dh),
      });
    }

    return results;
  } catch (err) {
    console.error("PDF rendering failed:", err);
    throw new Error("Could not parse or render PDF pages.");
  }
}
