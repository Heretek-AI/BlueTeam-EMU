import { getDb, persistDb } from './db.js';

let initialized = false;

/**
 * One-time app bootstrap: initialize the database, ensure the local user
 * exists, and hydrate scenario content from bundled static files.
 */
export async function initApp(): Promise<void> {
  if (initialized) return;
  initialized = true;

  await getDb(); // initializes sql.js
  await ensureLocalUser();

  const { hydrateContent } = await import('./content-loader.js');
  await hydrateContent();
  await persistDb(); // explicit persist after hydration
}

async function ensureLocalUser() {
  const { ensureLocalUser } = await import('./localUser.js');
  await ensureLocalUser();
}
