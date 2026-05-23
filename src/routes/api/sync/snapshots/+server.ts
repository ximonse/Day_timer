import { Redis } from '@upstash/redis';
import { error, json } from '@sveltejs/kit';
import { validateSyncToken } from '$lib/security.js';
import { readWorkspaceSnapshots, workspaceSnapshotsKey } from '$lib/workspace-snapshot-store.js';
import { summarizeWorkspaceSnapshots } from '$lib/workspace-snapshots.js';

const redis = new Redis({
  url: process.env.daytimer_KV_REST_API_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

function readSyncToken(request: Request): string {
  const token = request.headers.get('x-sync-token');
  if (!validateSyncToken(token)) throw error(400, 'invalid token');
  return token;
}

export async function GET({ request }: { request: Request }) {
  const token = readSyncToken(request);
  const snapshots = await readWorkspaceSnapshots(redis, workspaceSnapshotsKey(token));
  return json({ snapshots: summarizeWorkspaceSnapshots(snapshots) });
}
