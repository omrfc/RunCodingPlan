import { describe, it, expect } from 'vitest';
import {
  generateProviderId,
  isReservedId,
  validateCustomProviderInput,
  addCustomProvider,
  removeCustomProvider,
  addModelToCustomProvider,
  removeModelFromCustomProvider,
} from '../src/core/custom.js';
import { getDefaultConfig } from '../src/core/config.js';

describe('generateProviderId', () => {
  it('converts name to kebab-case', () => {
    expect(generateProviderId('Deep Seek')).toBe('deep-seek');
    expect(generateProviderId('DeepSeek!')).toBe('deepseek');
    expect(generateProviderId('Samba Nova AI')).toBe('samba-nova-ai');
  });

  it('strips leading/trailing dashes', () => {
    expect(generateProviderId('  foo  ')).toBe('foo');
    expect(generateProviderId('--foo--')).toBe('foo');
  });
});

describe('isReservedId', () => {
  it('reserves built-in ids', () => {
    expect(isReservedId('zai')).toBe(true);
    expect(isReservedId('kimi')).toBe(true);
    expect(isReservedId('minimax')).toBe(true);
    expect(isReservedId('alibaba')).toBe(true);
    expect(isReservedId('deepseek')).toBe(true);
  });
});

describe('validateCustomProviderInput', () => {
  it('rejects reserved id (deepseek)', () => {
    const r = validateCustomProviderInput({
      name: 'DeepSeek',
      baseUrl: 'https://api.deepseek.com/anthropic',
      models: ['m1'],
      defaultModel: 'm1',
    });
    expect(r.ok).toBe(false);
  });

  it('rejects reserved id', () => {
    const r = validateCustomProviderInput({
      name: 'ZAI',
      baseUrl: 'https://x',
      models: ['m'],
      defaultModel: 'm',
    });
    expect(r.ok).toBe(false);
  });

  it('rejects bad URL', () => {
    const r = validateCustomProviderInput({
      name: 'X',
      baseUrl: 'ftp://x',
      models: ['m'],
      defaultModel: 'm',
    });
    expect(r.ok).toBe(false);
  });

  it('rejects default not in models', () => {
    const r = validateCustomProviderInput({
      name: 'X',
      baseUrl: 'https://x',
      models: ['a', 'b'],
      defaultModel: 'c',
    });
    expect(r.ok).toBe(false);
  });
});

describe('add/remove/mutate custom provider', () => {
  it('adds then removes', () => {
    const cfg = getDefaultConfig();
    addCustomProvider(cfg, 'my-deepseek', {
      name: 'My DeepSeek',
      baseUrl: 'https://api.deepseek.com/anthropic',
      models: ['m1', 'm2'],
      defaultModel: 'm1',
      addedAt: 'now',
    });
    expect(cfg.customProviders['my-deepseek']).toBeDefined();
    const { removed } = removeCustomProvider(cfg, 'my-deepseek');
    expect(removed).toBe(true);
    expect(cfg.customProviders['my-deepseek']).toBeUndefined();
  });

  it('adds model to custom with set-as-default', () => {
    const cfg = getDefaultConfig();
    addCustomProvider(cfg, 'x', {
      name: 'X',
      baseUrl: 'https://x',
      models: ['a'],
      defaultModel: 'a',
      addedAt: 'now',
    });
    addModelToCustomProvider(cfg, 'x', 'b', true);
    expect(cfg.customProviders['x']?.models).toContain('b');
    expect(cfg.customProviders['x']?.defaultModel).toBe('b');
  });

  it('refuses to remove last model from custom', () => {
    const cfg = getDefaultConfig();
    addCustomProvider(cfg, 'x', {
      name: 'X',
      baseUrl: 'https://x',
      models: ['a'],
      defaultModel: 'a',
      addedAt: 'now',
    });
    const { removed } = removeModelFromCustomProvider(cfg, 'x', 'a');
    expect(removed).toBe(false);
  });
});
