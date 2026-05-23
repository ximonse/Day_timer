import { Redis } from '@upstash/redis';
import { error, json } from '@sveltejs/kit';
import { validateSyncToken } from '$lib/security.js';
import { workspaceDataFromSyncResponse, workspaceEnvelopeFromData, type WorkspaceData } from '$lib/workspace.js';
import { findWorkspaceSnapshot, maybeSaveWorkspaceSnapshot, workspaceSnapshotsKey } from '$lib/workspace-snapshot-store.js';

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

function createId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function cloneWorkspace(workspace: WorkspaceData): WorkspaceData {
  return JSON.parse(JSON.stringify(workspace)) as WorkspaceData;
}

export async function POST({ request }: { request: Request }) {
  const token = readSyncToken(request);
  const body = await request.json();
  const snapshotId = typeof body?.snapshotId === 'string' ? body.snapshotId : '';
  if (!snapshotId) throw error(400, 'missing snapshotId');

  const snapshot = await findWorkspaceSnapshot(redis, workspaceSnapshotsKey(token), snapshotId);
  if (!snapshot) throw error(404, 'snapshot not found');

  const existingRaw: any = await redis.get(redisKey(token));
  const existing = workspaceDataFromSyncResponse(existingRaw ?? {}, createId);
  const currentRevision = existing?.revision ?? 0;

  await maybeSaveWorkspaceSnapshot(redis, workspaceSnapshotsKey(token), existing, 'restore', createId, () => new Date().toISOString());

  const restored = cloneWorkspace(snapshot.workspace);
  restored.revision = currentRevision + 1;
  await redis.set(redisKey(token), workspaceEnvelopeFromData(restored));

  return json({ ok: true, revision: restored.revision, restoredFrom: snapshot.id });
}
