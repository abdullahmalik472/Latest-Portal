/**
 * Fails if any relative import points to a file that does not exist.
 *
 * Why: after renaming a file from .js to .ts, `tsc` still accepts the old "./x.js" import
 * (TypeScript maps .js to .ts), but Node crashes on start with ERR_MODULE_NOT_FOUND.
 * This check needs no .env and no database, so it is safe to run in a pre-commit hook.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const folders = ["src", "database", "scripts"];

// import x from "./a.js" | export { y } from "./b.ts" | import "./c.js" | import("./d.js")
const IMPORT = /(?:from\s*|import\s*\(?\s*)["'](\.{1,2}\/[^"']+)["']/g;

function* sourceFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* sourceFiles(path);
    else if (/\.(js|mjs|ts)$/.test(name)) yield path;
  }
}

const broken: string[] = [];
for (const folder of folders) {
  const dir = join(root, folder);
  if (!existsSync(dir)) continue;
  for (const file of sourceFiles(dir)) {
    // Remove comments first, so example imports written in comments are not checked.
    const code = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const match of code.matchAll(IMPORT)) {
      const target = resolve(dirname(file), match[1]);
      if (!existsSync(target)) broken.push(`${relative(root, file)} imports "${match[1]}", which does not exist`);
    }
  }
}

if (broken.length) {
  console.error(`Broken imports (Node would crash on start):\n  ${broken.join("\n  ")}`);
  process.exit(1);
}
console.log("imports OK");
