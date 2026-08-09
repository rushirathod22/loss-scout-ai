import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: {
    inlineDynamicImports: true,
    preset: "vercel",
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});
