import fs from 'node:fs/promises';
import path from 'node:path';

const emptyState = () => ({ version: 1, clans: [] });

export function createStore(filePath) {
  let state = emptyState();
  let writeChain = Promise.resolve();

  async function load() {
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      state = { version: 1, clans: Array.isArray(parsed.clans) ? parsed.clans : [] };
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await persist();
    }
    return state;
  }

  function persist() {
    writeChain = writeChain.then(async () => {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      const tempPath = `${filePath}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(state, null, 2), 'utf8');
      await fs.rename(tempPath, filePath);
    });
    return writeChain;
  }

  return {
    load,
    all: () => state.clans,
    save: persist,
    add: (clan) => { state.clans.push(clan); return persist(); },
    replace: (clans) => { state.clans = clans; return persist(); },
    remove: (id) => { state.clans = state.clans.filter((clan) => clan.id !== id); return persist(); }
  };
}
