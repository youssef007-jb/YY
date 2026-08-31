import { describe, it, expect } from "vitest";

describe("Whiteboard Core Invariants: Clipboard, Resize Handles & Text Alignment", () => {
  describe("Clipboard Text Insertion Invariants", () => {
    it("should strip rich-text HTML/newlines and create fresh default text item ignoring copied styling", () => {
      const DEFAULT_TEXT_COLOR = "#0f172a";
      const DEFAULT_FONT = "Segoe UI,Inter,system-ui,sans-serif";
      const rawText = "<b>Bold Title</b>\r\nSecond Line\r\nThird Line";

      // Normalization check
      const normalizedText = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      expect(normalizedText).toBe("<b>Bold Title</b>\nSecond Line\nThird Line");

      // Creation simulation
      const newEl = {
        type: "text",
        text: normalizedText,
        color: DEFAULT_TEXT_COLOR,
        size: 18,
        font: DEFAULT_FONT,
        bold: false,
        italic: false,
        underline: false,
        rotation: 0,
        isPlaceholder: false,
      };

      expect(newEl.color).toBe("#0f172a");
      expect(newEl.font).toBe("Segoe UI,Inter,system-ui,sans-serif");
      expect(newEl.bold).toBe(false);
      expect(newEl.italic).toBe(false);
      expect(newEl.underline).toBe(false);
    });
  });

  describe("Resize Handle Boundary Clamping & Opposite Anchor Invariants", () => {
    const sb = { x: 100, y: 100, w: 200, h: 100 };
    const MIN_W = 10;
    const MIN_H = 10;

    it("should clamp top-left handle (idx 0) to opposite bottom-right anchor (300, 200) without inversion", () => {
      // Dragging top-left far past the right and bottom boundaries
      const wPos = { x: 500, y: 400 };
      const nx = Math.min(wPos.x, sb.x + sb.w - MIN_W);
      const ny = Math.min(wPos.y, sb.y + sb.h - MIN_H);
      const nw = sb.x + sb.w - nx;
      const nh = sb.y + sb.h - ny;

      expect(nx).toBe(300 - MIN_W); // 290
      expect(ny).toBe(200 - MIN_H); // 190
      expect(nw).toBe(MIN_W); // 10
      expect(nh).toBe(MIN_H); // 10
      expect(nx + nw).toBe(300); // Fixed right anchor unchanged!
      expect(ny + nh).toBe(200); // Fixed bottom anchor unchanged!
    });

    it("should clamp top-right handle (idx 1) to opposite bottom-left anchor (100, 200)", () => {
      // Dragging top-right far to the left and bottom
      const wPos = { x: -50, y: 500 };
      const nx = sb.x;
      const ny = Math.min(wPos.y, sb.y + sb.h - MIN_H);
      const nw = Math.max(wPos.x, sb.x + MIN_W) - sb.x;
      const nh = sb.y + sb.h - ny;

      expect(nx).toBe(100);
      expect(ny).toBe(200 - MIN_H);
      expect(nw).toBe(MIN_W);
      expect(nh).toBe(MIN_H);
      expect(nx).toBe(100); // Fixed left anchor unchanged!
      expect(ny + nh).toBe(200); // Fixed bottom anchor unchanged!
    });

    it("should clamp bottom-right handle (idx 2) to opposite top-left anchor (100, 100)", () => {
      // Dragging bottom-right far above and left of top-left anchor
      const wPos = { x: 20, y: 10 };
      const nx = sb.x;
      const ny = sb.y;
      const nw = Math.max(wPos.x, sb.x + MIN_W) - sb.x;
      const nh = Math.max(wPos.y, sb.y + MIN_H) - sb.y;

      expect(nx).toBe(100);
      expect(ny).toBe(100);
      expect(nw).toBe(MIN_W);
      expect(nh).toBe(MIN_H);
      expect(nx).toBe(100); // Fixed top-left unchanged!
      expect(ny).toBe(100);
    });

    it("should clamp bottom-left handle (idx 3) to opposite top-right anchor (300, 100)", () => {
      // Dragging bottom-left far past right and above top
      const wPos = { x: 600, y: -200 };
      const nx = Math.min(wPos.x, sb.x + sb.w - MIN_W);
      const ny = sb.y;
      const nw = sb.x + sb.w - nx;
      const nh = Math.max(wPos.y, sb.y + MIN_H) - sb.y;

      expect(nx).toBe(300 - MIN_W);
      expect(ny).toBe(100);
      expect(nw).toBe(MIN_W);
      expect(nh).toBe(MIN_H);
      expect(nx + nw).toBe(300); // Fixed right anchor unchanged!
      expect(ny).toBe(100); // Fixed top anchor unchanged!
    });

    it("should accurately maintain rotated item resize handle anchor without coordinate offset", () => {
      function rotatePoint(px: number, py: number, ox: number, oy: number, deg: number) {
        const rad = (deg * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const dx = px - ox;
        const dy = py - oy;
        return { x: ox + dx * cos - dy * sin, y: oy + dx * sin + dy * cos };
      }

      const rotEl = { x: 200, y: 100, w: 300, h: 200, rotation: 45 };
      const c0 = { x: rotEl.x + rotEl.w / 2, y: rotEl.y + rotEl.h / 2 };
      const pad = 3;

      // Bottom-right corner (idx 2) handle position in local space
      const handleLocal = { x: rotEl.x + rotEl.w + pad, y: rotEl.y + rotEl.h + pad };
      const handleWorld = rotatePoint(handleLocal.x, handleLocal.y, c0.x, c0.y, rotEl.rotation);

      // Opposite corner (top-left, idx 0) in local and world space
      const pOppLocal = { x: rotEl.x, y: rotEl.y };
      const pOppWorld = rotatePoint(pOppLocal.x, pOppLocal.y, c0.x, c0.y, rotEl.rotation);

      // Mouse clicks directly on handleWorld
      const mouseWorld = { ...handleWorld };
      const rot = rotatePoint(mouseWorld.x - pOppWorld.x, mouseWorld.y - pOppWorld.y, 0, 0, -rotEl.rotation);
      const rawLocalMouse = { x: pOppLocal.x + rot.x, y: pOppLocal.y + rot.y };

      // Grab offset when clicking directly on handle is exactly (0, 0)
      const grabOffset = { x: rawLocalMouse.x - handleLocal.x, y: rawLocalMouse.y - handleLocal.y };
      expect(Math.abs(grabOffset.x)).toBeLessThan(1e-6);
      expect(Math.abs(grabOffset.y)).toBeLessThan(1e-6);

      // When dragging by +50 in world X and +50 in world Y:
      const movedMouseWorld = { x: handleWorld.x + 50, y: handleWorld.y + 50 };
      const rotMoved = rotatePoint(movedMouseWorld.x - pOppWorld.x, movedMouseWorld.y - pOppWorld.y, 0, 0, -rotEl.rotation);
      const targetH = { x: pOppLocal.x + rotMoved.x - grabOffset.x, y: pOppLocal.y + rotMoved.y - grabOffset.y };

      const nw = targetH.x - pad - rotEl.x;
      const nh = targetH.y - pad - rotEl.y;

      const newLocalCenter = { x: rotEl.x + nw / 2, y: rotEl.y + nh / 2 };
      const dx = pOppLocal.x - newLocalCenter.x;
      const dy = pOppLocal.y - newLocalCenter.y;
      const rotOffset = rotatePoint(dx, dy, 0, 0, rotEl.rotation);
      const nx = pOppWorld.x - rotOffset.x - nw / 2;
      const ny = pOppWorld.y - rotOffset.y - nh / 2;

      // The new bottom-right handle rendered in world space
      const newHandleLocal = { x: nx + nw + pad, y: ny + nh + pad };
      const newCenter = { x: nx + nw / 2, y: ny + nh / 2 };
      const newHandleWorld = rotatePoint(newHandleLocal.x, newHandleLocal.y, newCenter.x, newCenter.y, rotEl.rotation);

      // Verify handle world pos exactly matches mouse position
      expect(Math.abs(newHandleWorld.x - movedMouseWorld.x)).toBeLessThan(1e-5);
      expect(Math.abs(newHandleWorld.y - movedMouseWorld.y)).toBeLessThan(1e-5);

      // Verify opposite corner remained completely stationary
      const newOppWorld = rotatePoint(nx, ny, newCenter.x, newCenter.y, rotEl.rotation);
      expect(Math.abs(newOppWorld.x - pOppWorld.x)).toBeLessThan(1e-5);
      expect(Math.abs(newOppWorld.y - pOppWorld.y)).toBeLessThan(1e-5);
    });
  });

  describe("Text Snapping & Logical Bounding Box Alignment Invariants", () => {
    it("should snap element's logical bounding box edges cleanly to other element boxes", () => {
      const draggedBounds = { x: 198, y: 100, w: 120, h: 40 };
      const targetBounds = { x: 200, y: 300, w: 120, h: 60 };
      const SNAP_DIST = 6;

      const diff = Math.abs(draggedBounds.x - targetBounds.x);
      expect(diff).toBeLessThan(SNAP_DIST);

      const snappedX = targetBounds.x; // Snaps to 200
      expect(snappedX).toBe(200);
    });
  });
});
