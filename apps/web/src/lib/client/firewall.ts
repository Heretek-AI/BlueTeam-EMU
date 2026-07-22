import { getDb } from './db.js';

export interface ConnectionRow {
  id: string;
  ts: number;
  srcIp: string;
  dstIp: string;
  dport: number;
  proto: string;
  bytesOut: number;
  bytesIn: number;
  asn: string | null;
  dstHost: string | null;
}

export async function searchConnections(opts: {
  operationId: string;
  srcIp?: string;
  dstIp?: string;
  dport?: number;
  asn?: string;
  fromTs?: number;
  toTs?: number;
  limit?: number;
}): Promise<{ rows: ConnectionRow[] }> {
  const h = await getDb();
  const clauses: string[] = ['operation_id = ?'];
  const params: any[] = [opts.operationId];

  if (opts.srcIp) { clauses.push('src_ip = ?'); params.push(opts.srcIp); }
  if (opts.dstIp) { clauses.push('dst_ip = ?'); params.push(opts.dstIp); }
  if (opts.dport !== undefined) { clauses.push('dport = ?'); params.push(opts.dport); }
  if (opts.asn) { clauses.push('asn = ?'); params.push(opts.asn); }
  if (opts.fromTs !== undefined) { clauses.push('ts >= ?'); params.push(opts.fromTs); }
  if (opts.toTs !== undefined) { clauses.push('ts <= ?'); params.push(opts.toTs); }

  const limit = Math.min(opts.limit ?? 200, 1000);
  params.push(limit);

  const res = h.db.exec(
    `SELECT id, ts, src_ip, dst_ip, dport, proto, bytes_out, bytes_in, asn, dst_host
     FROM firewall_events WHERE ${clauses.join(' AND ')}
     ORDER BY ts ASC LIMIT ?`,
    params
  );

  const rows: ConnectionRow[] = (res[0]?.values ?? []).map((row: any) => ({
    id: row[0],
    ts: row[1],
    srcIp: row[2],
    dstIp: row[3],
    dport: row[4],
    proto: row[5],
    bytesOut: row[6],
    bytesIn: row[7],
    asn: row[8],
    dstHost: row[9]
  }));

  return { rows };
}
