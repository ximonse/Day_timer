const encoder = new TextEncoder();

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

export async function deriveSyncToken(name: string, password: string): Promise<string> {
  const normalized = `${name.trim().toLowerCase()}:${password}`;
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(normalized));
  return toHex(new Uint8Array(digest));
}

export function validateSyncToken(token: string | null | undefined): token is string {
  return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);
}

export function createShareTokens(): { viewToken: string; ownerToken: string } {
  return {
    viewToken: randomHex(12),
    ownerToken: randomHex(32)
  };
}

export function validateShareToken(token: string | null | undefined): token is string {
  return typeof token === 'string' && /^[a-f0-9]{24,64}$/.test(token);
}

export function authorizeShareWrite(record: { ownerToken?: string | null }, ownerToken: string | null | undefined): boolean {
  return Boolean(record.ownerToken && ownerToken && record.ownerToken === ownerToken);
}

export function sanitizeSharePayload<T extends Record<string, unknown>>(payload: T): Omit<T, 'ownerToken'> {
  const { ownerToken: _ownerToken, ...safePayload } = payload;
  return safePayload;
}
