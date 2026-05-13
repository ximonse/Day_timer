import { describe, expect, it } from 'vitest';
import { localDateISO } from './date.js';

describe('localDateISO', () => {
  it('formats the local calendar date without UTC conversion', () => {
    expect(localDateISO(new Date(2026, 4, 9, 0, 30))).toBe('2026-05-09');
  });
});
