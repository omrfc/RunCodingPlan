import { writeFileSync } from 'node:fs';
import type { ModelRegistry, WhichCCConfig } from '../../types.js';
import { REGISTRY_URL, REGISTRY_CACHE_PATH } from '../../constants.js';
import { loadCachedRegistry, isValidRegistry } from '../../core/registry.js';
import { saveConfig } from '../../core/config.js';
import { ensureParentDir } from '../../core/fs-utils.js';
import { success, info, error, warn } from '../ui.js';
import { c } from '../ui.js';

export async function updateCommand(config: WhichCCConfig): Promise<void> {
  info(`Fetching registry from GitHub ...`);

  let fetched: ModelRegistry;
  try {
    const response = await fetch(REGISTRY_URL, {
      headers: { accept: 'application/json' },
    });
    if (!response.ok) {
      error(`HTTP ${response.status}: ${response.statusText}`);
      process.exit(1);
    }
    const data = (await response.json()) as unknown;
    if (!isValidRegistry(data)) {
      error('Invalid registry schema from GitHub.');
      process.exit(1);
    }
    fetched = data;
  } catch (e) {
    error(`Fetch failed: ${(e as Error).message}`);
    process.exit(1);
  }

  const cached = loadCachedRegistry();

  ensureParentDir(REGISTRY_CACHE_PATH);
  writeFileSync(REGISTRY_CACHE_PATH, JSON.stringify(fetched, null, 2), 'utf8');

  if (cached) {
    if (cached.version === fetched.version) {
      info(`Already up to date (v${fetched.version}).`);
    } else {
      success(`Registry updated: v${cached.version} → v${fetched.version}`);
    }
    printDiff(cached, fetched);
  } else {
    success(`Registry cached (v${fetched.version}).`);
  }

  const promoted: string[] = [];
  for (const [providerId, provCfg] of Object.entries(config.providers)) {
    const updated = fetched.providers[providerId];
    if (!updated) continue;
    const registryIds = new Set(updated.models.map((m) => m.id));
    const keptUserModels: string[] = [];
    for (const m of provCfg.userModels) {
      if (registryIds.has(m)) {
        promoted.push(`${providerId}/${m}`);
      } else {
        keptUserModels.push(m);
      }
    }
    provCfg.userModels = keptUserModels;
  }
  if (promoted.length > 0) {
    for (const p of promoted) {
      console.log(`  ${c.green('↑')} Promoted: ${p}`);
    }
  }
  saveConfig(config);
}

function printDiff(oldReg: ModelRegistry, newReg: ModelRegistry): void {
  const oldProviderIds = new Set(Object.keys(oldReg.providers));
  const newProviderIds = new Set(Object.keys(newReg.providers));

  for (const id of newProviderIds) {
    if (!oldProviderIds.has(id)) {
      console.log(`  ${c.green('+')} New provider: ${id}`);
    }
  }
  for (const id of oldProviderIds) {
    if (!newProviderIds.has(id)) {
      warn(`Removed provider: ${id}`);
    }
  }
  for (const id of newProviderIds) {
    const oldP = oldReg.providers[id];
    const newP = newReg.providers[id];
    if (!oldP || !newP) continue;
    const oldModels = new Set(oldP.models.map((m) => m.id));
    const newModels = new Set(newP.models.map((m) => m.id));
    for (const m of newModels) {
      if (!oldModels.has(m)) console.log(`  ${c.green('+')} ${id}/${m}`);
    }
    for (const m of oldModels) {
      if (!newModels.has(m)) console.log(`  ${c.red('-')} ${id}/${m}`);
    }
    if (oldP.defaultModel !== newP.defaultModel) {
      console.log(`  ${c.yellow('~')} ${id} default: ${oldP.defaultModel} → ${newP.defaultModel}`);
    }
  }
}
