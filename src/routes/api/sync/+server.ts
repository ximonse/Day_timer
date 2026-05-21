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

function redisKey(token: string): string {
  return `daytimer:sync:${token}`;
}

function userProfileKey(token: string): string {
  return `daytimer:user:${token}`;
}

export async function GET({ request }: { request: Request }) {
  const token = readSyncToken(request);
  const [data, profile] = await Promise.all([
    redis.get(redisKey(token)),
    redis.get(userProfileKey(token))
  ]) as [any, any];
  
  const responseData = data ?? { flows: [], actualTimeLog: [] };
  return json({
    ...responseData,
    userLevel: profile?.level || 1
  });
}

export async function POST({ request }: { request: Request }) {
  const token = readSyncToken(request);
  const body = await request.json();
  if (!Array.isArray(body?.flows)) throw error(400, 'invalid body');
  
  // Extract userLevel if present, but don't store it in the sync data itself
  const { userLevel, ...syncData } = body;
  
  const tasks: Promise<any>[] = [redis.set(redisKey(token), syncData)];
  
  if (userLevel !== undefined) {
    // Only update profile if we explicitly want to (e.g. after upgrade)
    // For now, POST just saves sync data, but we could allow updating profile here too
    // However, it's safer to have a separate endpoint for level upgrades.
  }

  await Promise.all(tasks);
  return json({ ok: true });
}
