import { Redis } from '@upstash/redis';
import { json, error } from '@sveltejs/kit';
import { validateSyncToken } from '$lib/security.js';
import { workspaceDataFromSyncResponse, workspaceEnvelopeFromData } from '$lib/workspace.js';

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

function createId(): string {
  return Math.random().toString(36).slice(2, 9);
}

export async function GET({ request }: { request: Request }) {
  const token = readSyncToken(request);
  const [data, profile] = await Promise.all([
    redis.get(redisKey(token)),
    redis.get(userProfileKey(token))
  ]) as [any, any];
  
  const workspace = workspaceDataFromSyncResponse(data ?? {}, createId);
  if (!workspace) throw error(500, 'invalid workspace data');
  return json({
    workspace,
    userLevel: profile?.level || 1
  });
}

export async function POST({ request }: { request: Request }) {
  const token = readSyncToken(request);
  const body = await request.json();
  const workspace = workspaceDataFromSyncResponse(body, createId);
  if (!workspace) throw error(400, 'invalid body');
  
  const tasks: Promise<any>[] = [redis.set(redisKey(token), workspaceEnvelopeFromData(workspace))];

  await Promise.all(tasks);
  return json({ ok: true });
}
