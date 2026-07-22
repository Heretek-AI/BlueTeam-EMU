import { getDb, withPersistence } from './db.js';
import { clearAllData } from '@blueteam-emu/browser-db';

const LOCAL_USER_ID = 'local';

export interface LocalUser {
  id: string;
  displayName: string;
  createdAt: number;
}

export async function ensureLocalUser(): Promise<LocalUser> {
  return withPersistence(async (h) => {
    const res = h.exec(`SELECT id, display_name, created_at FROM users WHERE id = ?`, [
      LOCAL_USER_ID
    ]);
    if (res.length > 0 && res[0]!.values.length > 0) {
      const row = res[0]!.values[0]!;
      return { id: row[0] as string, displayName: row[1] as string, createdAt: row[2] as number };
    }
    const name = localStorage.getItem('blueteam-emu:display-name') ?? process.env.BLUETEAM_EMU_USER ?? 'analyst';
    const now = Date.now();
    h.run(`INSERT INTO users (id, display_name, created_at) VALUES (?, ?, ?)`, [
      LOCAL_USER_ID,
      String(name).slice(0, 64),
      now
    ]);
    return { id: LOCAL_USER_ID, displayName: String(name).slice(0, 64), createdAt: now };
  });
}

export async function getLocalUser(): Promise<LocalUser | null> {
  const h = await getDb();
  const res = h.db.exec(`SELECT id, display_name, created_at FROM users WHERE id = ?`, [
    LOCAL_USER_ID
  ]);
  if (res.length === 0 || res[0]!.values.length === 0) return null;
  const row = res[0]!.values[0]!;
  return { id: row[0] as string, displayName: row[1] as string, createdAt: row[2] as number };
}

export async function setLocalDisplayName(name: string): Promise<void> {
  const trimmed = name.trim().slice(0, 64);
  if (trimmed.length === 0) throw new Error('display name cannot be empty');
  localStorage.setItem('blueteam-emu:display-name', trimmed);
  await withPersistence(async (h) => {
    h.run(`UPDATE users SET display_name = ? WHERE id = ?`, [trimmed, LOCAL_USER_ID]);
  });
}

const PAT_KEY = 'blueteam-emu:github-pat';

export function getGithubPat(): string | null {
  return localStorage.getItem(PAT_KEY);
}

export function setGithubPat(token: string): void {
  localStorage.setItem(PAT_KEY, token.trim());
}

export function clearGithubPat(): void {
  localStorage.removeItem(PAT_KEY);
}

export async function resetAllLocalData(): Promise<void> {
  clearGithubPat();
  localStorage.removeItem('blueteam-emu:display-name');
  await clearAllData({ wasmUrl: '/BlueTeam-EMU/sql-wasm.wasm' });
}
