<script lang="ts">
  let { data } = $props();
</script>

<h1>{data.track.title}</h1>
<p>{data.track.summary}</p>
<p>Threshold: <strong>{data.threshold}</strong> · {#if data.trackCompleted}<span class="success">Completed</span>{:else}Not yet{/if}</p>

<ol>
  {#each data.operations as l, i}
    <li>
      {#if l.op}
        {#if (data.bestScoreByOp[l.op.id] ?? 0) >= data.threshold}
          ✓
        {:else if i === 0 || (data.bestScoreByOp[data.operations[i-1].op?.id ?? ''] ?? 0) >= data.threshold}
          <a href={`/operations/${l.op.id}`}>start {l.op.title}</a>
        {:else}
          <span class="muted">🔒 locked (pass prior op first)</span>
        {/if}
        <span class="muted mono">{l.op.id}</span>
        {#if (data.bestScoreByOp[l.op.id] ?? 0) >= data.threshold}
          <span class="success">passed</span>
        {/if}
      {/if}
    </li>
  {/each}
</ol>
