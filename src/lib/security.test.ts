import { describe, expect, it } from 'vitest';
import {
  authorizeShareWrite,
  createShareTokens,
  deriveSyncToken,
  sanitizeSharePayload,
  validateShareToken,
  validateSyncToken
} from './security.js';

describe('deriveSyncToken', () => {
  it('is deterministic for the same name and password', async () => {
    await expect(deriveSyncToken('Teacher', 'secret123')).resolves.toBe(
      await deriveSyncToken('Teacher', 'secret123')
    );
  });

  it('changes when the password changes', async () => {
    expect(await deriveSyncToken('Teacher', 'secret123')).not.toBe(
      await deriveSyncToken('Teacher', 'secret124')
    );
  });
});

describe('validateSyncToken', () => {
  it('accepts a 64-character lowercase hex token', () => {
    expect(validateSyncToken('a'.repeat(64))).toBe(true);
  });

  it('rejects non-hex or wrong-length tokens', () => {
    expect(validateSyncToken('not-a-token')).toBe(false);
    expect(validateSyncToken('A'.repeat(64))).toBe(false);
    expect(validateSyncToken('a'.repeat(63))).toBe(false);
  });
});

describe('share tokens', () => {
  it('creates separate viewer and owner tokens', () => {
    const tokens = createShareTokens();
    expect(tokens.viewToken).not.toBe(tokens.ownerToken);
    expect(validateShareToken(tokens.viewToken)).toBe(true);
    expect(validateShareToken(tokens.ownerToken)).toBe(true);
  });

  it('authorizes writes only with the matching owner token', () => {
    expect(authorizeShareWrite({ ownerToken: 'owner-1' }, 'owner-1')).toBe(true);
    expect(authorizeShareWrite({ ownerToken: 'owner-1' }, 'owner-2')).toBe(false);
    expect(authorizeShareWrite({ ownerToken: 'owner-1' }, '')).toBe(false);
  });

  it('removes ownerToken before returning shared state to viewers', () => {
    expect(
      sanitizeSharePayload({
        ownerToken: 'secret',
        blocks: [{ id: '1', title: 'Math', minutes: 45, note: '', warning: false, pinned: true }]
      })
    ).toEqual({
      blocks: [{ id: '1', title: 'Math', minutes: 45, note: '', warning: false, pinned: true }]
    });
  });
});
