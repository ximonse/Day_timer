import { Redis } from '@upstash/redis';
import { json, error } from '@sveltejs/kit';

const redis = new Redis({
  url: process.env.daytimer_KV_REST_API_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const TTL = 48 * 60 * 60; // 48 hours

function redisKey(token: string) {
  return `daytimer:share:${token}`;
}

export async function GET({ url }: { url: URL }) {
  const token = url.searchParams.get('token');
  if (!token || token.length < 6 || token.length > 64) throw error(400, 'invalid token');
  const data = await redis.get(redisKey(token));
  if (!data) throw error(404, 'not found');
  return json(data);
}

export async function POST({ url, request }: { url: URL; request: Request }) {
  const token = url.searchParams.get('token');
  if (!token || token.length < 6 || token.length > 64) throw error(400, 'invalid token');
  const body = await request.json();
  if (!body || typeof body !== 'object') throw error(400, 'invalid body');
  await redis.set(redisKey(token), body, { ex: TTL });
  return json({ ok: true });
}

export async function DELETE({ url }: { url: URL }) {
  const token = url.searchParams.get('token');
  if (!token || token.length < 6 || token.length > 64) throw error(400, 'invalid token');
  await redis.del(redisKey(token));
  return json({ ok: true });
}
