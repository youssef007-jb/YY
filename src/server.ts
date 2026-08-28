import "./lib/error-capture";

// Polyfill DOMMatrix for Node SSR environments in case any graphics or bundle module references it
if (typeof (globalThis as unknown as { DOMMatrix?: unknown })["DOMMatrix"] === "undefined") {
  class DOMMatrixMock {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    m11 = 1; m12 = 0; m13 = 0; m14 = 0;
    m21 = 0; m22 = 1; m23 = 0; m24 = 0;
    m31 = 0; m32 = 0; m33 = 1; m34 = 0;
    m41 = 0; m42 = 0; m43 = 0; m44 = 1;
    is2D = true;
    isIdentity = true;
    constructor(_init?: unknown) {}
    multiply() { return this; }
    translate() { return this; }
    scale() { return this; }
    rotate() { return this; }
    transformPoint(point?: { x?: number; y?: number; z?: number; w?: number }) {
      return point ?? { x: 0, y: 0, z: 0, w: 1 };
    }
    inverse() { return this; }
    setMatrixValue() { return this; }
  }
  (globalThis as unknown as Record<string, unknown>)["DOMMatrix"] = DOMMatrixMock;
  (globalThis as unknown as Record<string, unknown>)["DOMMatrixReadOnly"] = DOMMatrixMock;
}

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { convertWhiteboardImage } from "./server/image-converter";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);

      if (url.pathname === "/api/convert-whiteboard-image" && request.method === "POST") {
        try {
          const body = (await request.json()) as {
            imageBase64?: string;
            mimeType?: string;
            width?: number;
            height?: number;
          };
          if (!body.imageBase64) {
            return new Response(JSON.stringify({ error: "Missing imageBase64 in request body" }), {
              status: 400,
              headers: { "content-type": "application/json" },
            });
          }
          const result = await convertWhiteboardImage({
            imageBase64: body.imageBase64,
            mimeType: body.mimeType || "image/png",
            width: Number(body.width) || 1200,
            height: Number(body.height) || 800,
          });
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        } catch (apiErr) {
          const errMsg = apiErr instanceof Error ? apiErr.message : "Image conversion failed";
          console.error("Image conversion API error:", apiErr);
          return new Response(JSON.stringify({ error: errMsg }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
