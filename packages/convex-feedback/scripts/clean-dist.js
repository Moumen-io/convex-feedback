import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDirectory = path.dirname(fileURLToPath(import.meta.url));
const distDirectory = path.resolve(packageDirectory, "../dist");

fs.rmSync(distDirectory, { force: true, recursive: true });
