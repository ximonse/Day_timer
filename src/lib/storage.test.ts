import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readSessionValue, writeSessionValue, removeSessionValue } from './storage.js';

function mockSessionStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k)
  };
}

describe('storage session helpers', () => {
  beforeEach(() => {
    vi.stubGlobal('sessionStorage', mockSessionStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('writes and reads a value', () => {
    writeSessionValue('k', 'v');
    expect(readSessionValue('k')).toBe('v');
  });

  it('returns null for a missing key', () => {
    expect(readSessionValue('missing')).toBeNull();
  });

  it('removes a value', () => {
    writeSessionValue('k', 'v');
    removeSessionValue('k');
    expect(readSessionValue('k')).toBeNull();
  });

  it('degrades gracefully when sessionStorage is unavailable', () => {
    vi.stubGlobal('sessionStorage', undefined);
    expect(() => writeSessionValue('k', 'v')).not.toThrow();
    expect(readSessionValue('k')).toBeNull();
  });
});
