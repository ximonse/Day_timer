import { Redis } from '@upstash/redis';
import { json, error } from '@sveltejs/kit';
import { validateSyncToken } from '$lib/security.js';
import { inviteKey, normalizeInviteCode, type InviteRecord } from '$lib/invites.js';

const redis = new Redis({
  url: process.env.daytimer_KV_REST_API_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

function readSyncToken(request: Request): string {
  const token = request.headers.get('x-sync-token');
  if (!validateSyncToken(token)) throw error(400, 'invalid token');
  return token;
}

function userProfileKey(token: string): string {
  return `daytimer:user:${token}`;
}

// POST /api/upgrade - Claim an invite code
export async function POST({ request }: { request: Request }) {
  const token = readSyncToken(request);
  const { code } = await request.json();
  const normalizedCode = typeof code === 'string' ? normalizeInviteCode(code) : '';
  
  if (!normalizedCode) throw error(400, 'Code is required');
  
  const key = inviteKey(normalizedCode);
  const invite = await redis.get(key) as InviteRecord | null;
  
  if (!invite) throw error(404, `Invite code ${normalizedCode} was not found`);
  if (invite.used && !invite.multi) throw error(403, 'Invite code already used');
  
  // Mark as used if not multi-use
  if (!invite.multi) {
    await redis.set(key, { ...invite, used: true });
  }
  
  // Upgrade user level
  await redis.set(userProfileKey(token), { level: 2 });
  
  return json({ ok: true, level: 2 });
}
