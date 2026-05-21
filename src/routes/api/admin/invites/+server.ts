import { Redis } from '@upstash/redis';
import { json, error } from '@sveltejs/kit';
import { validateSyncToken } from '$lib/security.js';

const redis = new Redis({
  url: process.env.daytimer_KV_REST_API_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-me-in-env';

function isAdmin(request: Request): boolean {
  const auth = request.headers.get('x-admin-password');
  return auth === ADMIN_PASSWORD;
}

function inviteKey(code: string): string {
  return `daytimer:invite:${code.trim().toUpperCase()}`;
}

export async function GET({ request }: { request: Request }) {
  if (!isAdmin(request)) throw error(401, 'Unauthorized');
  
  // In a real app we'd scan for all invite keys, but Redis scan is slow/complex via REST.
  // For now, we return an empty list or implement a better way if needed.
  return json({ invites: [] });
}

export async function POST({ request }: { request: Request }) {
  if (!isAdmin(request)) throw error(401, 'Unauthorized');
  
  const { code, multi } = await request.json();
  if (!code) throw error(400, 'Code required');
  
  await redis.set(inviteKey(code), { used: false, multi: !!multi });
  return json({ ok: true });
}
