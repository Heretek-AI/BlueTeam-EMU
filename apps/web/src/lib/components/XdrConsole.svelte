<script lang="ts">
  let { operationId, host }: { operationId: string; host: string } = $props();

  let events = $state<any[]>([]);
  let kinds = $state(new Set(['process', 'file', 'auth', 'network']));
  let loading = $state(false);

  async function load() {
    loading = true;
    try {
      const { getEntityTimeline } = await import('$lib/client/xdr.js');
      const result = await getEntityTimeline({ operationId, host, kinds: [...kinds] });
      events = result.events;
    } finally { loading = false; }
  }

  $effect(() => {
    if (operationId && host) load();
  });

  const byPid = $derived(new Map(events.filter((e) => e.pid).map((p) => [p.pid, p])));
  const roots = $derived(events.filter((p) => p.kind === 'process' && !byPid.has(p.ppid)));
</script>

<section>
  <h2>Process tree — {host}</h2>
  {#if loading}loading…{:else}
    <ul class="tree mono">
      {#each roots as r}
        {@render branch(r, 0)}
      {/each}
    </ul>
  {/if}
</section>

<section style="margin-top:20px;">
  <h2>Timeline</h2>
  <label><input type="checkbox" bind:group={kinds} value="process" /> process</label>
  <label><input type="checkbox" bind:group={kinds} value="file" /> file</label>
  <label><input type="checkbox" bind:group={kinds} value="auth" /> auth</label>
  <button onclick={load}>Reload</button>

  <ol class="timeline mono">
    {#each events as e}
      <li class:suspicious={e.suspicious}>
        <span class="muted">{new Date(e.ts).toISOString().slice(11, 19)}</span>
        <span class="pill">{e.kind}</span>
        {#if e.process}<strong>{e.process}</strong>{/if}
        {#if e.pid}<span class="muted">pid={e.pid}</span>{/if}
        {#if e.suspicious}<span class="pill high" title={e.suspicionRule ?? ''}>!</span>{/if}
      </li>
    {/each}
  </ol>
</section>

{#snippet branch(e: any, depth: number)}
  <li class:suspicious={e.suspicious}>
    <span class="muted">{'  '.repeat(depth)}└─</span>
    <strong>{e.process ?? '?'}</strong>
    <span class="muted">pid={e.pid} ppid={e.ppid ?? '-'}</span>
    {#if e.suspicious}<span class="pill high" title={e.suspicionRule ?? ''}>!</span>{/if}
  </li>
  {#each events.filter((q) => q.kind === 'process' && q.ppid === e.pid) as child}
    {@render branch(child, depth + 1)}
  {/each}
{/snippet}

<style>
  .tree, .timeline { list-style: none; padding-left: 0; }
  .timeline li { padding: 4px 0; border-bottom: 1px solid var(--border); display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .tree li { padding: 2px 0; }
  li.suspicious { background: rgba(248,81,73,0.1); border-left: 2px solid var(--danger); padding-left: 4px; }
  .pill.high { background: rgba(248,81,73,0.4); color: #ffa198; }
</style>
