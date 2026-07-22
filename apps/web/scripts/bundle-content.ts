#!/usr/bin/env tsx
/**
 * Bundles validated content from the repo's `content/` directory into
 * `apps/web/static/content/` for static serving.
 *
 * Run by `pnpm prebuild` in apps/web.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const CONTENT_SRC = path.resolve(ROOT, '../../content');
const STATIC_DST = path.resolve(ROOT, 'static/content');

async function main() {
  // 1. Validate scenarios first
  const result = execSync('pnpm --filter @blueteam-emu/scenario exec tsx src/cli.ts ../../content', {
    cwd: path.join(ROOT),
    stdio: 'inherit'
  });

  // 2. Clean & copy
  await fs.rm(STATIC_DST, { recursive: true, force: true });
  await fs.cp(CONTENT_SRC, STATIC_DST, { recursive: true });

  // 3. Copy sql-wasm.wasm for browsers
  const wasmSrc = path.resolve(
    ROOT,
    '../../node_modules/.pnpm',
    (await fs.readdir(path.resolve(ROOT, '../../node_modules/.pnpm')))
      .find((d) => d.startsWith('sql.js@'))!,
    'node_modules/sql.js/dist/sql-wasm.wasm'
  );
  const wasmDst = path.resolve(ROOT, 'static/sql-wasm.wasm');
  await fs.cp(wasmSrc, wasmDst);
}

main().catch((err) => {
  console.error('bundle-content failed:', err);
  process.exit(1);
});
