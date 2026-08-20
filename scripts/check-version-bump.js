#!/usr/bin/env node
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function semverParts(v) {
  return v.split("-")[0].split(".").map(Number);
}

function isGreater(a, b) {
  const [aMaj, aMin, aPat] = semverParts(a);
  const [bMaj, bMin, bPat] = semverParts(b);
  if (aMaj !== bMaj) return aMaj > bMaj;
  if (aMin !== bMin) return aMin > bMin;
  return aPat > bPat;
}

function getPublishedVersion(name) {
  try {
    return execSync(`npm view ${name} version`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch (err) {
    const msg = err.stderr?.toString() || err.message || "";
    if (/E404|is not in this registry/i.test(msg)) {
      return null;
    }
    throw err;
  }
}

function checkPackage(pkgPath) {
  const pkgJsonPath = path.join(process.cwd(), pkgPath, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
  const localVersion = pkg.version;
  const publishedVersion = getPublishedVersion(pkg.name);

  if (publishedVersion === null) {
    console.log(
      `[${pkg.name}] not yet published — local version ${localVersion} is fine.`,
    );
    return true;
  }

  if (localVersion === publishedVersion) {
    console.error(
      `[${pkg.name}] NOT bumped: package.json (${localVersion}) matches npm (${publishedVersion}).`,
    );
    return false;
  }

  if (!isGreater(localVersion, publishedVersion)) {
    console.error(
      `[${pkg.name}] version error: package.json (${localVersion}) is not greater than npm (${publishedVersion}).`,
    );
    return false;
  }

  console.log(`[${pkg.name}] OK: ${publishedVersion} -> ${localVersion}`);
  return true;
}

const targets = process.argv.slice(2);

if (targets.length === 0) {
  console.error(
    "Usage: node scripts/check-version-bump.js <path-to-package> [<path-to-package> ...]",
  );
  process.exit(1);
}

let allOk = true;
for (const target of targets) {
  try {
    const ok = checkPackage(target);
    allOk = allOk && ok;
  } catch (err) {
    console.error(`[${target}] error while checking: ${err.message}`);
    allOk = false;
  }
}

process.exit(allOk ? 0 : 1);
