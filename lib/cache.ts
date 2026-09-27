import { promises as fs } from 'node:fs';
import path from 'node:path';

// A small JSON-file cache so re-opening the page or re-planning doesn't spend
// Groq/Hindsight credits. Hard refresh in the UI bypasses it.
//
// Local: .cache/foresight.json. Serverless hosts only allow writes to /tmp, so
// there it starts from the bundled snapshot (data/demo-cache.json, made with
// `npm run cache:snapshot`) and writes to /tmp.

type Entry = { value: unknown; savedAt: string };
type Store = Record<string, Entry>;

const FILE = process.env.CACHE_FILE ?? (process.env.VERCEL ? '/tmp/foresight-cache.json' : path.join(process.cwd(), '.cache', 'foresight.json'));
const SNAPSHOT = path.join(process.cwd(), 'data', 'demo-cache.json');

let store: Store | null = null;
let loadedMtime = 0;
let writing: Promise<void> = Promise.resolve();

async function mtime(file: string): Promise<number> {
  try {
    return (await fs.stat(file)).mtimeMs;
  } catch {
    return 0;
  }
}

async function readJson(file: string): Promise<Store | null> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8')) as Store;
  } catch {
    return null;
  }
}

// Re-reads when the file changed on disk (e.g. `npm run demo:reset` ran in
// another process), so a running server never serves or re-saves stale entries.
async function load(): Promise<Store> {
  await writing;
  const m = await mtime(FILE);
  if (!store || (m && m !== loadedMtime)) {
    store = (await readJson(FILE)) ?? store ?? (await readJson(SNAPSHOT)) ?? {};
    loadedMtime = m;
  }
  return store;
}

// Writes are chained so parallel requests can't interleave partial files.
function persist(): Promise<void> {
  const snapshot = JSON.stringify(store, null, 2);
  writing = writing.then(async () => {
    try {
      await fs.mkdir(path.dirname(FILE), { recursive: true });
      await fs.writeFile(FILE, snapshot);
      loadedMtime = await mtime(FILE);
    } catch (err) {
      console.warn('[cache] could not write', FILE, err);
    }
  });
  return writing;
}

export async function cacheGet<T>(key: string): Promise<{ value: T; savedAt: string } | null> {
  const entry = (await load())[key];
  return entry ? { value: entry.value as T, savedAt: entry.savedAt } : null;
}

export async function cacheSet(key: string, value: unknown): Promise<string> {
  const savedAt = new Date().toISOString();
  (await load())[key] = { value, savedAt };
  await persist();
  return savedAt;
}

export async function cacheDelete(...prefixes: string[]): Promise<void> {
  const s = await load();
  for (const key of Object.keys(s)) {
    if (prefixes.some((p) => key.startsWith(p))) delete s[key];
  }
  await persist();
}

export const CACHE_FILE = FILE;

export const cacheKeys = {
  plan: (mode: string, festival: string) => `plan:${mode}:${festival}`,
  memory: (bank: string) => `memory:${bank}`,
  playbook: 'playbook',
};
