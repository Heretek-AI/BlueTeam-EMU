<script lang="ts">
  let { operationId }: { operationId: string } = $props();

  let srcIp = $state('');
  let dstIp = $state('');
  let dport = $state('');
  let asn = $state('');
  let rows = $state<any[]>([]);
  let loading = $state(false);

  async function run() {
    loading = true;
    try {
      const res = await fetch('/api/console/firewall/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          operationId,
          srcIp: srcIp || undefined,
          dstIp: dstIp || undefined,
          dport: dport ? Number(dport) : undefined,
          asn: asn || undefined
        })
      });
      const j = await res.json();
      rows = j.rows;
    } finally { loading = false; }
  }
</script>

<div class="row">
  <input bind:value={srcIp} placeholder="src IP" />
  <input bind:value={dstIp} placeholder="dst IP" />
  <input bind:value={dport} placeholder="dst port" />
  <input bind:value={asn} placeholder="ASN" />
  <button onclick={run}>{loading ? '...' : 'Filter'}</button>
  <span class="muted">{rows.length} rows</span>
</div>

<table class="mono" style="margin-top:8px;">
  <thead>
    <tr>
      <th>ts</th><th>src IP</th><th>dst IP</th><th>port</th>
      <th>proto</th><th>bytes out</th><th>bytes in</th>
      <th>ASN</th><th>dst host</th>
    </tr>
  </thead>
  <tbody>
    {#each rows as r}
      <tr>
        <td>{new Date(r.ts).toISOString().slice(11, 19)}</td>
        <td><a href={`?src_ip=${encodeURIComponent(r.srcIp)}`} onclick={(e) => { e.preventDefault(); srcIp = r.srcIp; run(); }}>{r.srcIp}</a></td>
        <td><a href={`?dst_ip=${encodeURIComponent(r.dstIp)}`} onclick={(e) => { e.preventDefault(); dstIp = r.dstIp; run(); }}>{r.dstIp}</a></td>
        <td>{r.dport}</td>
        <td>{r.proto}</td>
        <td>{r.bytesOut.toLocaleString()}</td>
        <td>{r.bytesIn.toLocaleString()}</td>
        <td>{r.asn ?? '—'}</td>
        <td>
          {#if r.dstHost}
            <a href={`/operations/${operationId}/siem?q=host:${encodeURIComponent(r.dstHost)}`}>{r.dstHost}</a>
          {:else}-{/if}
        </td>
      </tr>
    {/each}
  </tbody>
</table>
