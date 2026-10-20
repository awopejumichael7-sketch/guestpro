import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const dataFile = path.resolve(process.env.DATA_FILE || './server/data/guestpass-data.json');
const initial = () => ({ users: [], organizations: [], events: [], guests: [], seats: [] });
let state;
let writeChain = Promise.resolve();

export async function loadStore() {
  if (state) return state;
  try {
    const raw = await fs.readFile(dataFile, 'utf8');
    state = { ...initial(), ...JSON.parse(raw) };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    state = initial();
    await persist();
  }
  return state;
}

async function persist() {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  const tmp = `${dataFile}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(state, null, 2), { mode: 0o600 });
  await fs.rename(tmp, dataFile);
}

// Serializes writes within this single Node process to reduce lost updates.
// This JSON adapter is for local development only, not multi-instance production use.
export async function mutate(fn) {
  const operation = writeChain.then(async () => {
    await loadStore();
    const result = await fn(state);
    await persist();
    return result;
  });
  writeChain = operation.catch(() => {});
  return operation;
}

export function newId() { return randomUUID(); }
export function resetStoreForTests() { state = undefined; writeChain = Promise.resolve(); }
