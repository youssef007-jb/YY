// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";

function apiMiddlewarePlugin(): Plugin {
  return {
    name: "api-middleware-plugin",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || "";
        if (url.startsWith("/api/convert-whiteboard-image") && req.method === "POST") {
          try {
            const chunks: Buffer[] = [];
            req.on("data", (chunk: Buffer) => chunks.push(chunk));
            req.on("end", async () => {
              try {
                const bodyStr = Buffer.concat(chunks).toString("utf-8");
                const body = JSON.parse(bodyStr || "{}");
                if (!body.imageBase64) {
                  res.setHeader("Content-Type", "application/json");
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: "Missing imageBase64 in request body" }));
                  return;
                }
                const { convertWhiteboardImage } = await import("./src/server/image-converter");
                const result = await convertWhiteboardImage({
                  imageBase64: body.imageBase64,
                  mimeType: body.mimeType || "image/png",
                  width: Number(body.width) || 1200,
                  height: Number(body.height) || 800,
                });
                res.setHeader("Content-Type", "application/json");
                res.statusCode = 200;
                res.end(JSON.stringify(result));
              } catch (apiErr: any) {
                console.error("Image conversion API error:", apiErr);
                const errMsg = apiErr?.message || "Image conversion failed";
                res.setHeader("Content-Type", "application/json");
                res.statusCode = 500;
                res.end(JSON.stringify({ error: errMsg }));
              }
            });
            req.on("error", (err) => {
              console.error("Request stream error:", err);
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 500;
              res.end(JSON.stringify({ error: "Failed to read request body" }));
            });
          } catch (err: any) {
            console.error("API handler error:", err);
            res.setHeader("Content-Type", "application/json");
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err?.message || "Internal server error" }));
          }
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [apiMiddlewarePlugin()],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
