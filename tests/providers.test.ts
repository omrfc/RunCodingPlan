import { describe, it, expect } from 'vitest';
import { resolveProvider, resolveAllProviders } from '../src/core/providers.js';
import { getDefaultConfig, addUserModel } from '../src/core/config.js';
import { addCustomProvider } from '../src/core/custom.js';

describe('resolveProvider', () => {
  it('resolves a built-in provider', () => {
    const cfg = getDefaultConfig();
    const p = resolveProvider('zai', cfg);
    expect(p).not.toBeNull();
    expect(p?.id).toBe('zai');
    expect(p?.isCustom).toBe(false);
    expect(p?.models.length).toBeGreaterThan(0);
  });

  it('returns null for unknown provider', () => {
    const cfg = getDefaultConfig();
    expect(resolveProvider('not-a-thing', cfg)).toBeNull();
  });

  it('merges user-added models after registry models', () => {
    const cfg = getDefaultConfig();
    addUserModel(cfg, 'zai', 'glm-6', true);
    const p = resolveProvider('zai', cfg);
    expect(p).not.toBeNull();
    const idx = p?.models.indexOf('glm-6');
    expect(idx).toBeGreaterThan(0);
    // registry models still present and first
    expect(p?.models[0]).toBe('glm-5.1');
    expect(p?.userModels).toEqual(['glm-6']);
    expect(p?.defaultModel).toBe('glm-6');
  });

  it('resolves custom provider', () => {
    const cfg = getDefaultConfig();
    addCustomProvider(cfg, 'custom-deepseek', {
      name: 'Custom DeepSeek',
      baseUrl: 'https://api.deepseek.com/anthropic',
      models: ['r3'],
      defaultModel: 'r3',
      addedAt: 'now',
    });
    const p = resolveProvider('custom-deepseek', cfg);
    expect(p?.isCustom).toBe(true);
    expect(p?.models).toEqual(['r3']);
  });
});

describe('resolveAllProviders', () => {
  it('returns built-ins plus custom', () => {
    const cfg = getDefaultConfig();
    addCustomProvider(cfg, 'my-deepseek', {
      name: 'My DeepSeek',
      baseUrl: 'https://api.deepseek.com/anthropic',
      models: ['r3'],
      defaultModel: 'r3',
      addedAt: 'now',
    });
    const all = resolveAllProviders(cfg);
    const ids = all.map((p) => p.id);
    expect(ids).toContain('zai');
    expect(ids).toContain('kimi');
    expect(ids).toContain('minimax');
    expect(ids).toContain('alibaba');
    expect(ids).toContain('deepseek');
  });
});
