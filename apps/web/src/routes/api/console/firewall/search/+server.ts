import { json, error } from '@sveltejs/kit';
import { and, eq, gte, lte, type SQL } from 'drizzle-orm';
import { getDb } from '$lib/server/db/client.js';
import { firewallEvents } from '$lib/server/db/schema.js';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ request }) => {
  const body = (await request.json()) as {
    operationId?: string;
    srcIp?: string;
    dstIp?: string;
    dport?: number;
    asn?: string;
    fromTs?: number;
    toTs?: number;
    limit?: number;
  };
  if (!body.operationId) throw error(400, 'operationId required');
  let limit = body.limit ?? 200;
  if (limit > 1000) limit = 1000;

  const clauses: SQL[] = [eq(firewallEvents.operationId, body.operationId)];
  if (body.srcIp) clauses.push(eq(firewallEvents.srcIp, body.srcIp));
  if (body.dstIp) clauses.push(eq(firewallEvents.dstIp, body.dstIp));
  if (body.dport !== undefined) clauses.push(eq(firewallEvents.dport, body.dport));
  if (body.asn) clauses.push(eq(firewallEvents.asn, body.asn));
  if (body.fromTs !== undefined) clauses.push(gte(firewallEvents.ts, body.fromTs));
  if (body.toTs !== undefined) clauses.push(lte(firewallEvents.ts, body.toTs));

  const db = getDb();
  const rows = await db
    .select()
    .from(firewallEvents)
    .where(and(...clauses))
    .limit(limit);
  return json({ rows });
};
