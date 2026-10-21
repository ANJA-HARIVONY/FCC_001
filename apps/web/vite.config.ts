import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const flaskStatic = path.join(root, "presentation/static");

export default defineConfig({
  plugins: [
    react(),
    {
      name: "fcc-flask-static",
      configureServer(server) {
        server.middlewares.use("/static", (req, res, next) => {
          const relative = (req.url ?? "/").split("?")[0].replace(/^\/+/, "");
          const file = path.normalize(path.join(flaskStatic, relative));
          if (!file.startsWith(flaskStatic) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
            next();
            return;
          }
          const stream = fs.createReadStream(file);
          if (file.endsWith(".css")) {
            res.setHeader("Content-Type", "text/css");
          } else if (file.endsWith(".png")) {
            res.setHeader("Content-Type", "image/png");
          } else if (file.endsWith(".svg")) {
            res.setHeader("Content-Type", "image/svg+xml");
          } else if (file.endsWith(".js")) {
            res.setHeader("Content-Type", "application/javascript");
          }
          stream.pipe(res);
        });
      },
    },
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": process.env.FCC_API_PROXY ?? "http://localhost:4000",
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test-setup.ts",
    globals: true,
  },
});
