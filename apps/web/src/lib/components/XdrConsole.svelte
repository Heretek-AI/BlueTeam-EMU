<script lang="ts">
  let { operationId, host }: { operationId: string; host: string } = $props();

  let processes = $state<any[]>([]);
  let events = $state<any[]>([]);
  let kinds = $state(new Set(['process', 'file', 'auth', 'network']));
  let loading = $state(false);

  async function load() {
    loading = true;
    try {
      const res = await fetch('/api/console/xdr/timeline', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ operationId, host, kinds: [...kinds] })
      });
      const j = await res.json();
      events = j.events;
      processes = j.events.filter((e: any) => e.kind === 'process');
    } finally { loading = false; }
  }

  $effect(() => {
    if (operationId && host) load();
  });

  // Build tree
  const byPid = $derived(new Map(processes.map((p) => [p.pid, p])));
  const roots = $derived(processes.filter((p) => !byPid.has(p.ppid)));
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
      <li class:suspicious={e.suspicious === 1}>
        <span class="muted">{new Date(e.ts).toISOString().slice(11, 19)}</span>
        <span class="pill {e.kind}">{e.kind}</span>
        {#if e.process}<strong>{e.process}</strong>{/if}
        {#if e.pid}<span class="muted">pid={e.pid}</span>{/if}
        {#if e.suspicious === 1}<span class="pill high" title={e.suspicionRule ?? ''}>!</span>{/if}
      </li>
    {/each}
  </ol>
</section>

{#snippet branch(p, depth)}
  <li class:suspicious={p.suspicious === 1}>
    <span class="muted">{'  '.repeat(depth)}└─</span>
    <strong>{p.process ?? '?'}</strong>
    <span class="muted">pid={p.pid} ppid={p.ppid ?? '-'}</span>
    {#if p.suspicious === 1}<span class="pill high" title={p.suspicionRule ?? ''}>!</span>{/if}
  </li>
  {#each processes.filter((q) => q.ppid === p.pid) as child}
    {@render branch(child, depth + 1)}
  {/each}
{/snippet}

<style>
  .tree, .timeline { list-style: none; padding-left: 0; }
  .timeline li { padding: 4px 0; border-bottom: 1px solid var(--border); display: flex; gap: 8px; align-items: center; }
  .tree li { padding: 2px 0; }
  li.suspicious { background: rgba(248,81,73,0.1); border-left: 2px solid var(--danger); padding-left: 4px; }
  .pill.process { background: #21262d; color: var(--accent); }
  .pill.file { background: #21262d; color: var(--success); }
  .pill.auth { background: #21262d; color: var(--warning); }
</style>
