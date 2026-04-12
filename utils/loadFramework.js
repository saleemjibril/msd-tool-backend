import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

let cached = null;

export function loadFramework() {
  if (cached) return cached;
  const path = join(__dirname, "..", "framework", "ikore-1.0.json");
  const raw = readFileSync(path, "utf8");
  cached = JSON.parse(raw);
  return cached;
}

export function getFrameworkVersion() {
  return loadFramework().version;
}
