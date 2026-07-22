import { initDb, persistDb as browserPersistDb } from '@blueteam-emu/browser-db';
import type { DbHandle } from '@blueteam-emu/browser-db';

/** Wasm URL: in production use the /BlueTeam-EMU base, in dev use the raw path. */
const WASM_URL =
  typeof window !== 'undefined' && window.location.pathname.startsWith('/BlueTeam-EMU')
    ? '/BlueTeam-EMU/sql-wasm.wasm'
    : '/sql-wasm.wasm';

let dbHandle: DbHandle | undefined;

// --- Hydration signaling ---
// startHydration() creates a pending Promise.
// markHydrationDone() resolves it.
// waitForHydration() blocks until it resolves.
let hydrationResolve: (() => void) | null = null;

/** Call at the start of initApp() to create the pending hydration gate. */
export function startHydration(): void {
  hydrationResolve = null; // reset any prior resolve
}

/** Call after hydration completes to unblock all waiters. */
export function markHydrationDone(): void {
  if (hydrationResolve) hydrationResolve();
}

/** Wait for initApp() to call markHydrationDone(). */
export async function waitForHydration(): Promise<void> {
  if (!hydrationResolve) return; // no hydration started yet — skip
  await new Promise<void>((resolve) => {
    hydrationResolve = resolve;
  });
}
