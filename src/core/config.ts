import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import type { WhichCCConfig, ProviderConfig } from '../types.js';
import {
  CONFIG_PATH,
  WHICHCC_DIR,
  DEFAULT_STATUS_LINE_COMMAND,
} from '../constants.js';
import { BUILTIN_PROVIDERS } from './registry.js';
import { ensureDir, ensureParentDir } from './fs-utils.js';

export function getDefaultConfig(): WhichCCConfig {
  const providers: Record<string, ProviderConfig> = {};
  for (const [id, p] of Object.entries(BUILTIN_PROVIDERS)) {
    providers[id] = { defaultModel: p.defaultModel, userModels: [] };
  }
  return {
    version: 1,
    defaults: {
      skipDangerous: false,
      statusLine: true,
      statusLineCommand: DEFAULT_STATUS_LINE_COMMAND,
    },
    providers,
    customProviders: {},
    lastUsed: null,
  };
}

export function ensureDirs(): void {
  ensureDir(WHICHCC_DIR);
}

export function loadConfig(): WhichCCConfig {
  ensureDirs();
  if (!existsSync(CONFIG_PATH)) {
    const cfg = getDefaultConfig();
    saveConfig(cfg);
    return cfg;
  }
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return migrateConfig(parsed);
  } catch {
    const cfg = getDefaultConfig();
    saveConfig(cfg);
    return cfg;
  }
}

export function saveConfig(config: WhichCCConfig): void {
  ensureDirs();
  ensureParentDir(CONFIG_PATH);
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

export function migrateConfig(data: unknown): WhichCCConfig {
  const def = getDefaultConfig();
  if (!data || typeof data !== 'object') return def;
  const cfg = data as Partial<WhichCCConfig>;
  const merged: WhichCCConfig = {
    version: cfg.version ?? 1,
    defaults: {
      skipDangerous: cfg.defaults?.skipDangerous ?? def.defaults.skipDangerous,
      statusLine: cfg.defaults?.statusLine ?? def.defaults.statusLine,
      statusLineCommand: cfg.defaults?.statusLineCommand ?? def.defaults.statusLineCommand,
    },
    providers: { ...def.providers },
    customProviders: cfg.customProviders ?? {},
    lastUsed: cfg.lastUsed ?? null,
  };
  if (cfg.providers) {
    for (const [id, pc] of Object.entries(cfg.providers)) {
      if (pc && typeof pc === 'object') {
        merged.providers[id] = {
          defaultModel: pc.defaultModel ?? def.providers[id]?.defaultModel ?? '',
          userModels: Array.isArray(pc.userModels) ? [...pc.userModels] : [],
        };
      }
    }
  }
  return merged;
}

export function addUserModel(
  config: WhichCCConfig,
  providerId: string,
  model: string,
  setAsDefault: boolean,
): WhichCCConfig {
  const provider = config.providers[providerId];
  if (!provider) {
    config.providers[providerId] = {
      defaultModel: setAsDefault ? model : '',
      userModels: [model],
    };
    return config;
  }
  if (!provider.userModels.includes(model)) {
    provider.userModels.push(model);
  }
  if (setAsDefault) provider.defaultModel = model;
  return config;
}

export function removeUserModel(
  config: WhichCCConfig,
  providerId: string,
  model: string,
): { config: WhichCCConfig; removed: boolean } {
  const provider = config.providers[providerId];
  if (!provider) return { config, removed: false };
  const idx = provider.userModels.indexOf(model);
  if (idx === -1) return { config, removed: false };
  provider.userModels.splice(idx, 1);
  if (provider.defaultModel === model) {
    const builtin = BUILTIN_PROVIDERS[providerId];
    provider.defaultModel = builtin?.defaultModel ?? provider.userModels[0] ?? '';
  }
  return { config, removed: true };
}

export function setLastUsed(config: WhichCCConfig, provider: string, model: string): WhichCCConfig {
  config.lastUsed = {
    provider,
    model,
    timestamp: new Date().toISOString(),
  };
  return config;
}
