<script lang="ts">
  let { operationId }: { operationId: string } = $props();

  let field = $state('host');
  let value = $state('');
  let events = $state<any[]>([]);
  let loading = $state(false);
  let selected = $state<any | null>(null);
  let errorMessage = $state('');

  async function run() {
    loading = true;
    errorMessage = '';
    try {
      const res = await fetch('/api/console/siem/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          operationId,
          filters: value ? [{ field, value }] : [],
          limit: 200
        })
      });
      if (!res.ok) throw new Error(await res.text());
      const j = await res.json();
      events = j.events;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  }

  function linkEntity(e: any, kind: string) {
    if (kind === 'ip') return `/operations/${operationId}/firewall?ip=${encodeURIComponent(e)}`;
    if (kind === 'host') return `/operations/${operationId}/xdr?host=${encodeURIComponent(e)}`;
    if (kind === 'file_hash') return `/operations/${operationId}/siem?q=file_hash:${encodeURIComponent(e)}`;
    return '#';
  }
</script>

<div class="row">
  <select bind:value={field}>
    <option value="host">host</option>
    <option value="user">user</option>
    <option value="process">process</option>
    <option value="kind">kind</option>
    <option value="action">action (field)</option>
  </select>
  <input bind:value placeholder="filter value…" />
  <button onclick={run}>{loading ? '...' : 'Search'}</button>
  <span class="muted">{events.length} events</span>
  {#if errorMessage}<span class="error">{errorMessage}</span>{/if}
</div>

<table class="mono" style="margin-top:8px;">
  <thead>
    <tr><th>ts</th><th>source</th><th>kind</th><th>host</th><th>user</th><th>process</th><th>entities</th></tr>
  </thead>
  <tbody>
    {#each events as e}
      <tr onclick={() => (selected = e)} style="cursor:pointer;">
        <td>{new Date(e.ts).toISOString().slice(11, 19)}</td>
        <td>{e.source}</td>
        <td>{e.kind}</td>
        <td>{e.host ?? '-'}</td>
        <td>{e.user ?? '-'}</td>
        <td>{e.process ?? '-'}</td>
        <td>
          {#each [...(e.payload?.entities?.ips ?? [])].slice(0, 3) as ip}
            <a href={linkEntity(ip, 'ip')} class="pill low">{ip}</a>
          {/each}
          {#each [...(e.payload?.entities?.hosts ?? [])].slice(0, 2) as h}
            <a href={linkEntity(h, 'host')} class="pill medium">{h}</a>
          {/each}
        </td>
      </tr>
    {/each}
  </tbody>
</table>

{#if selected}
  <aside class="drawer">
    <header>
      <strong>Event {selected.id}</strong>
      <button onclick={() => (selected = null)}>close</button>
    </header>
    <pre class="mono">{JSON.stringify(selected, null, 2)}</pre>
  </aside>
{/if}

<style>
  .drawer { position: fixed; right: 0; top: 48px; bottom: 0; width: 480px; background: var(--panel); border-left: 1px solid var(--border); padding: 16px; overflow: auto; }
  .drawer header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  pre { white-space: pre-wrap; }
  .pill { margin-right: 4px; }
</style>
