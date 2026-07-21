import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sql } from 'drizzle-orm';
import path from 'node:path';
import { existsSync } from 'node:fs';

const file = path.resolve(process.cwd(), process.env.DATABASE_URL ?? './data/app.db');
if (!existsSync(file)) {
  console.error(`No database at ${file}. Run \`pnpm db:migrate\` first.`);
  process.exit(1);
}
const sqlite = new Database(file);
sqlite.pragma('journal_mode = WAL');
const db = drizzle(sqlite);

// M3's MITRE table; matches packages/scenario/src/mitre.ts.
const TECHNIQUES: { id: string; name: string; tactic: string }[] = [
  { id: 'T1566', name: 'Phishing', tactic: 'initial-access' },
  { id: 'T1566.001', name: 'Spearphishing Attachment', tactic: 'initial-access' },
  { id: 'T1566.002', name: 'Spearphishing Link', tactic: 'initial-access' },
  { id: 'T1059', name: 'Command and Scripting Interpreter', tactic: 'execution' },
  { id: 'T1059.001', name: 'PowerShell', tactic: 'execution' },
  { id: 'T1543', name: 'Create or Modify System Process', tactic: 'persistence' },
  { id: 'T1078', name: 'Valid Accounts', tactic: 'defense-evasion' },
  { id: 'T1070', name: 'Indicator Removal', tactic: 'defense-evasion' },
  { id: 'T1490', name: 'Inhibit System Recovery', tactic: 'impact' },
  { id: 'T1110', name: 'Brute Force', tactic: 'credential-access' },
  { id: 'T1110.001', name: 'Password Guessing', tactic: 'credential-access' },
  { id: 'T1558', name: 'Steal or Forge Kerberos Tickets', tactic: 'credential-access' },
  { id: 'T1558.003', name: 'Kerberoasting', tactic: 'credential-access' },
  { id: 'T1018', name: 'Remote System Discovery', tactic: 'discovery' },
  { id: 'T1021', name: 'Remote Services', tactic: 'lateral-movement' },
  { id: 'T1021.001', name: 'Remote Desktop Protocol', tactic: 'lateral-movement' },
  { id: 'T1071', name: 'Application Layer Protocol', tactic: 'command-and-control' },
  { id: 'T1041', name: 'Exfiltration Over C2 Channel', tactic: 'exfiltration' },
  { id: 'T1486', name: 'Data Encrypted for Impact', tactic: 'impact' },
  { id: 'T1657', name: 'Financial Theft', tactic: 'impact' },
  { id: 'T1005', name: 'Data from Local System', tactic: 'collection' },
  { id: 'T1003', name: 'OS Credential Dumping', tactic: 'credential-access' }
];

await db.run(sql`DELETE FROM mitre_techniques`);
for (const t of TECHNIQUES) {
  await db.run(
    sql`INSERT INTO mitre_techniques (id, name, tactic) VALUES (${t.id}, ${t.name}, ${t.tactic})`
  );
}
console.log(`Seeded ${TECHNIQUES.length} MITRE techniques.`);
sqlite.close();
