#!/usr/bin/env node
// Vendors skills from the upstream coder/skills repository into
// plugins/coder/skills/. Run manually when bumping the pin: update `pin`
// in sync-skills-vendor.json, run this script, then commit both together.
//
// Usage:
//   node .github/scripts/sync-skills.mjs
//
// Steps:
//   1. Read sync-skills-vendor.json for the repo, ref, and paths.
//   2. Download the tarball from codeload.github.com (public, no auth).
//   3. Extract it into a temp directory.
//   4. Replace each listed path under plugins/coder/, removing the previous
//      copy first so stale files never survive a sync.
//
// The pin is the single source of truth. There is no runtime override.

import { promises as fs, createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const pluginDir = path.join(repoRoot, "plugins", "coder");
const vendorFile = path.join(scriptDir, "sync-skills-vendor.json");

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function downloadTarball(repo, ref, destPath) {
  const url = `https://codeload.github.com/${repo}/tar.gz/${encodeURIComponent(ref)}`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Could not download ${repo}@${ref} (HTTP ${res.status})`);
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(destPath));
  console.log(`  fetched ${url}`);
}

// GitHub tarballs contain exactly one top-level directory named after the
// repo and ref. Return it so callers know where the tree lives.
async function extractTarball(tarballPath, intoDir) {
  await fs.mkdir(intoDir, { recursive: true });
  const result = spawnSync("tar", ["-xzf", tarballPath, "-C", intoDir], {
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`tar exited with status ${result.status}`);
  }
  const [topLevel] = await fs.readdir(intoDir);
  return path.join(intoDir, topLevel);
}

async function copyPath(fromDir, toDir, relativePath) {
  const from = path.join(fromDir, relativePath);
  const to = path.join(toDir, relativePath);
  if (!(await fileExists(from))) {
    throw new Error(`path missing in upstream tarball: ${relativePath}`);
  }
  await fs.rm(to, { recursive: true, force: true });
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.cp(from, to, { recursive: true });
  console.log(`  ${relativePath} -> ${path.relative(repoRoot, to)}`);
}

async function main() {
  const vendor = JSON.parse(await fs.readFile(vendorFile, "utf8"));
  const { repo, pin, paths } = vendor;
  if (!repo || !pin || !Array.isArray(paths) || paths.length === 0) {
    throw new Error(`${vendorFile} must define repo, pin, and a non-empty paths array`);
  }

  console.log(`Syncing ${repo}@${pin}`);
  const workDir = await fs.mkdtemp(path.join(tmpdir(), "coder-skills-sync-"));
  try {
    const tarball = path.join(workDir, "upstream.tar.gz");
    await downloadTarball(repo, pin, tarball);
    const extracted = await extractTarball(tarball, path.join(workDir, "extract"));
    for (const relativePath of paths) {
      await copyPath(extracted, pluginDir, relativePath);
    }
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
  console.log("Done. Review the diff, bump the plugin version, and commit.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
