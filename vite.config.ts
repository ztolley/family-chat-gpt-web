import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import checker from "vite-plugin-checker";
import { viteStaticCopy } from "vite-plugin-static-copy";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = env.VITE_BASE ? env.VITE_BASE : "/";
  const host = env.VITE_HOST ? env.VITE_HOST : "localhost";
  const port = env.VITE_PORT ? Number(env.VITE_PORT) : 5173;

  return {
    base,
    build: {
      target: ["chrome139"],
    },
    plugins: [
      checker({
        typescript: {
          buildMode: true,
        },
        eslint: {
          lintCommand: "eslint . --ext .ts,.tsx",
          useFlatConfig: true,
        },
      }),
      viteStaticCopy({
        targets: [
          {
            src: "node_modules/@awesome.me/webawesome/dist",
            dest: "webawesome",
          },
        ],
      }),
    ],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      host,
      port,
      proxy: {
        "/api": {
          changeOrigin: true,
          secure: false,
          target: "http://localhost:3000",
        },
        "/auth": {
          changeOrigin: true,
          secure: false,
          target: "http://localhost:3000",
        },
        "/config": {
          changeOrigin: true,
          secure: false,
          target: "http://localhost:3000",
        },
      },
    },
  };
});
