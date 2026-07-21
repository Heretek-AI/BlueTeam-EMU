import { getDb } from '$lib/server/db/client.js';
import { tracks } from '$lib/server/db/schema.js';

export const load = async () => {
  const db = getDb();
  const rows = await db.select().from(tracks);
  return { tracks: rows };
};
