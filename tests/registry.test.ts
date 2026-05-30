import { describe, it, expect } from 'vitest';
import { BUILTIN_PROVIDERS, isValidRegistry } from '../src/core/registry.js';

describe('BUILTIN_PROVIDERS', () => {
  it('contains the 5 built-in providers', () => {
    expect(Object.keys(BUILTIN_PROVIDERS).sort()).toEqual(
      ['alibaba', 'deepseek', 'kimi', 'minimax', 'zai'].sort(),
    );
  });

  it('each provider has models, defaultModel, signupUrl, baseUrl', () => {
    for (const [id, p] of Object.entries(BUILTIN_PROVIDERS)) {
      expect(p.id).toBe(id);
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.baseUrl).toMatch(/^https?:\/\//);
      expect(p.signupUrl).toMatch(/^https?:\/\//);
      expect(p.models.length).toBeGreaterThan(0);
      expect(p.defaultModel.length).toBeGreaterThan(0);
      expect(p.models.some((m) => m.id === p.defaultModel)).toBe(true);
    }
  });

  it('zai default is glm-5.1', () => {
    expect(BUILTIN_PROVIDERS['zai']?.defaultModel).toBe('glm-5.1');
  });

  it('alibaba has qwen + glm + kimi + minimax brands', () => {
    const brands = new Set(
      (BUILTIN_PROVIDERS['alibaba']?.models ?? []).map((m) => m.brand).filter(Boolean),
    );
    expect(brands.has('Qwen')).toBe(true);
    expect(brands.has('Zhipu')).toBe(true);
    expect(brands.has('Kimi')).toBe(true);
    expect(brands.has('MiniMax')).toBe(true);
  });
});

describe('isValidRegistry', () => {
  it('rejects null/undefined/non-object', () => {
    expect(isValidRegistry(null)).toBe(false);
    expect(isValidRegistry(undefined)).toBe(false);
    expect(isValidRegistry(42)).toBe(false);
  });

  it('accepts a minimal valid registry', () => {
    const reg = {
      version: 1,
      updatedAt: '2026-01-01T00:00:00Z',
      providers: {
        zai: {
          name: 'ZAI',
          baseUrl: 'https://api.z.ai/api/anthropic',
          defaultModel: 'glm-5.1',
          models: [{ id: 'glm-5.1' }],
        },
      },
    };
    expect(isValidRegistry(reg)).toBe(true);
  });

  it('rejects missing version', () => {
    expect(isValidRegistry({ providers: {}, updatedAt: 'x' })).toBe(false);
  });
});
