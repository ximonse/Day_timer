import { Redis } from '@upstash/redis';
import { json, error } from '@sveltejs/kit';
import { validateSyncToken } from '$lib/security.js';

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

function inviteKey(code: string): string {
  return `daytimer:invite:${code.trim().toUpperCase()}`;
}

// POST /api/upgrade - Claim an invite code
export async function POST({ request }: { request: Request }) {
  const token = readSyncToken(request);
  const { code } = await request.json();
  
  if (!code) throw error(400, 'Code is required');
  
  const invite = await redis.get(inviteKey(code)) as { used?: boolean, multi?: boolean } | null;
  
  if (!invite) throw error(404, 'Invalid invite code');
  if (invite.used && !invite.multi) throw error(403, 'Invite code already used');
  
  // Mark as used if not multi-use
  if (!invite.multi) {
    await redis.set(inviteKey(code), { ...invite, used: true });
  }
  
  // Upgrade user level
  await redis.set(userProfileKey(token), { level: 2 });
  
  return json({ ok: true, level: 2 });
}
