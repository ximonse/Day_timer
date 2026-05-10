import { Redis } from '@upstash/redis';
import { json, error } from '@sveltejs/kit';
import { authorizeShareWrite, sanitizeSharePayload, validateShareToken } from '$lib/security.js';

const redis = new Redis({
  url: process.env.daytimer_KV_REST_API_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const TTL = 48 * 60 * 60; // 48 hours

function redisKey(token: string) {
  return `daytimer:share:${token}`;
}

type ShareRecord = Record<string, unknown> & { ownerToken?: string };

export async function GET({ url }: { url: URL }) {
  const token = url.searchParams.get('token');
  if (!validateShareToken(token)) throw error(400, 'invalid token');
  const data = await redis.get<ShareRecord>(redisKey(token));
  if (!data) throw error(404, 'not found');
  return json(sanitizeSharePayload(data));
}

export async function POST({ url, request }: { url: URL; request: Request }) {
  const token = url.searchParams.get('token');
  const ownerToken = request.headers.get('x-share-owner');
  if (!validateShareToken(token) || !validateShareToken(ownerToken)) throw error(400, 'invalid token');
  const body = await request.json();
  if (!body || typeof body !== 'object') throw error(400, 'invalid body');
  const key = redisKey(token);
  const existing = await redis.get<ShareRecord>(key);
  if (existing && !authorizeShareWrite(existing, ownerToken)) throw error(403, 'forbidden');
  await redis.set(key, { ...body, ownerToken }, { ex: TTL });
  return json({ ok: true });
}

export async function DELETE({ url, request }: { url: URL; request: Request }) {
  const token = url.searchParams.get('token');
  const ownerToken = request.headers.get('x-share-owner');
  if (!validateShareToken(token) || !validateShareToken(ownerToken)) throw error(400, 'invalid token');
  const existing = await redis.get<ShareRecord>(redisKey(token));
  if (!existing) throw error(404, 'not found');
  if (!authorizeShareWrite(existing, ownerToken)) throw error(403, 'forbidden');
  await redis.del(redisKey(token));
  return json({ ok: true });
}
