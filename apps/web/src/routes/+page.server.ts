import { getDb } from '$lib/server/db/client.js';
import { trackCompletions, operations, trackOperations, tracks } from '$lib/server/db/schema.js';
import { sql } from 'drizzle-orm';

export const load = async () => {
  const db = getDb();
  const opCount = await db
    .select({ c: sql<number>`count(*)` })
    .from(operations);
  const trackCount = await db.select({ c: sql<number>`count(*)` }).from(tracks);
  const completionCount = await db
    .select({ c: sql<number>`count(*)` })
    .from(trackCompletions);
  return {
    opCount: opCount[0]?.c ?? 0,
    trackCount: trackCount[0]?.c ?? 0,
    completionCount: completionCount[0]?.c ?? 0
  };
};
