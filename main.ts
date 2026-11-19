// main.ts — hands this entry in: copies app/ and screenshots/ to the
// output directory and writes dossier.json with buildDossier from the
// kit's vendor/makefun-app.ts. Node 22 standard library only; no network.
// Run: MAKEFUN_OUTPUT_DIR=out node main.ts   (defaults to /output)

import { chmodSync, cpSync, lstatSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR || '/output';

/** The gate's caps for this bounty, from the kit's RULES.txt. */
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
  app_path_max_bytes: 1000,
};

/**
 * Make a tree owner-writable (files 0644, directories 0755), skipping
 * symlinks. cpSync preserves the repo's modes, so a copied tree can be
 * read-only, and a read-only directory cannot have its entries removed.
 */
function makeWritable(path: string): void {
  const st = lstatSync(path);
  if (st.isSymbolicLink()) return;
  if (st.isDirectory()) {
    chmodSync(path, 0o755);
    for (const entry of readdirSync(path)) makeWritable(join(path, entry));
  } else {
    chmodSync(path, 0o644);
  }
}

/** Remove one entry, retrying once after making it writable. */
function removeEntry(path: string): void {
  try {
    rmSync(path, { recursive: true, force: true });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== 'EACCES' && code !== 'EPERM') throw err;
    makeWritable(path);
    rmSync(path, { recursive: true, force: true });
  }
}

/**
 * Empty a directory without removing the directory itself.
 * The grader mounts the output directory at MAKEFUN_OUTPUT_DIR (a bind
 * mount at /output), and a mount point cannot be removed (rmdir fails
 * with EBUSY/EACCES), so rmSync'ing the directory itself always threw
 * and main.ts exited 1. Clearing only the entries inside works on a
 * mount point and on a plain directory alike.
 */
function cleanDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
  for (const entry of readdirSync(dir)) {
    removeEntry(join(dir, entry));
  }
}

/** Copy a directory tree from the repo into the output directory. */
function copyTree(name: string): void {
  const from = join(REPO_ROOT, name);
  const to = join(OUTPUT_DIR, name);
  cpSync(from, to, { recursive: true });
  console.log(`copied ${name}/ -> ${to}`);
}

/** Build the entry: copy the app and screenshots, then write the dossier. */
function buildEntry(): void {
  cleanDir(OUTPUT_DIR);
  copyTree('app');
  copyTree('screenshots');
  const dossier = buildDossier(OUTPUT_DIR, DOSSIER_CAPS);
  const dossierPath = join(OUTPUT_DIR, 'dossier.json');
  writeFileSync(dossierPath, dossier);
  console.log(`wrote ${dossierPath} (${dossier.length} bytes)`);
  console.log(`entry ready in ${OUTPUT_DIR}`);
}

buildEntry();
