import { Redis } from '@upstash/redis';
import { json, error } from '@sveltejs/kit';

const redis = new Redis({
  url: process.env.daytimer_KV_REST_API_URL!,
  token: process.env.daytimer_KV_REST_API_TOKEN!,
});

export async function GET({ url }: { url: URL }) {
  const key = url.searchParams.get('key');
  if (!key || key.length < 2 || key.length > 100) throw error(400, 'invalid key');
  const data = await redis.get(`daytimer:${key}`);
  return json(data ?? { flows: [] });
}

export async function POST({ url, request }: { url: URL; request: Request }) {
  const key = url.searchParams.get('key');
  if (!key || key.length < 2 || key.length > 100) throw error(400, 'invalid key');
  const body = await request.json();
  if (!Array.isArray(body?.flows)) throw error(400, 'invalid body');
  await redis.set(`daytimer:${key}`, body);
  return json({ ok: true });
}
