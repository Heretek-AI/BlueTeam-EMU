import { json, error } from '@sveltejs/kit';
import { getLocalUser, setLocalDisplayName } from '$lib/server/localUser.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async () => {
  const u = await getLocalUser();
  if (!u) throw error(500, 'local user missing');
  return json({ id: u.id, displayName: u.displayName });
};

export const PUT: RequestHandler = async ({ request }) => {
  const body = (await request.json()) as { displayName?: string };
  if (!body.displayName || typeof body.displayName !== 'string') {
    throw error(400, 'displayName required');
  }
  await setLocalDisplayName(body.displayName);
  const u = await getLocalUser();
  return json({ id: u!.id, displayName: u!.displayName });
};
