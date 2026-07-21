import { json, error } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { getDb } from '$lib/server/db/client.js';
import { savedSearches } from '$lib/server/db/schema.js';

const CAP = 50;

export const GET: RequestHandler = async ({ locals }) => {
  const db = getDb();
  const rows = await db
    .select()
    .from(savedSearches)
    .where(eq(savedSearches.userId, locals.userId));
  return json({ searches: rows });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const body = (await request.json()) as { name?: string; query?: unknown };
  if (!body.name) throw error(400, 'name required');
  const db = getDb();
  const existing = await db
    .select()
    .from(savedSearches)
    .where(eq(savedSearches.userId, locals.userId));
  if (existing.length >= CAP) throw error(400, 'saved search cap reached');

  const id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  await db.insert(savedSearches).values({
    id,
    userId: locals.userId,
    name: body.name.slice(0, 80),
    query: JSON.stringify(body.query ?? {}),
    lastRunAt: Date.now()
  });
  return json({ id });
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
  const id = url.searchParams.get('id');
  if (!id) throw error(400, 'id required');
  const db = getDb();
  await db
    .delete(savedSearches)
    .where(and(eq(savedSearches.userId, locals.userId), eq(savedSearches.id, id)));
  return json({ ok: true });
};
