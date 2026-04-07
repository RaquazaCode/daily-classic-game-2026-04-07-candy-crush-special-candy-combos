import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "dist");

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(path.join(outDir, "src"), { recursive: true });
fs.mkdirSync(path.join(outDir, "assets"), { recursive: true });

for (const file of ["index.html", "src/main.js", "src/game-core.js", "src/styles.css", "assets/favicon.svg"]) {
  const source = path.join(root, file);
  const target = path.join(outDir, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

console.log(`Built static bundle in ${outDir}`);
