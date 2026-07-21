import { getDb } from '$lib/server/db/client.js';
import { operations } from '$lib/server/db/schema.js';

export const load = async () => {
  const db = getDb();
  const rows = await db.select().from(operations);
  return { operations: rows };
};
