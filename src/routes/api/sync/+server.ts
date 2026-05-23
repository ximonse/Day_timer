import { Redis } from '@upstash/redis';
import { json, error } from '@sveltejs/kit';
import { validateSyncToken } from '$lib/security.js';
import { workspaceDataFromSyncResponse, workspaceEnvelopeFromData } from '$lib/workspace.js';
import { maybeSaveWorkspaceSnapshot, snapshotReasonFromSyncBody, workspaceSnapshotsKey } from '$lib/workspace-snapshot-store.js';

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
  const incoming = workspaceDataFromSyncResponse(body, createId);
  if (!incoming) throw error(400, 'invalid body');

  const existingRaw: any = await redis.get(redisKey(token));
  const existing = workspaceDataFromSyncResponse(existingRaw ?? {}, createId);
  const snapshotReason = snapshotReasonFromSyncBody(body);
  
  const currentRevision = existing?.revision ?? 0;
  const baseRevision = incoming.revision;

  if (baseRevision < currentRevision) {
    return json({
      conflict: true,
      currentRevision,
      workspace: existing
    }, { status: 409 });
  }

  incoming.revision = currentRevision + 1;
  const envelope = workspaceEnvelopeFromData(incoming);
  
  if (snapshotReason) {
    await maybeSaveWorkspaceSnapshot(redis, workspaceSnapshotsKey(token), existing, snapshotReason, createId, () => new Date().toISOString());
  }
  await redis.set(redisKey(token), envelope);
  return json({ ok: true, revision: incoming.revision });
}
