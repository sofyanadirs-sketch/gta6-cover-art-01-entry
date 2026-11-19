// main.ts — hands this entry in: copies app/ and screenshots/ to the
// output directory and writes dossier.json with buildDossier from the
// kit's vendor/makefun-app.ts. Node 22 standard library only; no network.
// Run: MAKEFUN_OUTPUT_DIR=out node main.ts   (defaults to /output)

import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
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

/** Remove a directory tree when it exists, ignoring a missing one. */
function cleanDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
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
