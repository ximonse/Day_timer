import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DEFAULT_AI_CONFIG, loadAiConfig, persistAiConfig, clearStoredAiConfig } from './ai.js';

function mockStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    _map: map
  };
}

describe('AI config persistence', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', mockStorage());
    vi.stubGlobal('sessionStorage', mockStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns defaults when nothing is stored', () => {
    expect(loadAiConfig()).toEqual(DEFAULT_AI_CONFIG);
  });

  it('round-trips a saved config but never persists the api key in localStorage', () => {
    persistAiConfig({ provider: 'openai', apiKey: 'secret', baseUrl: 'b', customModel: 'm', planMode: 'strict' });
    const raw = localStorage.getItem('daytimer_ai_config')!;
    expect(JSON.parse(raw)).not.toHaveProperty('apiKey');
    expect(loadAiConfig()).toEqual({ provider: 'openai', apiKey: 'secret', baseUrl: 'b', customModel: 'm', planMode: 'strict' });
  });

  it('drops the api key from session storage when blank', () => {
    persistAiConfig({ ...DEFAULT_AI_CONFIG, apiKey: 'k' });
    persistAiConfig({ ...DEFAULT_AI_CONFIG, apiKey: '   ' });
    expect(loadAiConfig().apiKey).toBe('');
  });

  it('migrates the legacy api key into session storage', () => {
    localStorage.setItem('daytimer_ai_key', 'legacy');
    expect(loadAiConfig().apiKey).toBe('legacy');
    expect(localStorage.getItem('daytimer_ai_key')).toBeNull();
    expect(sessionStorage.getItem('daytimer_ai_api_key')).toBe('legacy');
  });

  it('clears all stored config', () => {
    persistAiConfig({ ...DEFAULT_AI_CONFIG, apiKey: 'k', provider: 'gemini' });
    clearStoredAiConfig();
    expect(loadAiConfig()).toEqual(DEFAULT_AI_CONFIG);
  });
});
