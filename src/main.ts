import "@awesome.me/webawesome/dist/styles/webawesome.css";
import { registerIconLibrary } from "@awesome.me/webawesome/dist/components/icon/library.js";
import "./components";

const iconModules = import.meta.glob("./assets/icons/*.svg", {
  as: "raw",
  eager: true,
});

const iconMap = new Map<string, string>();
for (const [path, svg] of Object.entries(iconModules)) {
  const match = path.match(/\/([\w-]+)\.svg$/);
  if (match) {
    iconMap.set(match[1], svg as string);
  }
}

registerIconLibrary("app", {
  resolver: (name) => {
    const svg = iconMap.get(name);
    if (!svg) {
      console.warn(`Icon "${name}" not found in app library.`);
      return "";
    }
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  },
});
