/**
 * Hydration gate: coordinates initApp() completion with page queries.
 *
 * initApp() calls startHydration() at the start and markHydrationDone()
 * at the end. Pages call waitForHydration() before querying.
 *
 * Uses a queue of resolvers so multiple waiters are all unblocked.
 */

let done = false;
let resolvers: Array<() => void> = [];

/** Call at the start of initApp() to reset the gate. */
export function startHydration(): void {
  done = false;
  resolvers = [];
}

/** Call after hydration completes to unblock all waiters. */
export function markHydrationDone(): void {
  done = true;
  for (const r of resolvers) r();
  resolvers = [];
}

/** Wait for initApp() to call markHydrationDone(). Returns immediately if already done. */
export async function waitForHydration(): Promise<void> {
  if (done) return;
  return new Promise<void>((resolve) => {
    resolvers.push(resolve);
  });
}
