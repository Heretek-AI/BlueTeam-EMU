import type { Handle } from '@sveltejs/kit';
import { ensureLocalUser } from '$lib/server/localUser.js';

let bootstrapped: Promise<void> | null = null;

function bootstrap(): Promise<void> {
  if (!bootstrapped) bootstrapped = ensureLocalUser().then(() => undefined);
  return bootstrapped;
}

export const handle: Handle = async ({ event, resolve }) => {
  await bootstrap();
  event.locals.userId = 'local';
  return resolve(event);
};
