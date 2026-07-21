import { eq } from 'drizzle-orm';
import { getDb } from './db/client.js';
import { users } from './db/schema.js';

const LOCAL_USER_ID = 'local';

export async function ensureLocalUser(): Promise<{ id: string; displayName: string }> {
  const db = getDb();
  const existing = await db.select().from(users).where(eq(users.id, LOCAL_USER_ID));
  if (existing.length > 0) {
    return { id: LOCAL_USER_ID, displayName: existing[0]!.displayName };
  }
  const displayName = (process.env.BLUETEAM_EMU_USER ?? 'analyst').slice(0, 64);
  await db.insert(users).values({
    id: LOCAL_USER_ID,
    displayName,
    createdAt: Date.now()
  });
  return { id: LOCAL_USER_ID, displayName };
}

export async function getLocalUser() {
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.id, LOCAL_USER_ID));
  if (rows.length === 0) return null;
  return rows[0]!;
}

export async function setLocalDisplayName(displayName: string): Promise<void> {
  const db = getDb();
  const trimmed = displayName.trim().slice(0, 64);
  if (trimmed.length === 0) throw new Error('display name cannot be empty');
  await db
    .update(users)
    .set({ displayName: trimmed })
    .where(eq(users.id, LOCAL_USER_ID));
}

export async function resetLocalUser(): Promise<void> {
  const db = getDb();
  const displayName = (process.env.BLUETEAM_EMU_USER ?? 'analyst').slice(0, 64);
  await db.delete(users).where(eq(users.id, LOCAL_USER_ID));
  await db.insert(users).values({
    id: LOCAL_USER_ID,
    displayName,
    createdAt: Date.now()
  });
}
