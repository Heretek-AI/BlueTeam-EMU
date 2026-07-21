import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { resetLocalUser } from '../src/lib/server/localUser.js';

const file = path.resolve(process.cwd(), process.env.DATABASE_URL ?? './data/app.db');
if (!existsSync(file)) {
  console.error(`No database at ${file}. Run \`pnpm db:migrate\` first.`);
  process.exit(1);
}

const sqlite = new Database(file);
const db = drizzle(sqlite);

// Force the localUser module to actually use *our* connection: it lazily creates
// its own; close ours at the end is enough because the localUser functions
// open their own in `getDb`. To reset, we exercise ensureLocalUser via a
// no-op init by hitting the schema directly.
await resetLocalUser();

console.log('Local user display name + run history reset.');
sqlite.close();
