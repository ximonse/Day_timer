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

export async function GET({ request }: { request: Request }) {
  const token = readSyncToken(request);
  const data = (await redis.get(redisKey(token))) as any;
  const revision = typeof data?.revision === 'number'
    ? data.revision
    : typeof data?.workspace?.revision === 'number'
      ? data.workspace.revision
      : 0;
  return json({ revision });
}
