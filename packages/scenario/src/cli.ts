#!/usr/bin/env node
import path from 'node:path';
import { validateScenarios } from './load.js';

async function main() {
  const arg = process.argv[2] ?? './content';
  const contentDir = path.resolve(process.cwd(), arg);
  const result = await validateScenarios(contentDir);

  let pass = 0;
  let fail = 0;
  for (const op of result.operations) {
    const tag = op.ok ? 'PASS' : 'FAIL';
    const file = path.join('operations', op.id);
    console.log(`${tag} ${file}`);
    if (op.ok) pass++;
    else fail++;
  }
  for (const t of result.tracks) {
    const tag = t.ok ? 'PASS' : 'FAIL';
    const file = 'tracks.json';
    console.log(`${tag} ${file} (track ${t.id})`);
    if (t.ok) pass++;
    else fail++;
  }
  if (result.issues.length > 0) {
    console.log('\nIssues:');
    for (const i of result.issues) {
      console.log(`  [${i.severity.toUpperCase()}] ${i.file}: ${i.message}`);
    }
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(result.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
