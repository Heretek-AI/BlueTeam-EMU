import 'dotenv/config';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';

const url = process.env.DATABASE_URL ?? './data/app.db';
const file = path.resolve(process.cwd(), url);
mkdirSync(path.dirname(file), { recursive: true });

const sqlite = new Database(file);
sqlite.pragma('journal_mode = WAL');
const db = drizzle(sqlite);

const migrationsFolder = path.resolve(process.cwd(), 'drizzle');
if (!existsSync(migrationsFolder)) {
  console.error(`No migrations folder at ${migrationsFolder}. Run \`pnpm db:generate\` first.`);
  process.exit(1);
}

migrate(db, { migrationsFolder });
console.log(`Migrations applied to ${file}`);
sqlite.close();
