import { AppDataSchema, type AppData } from '../domain/model';
export const STORAGE_KEY = 'pickleball-iq-alpha-v1';
export function parseBackup(raw: string): AppData {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw Error('Backup is not valid JSON.');
  }
  const parsed = AppDataSchema.safeParse(value);
  if (!parsed.success) throw Error(`Backup validation failed: ${parsed.error.issues[0]?.message}`);
  return parsed.data;
}
export class LocalRepository {
  load(): AppData {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { schemaVersion: 1, players: [], events: [] };
    return parseBackup(raw);
  }
  save(data: AppData) {
    const checked = AppDataSchema.parse(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
  }
  clear() {
    localStorage.removeItem(STORAGE_KEY);
  }
}
export function exportBackup(data: AppData) {
  return JSON.stringify(AppDataSchema.parse(data), null, 2);
}
