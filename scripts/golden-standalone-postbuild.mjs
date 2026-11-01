import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const dist = resolve(process.cwd(), "dist-golden-standalone");
const entry = resolve(dist, "golden-standalone.html");
if (!existsSync(entry)) throw new Error("The Golden Report standalone build did not produce its entrypoint.");
copyFileSync(entry, resolve(dist, "index.html"));
console.log("Golden Report standalone is ready in dist-golden-standalone/ (index.html + assets).");
