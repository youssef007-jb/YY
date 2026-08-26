import type { BoardRecord } from "./boards-db";

/**
 * Generates a high-quality dataURL thumbnail from a BoardRecord.
 */
export async function generateBoardThumbnail(board: BoardRecord): Promise<string> {
  const elements = (board.elements || []) as any[];
  const W = 320;
  const H = 200;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = board.bgColor || "#ffffff";
  ctx.fillRect(0, 0, W, H);

  if (elements.length === 0) {
    return canvas.toDataURL("image/jpeg", 0.85);
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  elements.forEach((el) => {
    if (el.points && Array.isArray(el.points) && el.points.length > 0) {
      el.points.forEach((p: { x: number; y: number }) => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });
    } else {
      const bx = el.x ?? 0;
      const by = el.y ?? 0;
      const bw = el.w ?? 100;
      const bh = el.h ?? 60;
      minX = Math.min(minX, bx, bx + bw);
      minY = Math.min(minY, by, by + bh);
      maxX = Math.max(maxX, bx, bx + bw);
      maxY = Math.max(maxY, by, by + bh);
    }
  });

  if (!isFinite(minX) || !isFinite(minY)) {
    minX = 0; minY = 0; maxX = 800; maxY = 500;
  }

  const pad = 36;
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;
  const ww = Math.max(1, maxX - minX);
  const hh = Math.max(1, maxY - minY);
  const scale = Math.min(W / ww, H / hh);

  // Pre-load images if any
  const loadedImages = new Map<string, HTMLImageElement>();
  const imagePromises = elements
    .filter((el) => el.type === "image" && el.src)
    .map(
      (el) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            loadedImages.set(el.src, img);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = el.src;
        }),
    );

  await Promise.race([
    Promise.all(imagePromises),
    new Promise((resolve) => setTimeout(resolve, 600)),
  ]);

  ctx.translate((W - ww * scale) / 2, (H - hh * scale) / 2);
  ctx.scale(scale, scale);
  ctx.translate(-minX, -minY);

  elements.forEach((el) => {
    ctx.save();
    const bx = el.x ?? 0;
    const by = el.y ?? 0;
    const bw = el.w ?? 100;
    const bh = el.h ?? 60;

    if (el.rotation) {
      const cx = bx + bw / 2;
      const cy = by + bh / 2;
      ctx.translate(cx, cy);
      ctx.rotate((el.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    const strokeTypes = ["pen", "highlighter", "vanishing"];
    if (strokeTypes.includes(el.type) && el.points && el.points.length > 1) {
      ctx.beginPath();
      el.points.forEach((pt: { x: number; y: number }, idx: number) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.strokeStyle = el.color || "#1E1E1E";
      ctx.lineWidth = Math.max(1, el.width || 3);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = el.type === "highlighter" ? 0.4 : 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (el.type === "sticky") {
      ctx.fillStyle = el.bg || "#fef08a";
      ctx.fillRect(bx, by, bw, bh);
      if (el.text) {
        ctx.fillStyle = el.color || "#422006";
        const sz = el.size || 16;
        ctx.font = `${sz}px Segoe UI,Inter,sans-serif`;
        ctx.textBaseline = "top";
        String(el.text)
          .split("\n")
          .slice(0, 4)
          .forEach((line, li) => {
            ctx.fillText(line.slice(0, 30), bx + 8, by + 8 + li * sz * 1.2);
          });
      }
    } else if (el.type === "text") {
      ctx.fillStyle = el.color || "#111827";
      const sz = el.size || 18;
      ctx.font = `${el.bold ? "bold " : ""}${el.italic ? "italic " : ""}${sz}px ${el.font || "Segoe UI,Inter,sans-serif"}`;
      ctx.textBaseline = "top";
      String(el.text || "")
        .split("\n")
        .forEach((l, i) => ctx.fillText(l, bx, by + i * sz * 1.25));
    } else if (el.type === "emoji") {
      ctx.font = `${bw || 32}px sans-serif`;
      ctx.textBaseline = "top";
      ctx.fillText(el.text || "", bx, by);
    } else if (el.type === "image") {
      const img = loadedImages.get(el.src);
      if (img && img.complete && img.naturalWidth > 0) {
        try {
          ctx.drawImage(img, bx, by, bw, bh);
        } catch {
          /* ignore */
        }
      } else {
        ctx.fillStyle = "rgba(241,245,249,0.95)";
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx, by, bw, bh);
        ctx.fillStyle = "#64748b";
        ctx.font = "14px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🖼️", bx + bw / 2, by + bh / 2);
      }
    } else if (el.type === "circle" || el.type === "ellipse") {
      ctx.beginPath();
      ctx.ellipse(bx + bw / 2, by + bh / 2, Math.abs(bw / 2), Math.abs(bh / 2), 0, 0, Math.PI * 2);
      ctx.strokeStyle = el.color || "#0055FF";
      ctx.lineWidth = Math.max(1, el.width || 2);
      ctx.stroke();
    } else if (el.type === "rect") {
      ctx.strokeStyle = el.color || "#0055FF";
      ctx.lineWidth = Math.max(1, el.width || 2);
      ctx.strokeRect(bx, by, bw, bh);
    } else if (el.type === "roundRect") {
      const r = Math.min(12, Math.abs(bw) / 4, Math.abs(bh) / 4);
      ctx.strokeStyle = el.color || "#0055FF";
      ctx.lineWidth = Math.max(1, el.width || 2);
      if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, r);
        ctx.stroke();
      } else {
        ctx.strokeRect(bx, by, bw, bh);
      }
    } else if (el.type === "triangle") {
      ctx.beginPath();
      ctx.moveTo(bx + bw / 2, by);
      ctx.lineTo(bx, by + bh);
      ctx.lineTo(bx + bw, by + bh);
      ctx.closePath();
      ctx.strokeStyle = el.color || "#0055FF";
      ctx.lineWidth = Math.max(1, el.width || 2);
      ctx.stroke();
    } else if (el.type === "diamond") {
      ctx.beginPath();
      ctx.moveTo(bx + bw / 2, by);
      ctx.lineTo(bx + bw, by + bh / 2);
      ctx.lineTo(bx + bw / 2, by + bh);
      ctx.lineTo(bx, by + bh / 2);
      ctx.closePath();
      ctx.strokeStyle = el.color || "#0055FF";
      ctx.lineWidth = Math.max(1, el.width || 2);
      ctx.stroke();
    } else if (el.type === "star") {
      const scx = bx + bw / 2, scy = by + bh / 2;
      const outerR = Math.min(Math.abs(bw), Math.abs(bh)) / 2;
      const innerR = outerR * 0.45;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const a = (Math.PI / 5) * i - Math.PI / 2;
        ctx.lineTo(scx + Math.cos(a) * r, scy + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.strokeStyle = el.color || "#0055FF";
      ctx.lineWidth = Math.max(1, el.width || 2);
      ctx.stroke();
    } else if (el.type === "line" || el.type === "arrow" || el.type === "doubleArrow" || el.type === "dashed") {
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + bw, by + bh);
      ctx.strokeStyle = el.color || "#0055FF";
      ctx.lineWidth = Math.max(1, el.width || 2);
      if (el.type === "dashed") ctx.setLineDash([6, 6]);
      ctx.stroke();
    } else {
      ctx.strokeStyle = el.color || "#0055FF";
      ctx.lineWidth = Math.max(1, el.width || 2);
      ctx.strokeRect(bx, by, bw, bh);
    }
    ctx.restore();
  });

  return canvas.toDataURL("image/jpeg", 0.85);
}
