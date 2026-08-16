import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Dev server config. API calls are proxied to the Express process in web/server so
 * the browser talks to one origin, which keeps the private key and every paid
 * Shelby call on the server side where they belong.
 */
const API_PORT = Number(process.env.VAULT_API_PORT ?? 8787);

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            "/api": {
                target: `http://localhost:${API_PORT}`,
                changeOrigin: true,
            },
        },
    },
    build: {
        outDir: "dist",
        // Source maps make a failing demo diagnosable without a rebuild.
        sourcemap: true,
    },
});
