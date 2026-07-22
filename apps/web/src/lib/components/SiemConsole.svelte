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
      const { searchLogs } = await import('$lib/client/siem.js');
      const result = await searchLogs({
        operationId,
        filters: value ? [{ field, value }] : [],
        limit: 200
      });
      events = result.events;
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
  </select>
  <input bind:value placeholder="filter value…" />
  <button onclick={run}>{loading ? '...' : 'Search'}</button>
  <span class="muted">{events.length} events</span>
  {#if errorMessage}<span class="error">{errorMessage}</span>{/if}
</div>

<table class="mono" style="margin-top:8px;">
  <thead>
    <tr><th>ts</th><th>source</th><th>kind</th><th>host</th><th>user</th><th>process</th></tr>
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
    <pre class="mono">{JSON.stringify(selected.payload ?? selected, null, 2)}</pre>
    {#if selected.payload?.entities}
      <h4>Entities</h4>
      {#each Object.entries(selected.payload.entities) as [ek, evs]}
        {#each (evs as any) as ev}
          <a href={linkEntity(ev, ek.replace(/s$/, ''))} class="pill low">{ev}</a>
        {/each}
      {/each}
    {/if}
  </aside>
{/if}

<style>
  .drawer { position: fixed; right: 0; top: 48px; bottom: 0; width: 480px; background: var(--panel); border-left: 1px solid var(--border); padding: 16px; overflow: auto; z-index: 60; }
  .drawer header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  pre { white-space: pre-wrap; }
</style>
