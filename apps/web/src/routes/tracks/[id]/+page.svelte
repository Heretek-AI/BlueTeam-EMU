<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { waitForHydration } from '$lib/client/db.js';

  let track = $state<any>(null);
  let ops = $state<any[]>([]);
  let completed = $state(false);
  let gatingState = $state(new Map<string, boolean>());
  let enrolling = $state(false);

  onMount(async () => {
    await waitForHydration();
    const { getTrackDetail, enroll } = await import('$lib/client/tracks.js');
    const detail = await getTrackDetail($page.params.id!);
    track = detail.track;
    ops = detail.operations;
    completed = detail.completed;
    gatingState = detail.gatingState;
  });

  function getBestScore() {
    return 0; // simplified — real implementation would query runs
  }

  function isOpen(i: number) {
    if (i === 0) return true;
    const prev = ops[i - 1];
    return prev && gatingState.get(prev.id);
  }
</script>

{#if !track}
  <p class="muted">Loading…</p>
{:else}
  <h1>{track.title}</h1>
  <p>{track.summary}</p>
  <p>Threshold: <strong>{track.threshold}</strong> · {#if completed}<span class="success">Completed</span>{:else}Not yet{/if}</p>

  <ol>
    {#each ops as op, i}
      <li>
        {#if gatingState.get(op.id)}
          ✓
        {:else if isOpen(i)}
          <a href={`/operations/${op.id}`}>start {op.title}</a>
        {:else}
          <span class="muted">🔒 locked (pass prior op first)</span>
        {/if}
        <span class="muted mono">{op.id}</span>
        {#if gatingState.get(op.id)}<span class="success">passed</span>{/if}
      </li>
    {/each}
  </ol>
{/if}
