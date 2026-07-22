<script lang="ts">
  import { onMount } from 'svelte';
  import { waitForHydration } from '$lib/client/hydration.js';
  import RadarChart from '$lib/components/RadarChart.svelte';

  let userRadar = $state<any>(null);
  let byOp = $state<Record<string, any>>({});
  let loading = $state(true);

  onMount(async () => {
    await waitForHydration();
    const { getUserRadar } = await import('$lib/client/radar.js');
    const result = await getUserRadar();
    userRadar = result.user;
    byOp = result.byOperation;
    loading = false;
  });
</script>

<h1>Reports</h1>

{#if loading}
  <p class="muted">Loading…</p>
{:else}
  <section>
    <h2>Per-user radar</h2>
    {#if userRadar}
      <RadarChart perAxis={userRadar.perAxis} composite={userRadar.composite} scope="user" />
    {:else}
      <p class="muted">No data yet. Complete an operation to see your radar.</p>
    {/if}
  </section>

  <section>
    <h2>Per-operation</h2>
    {#each Object.entries(byOp) as [opId, agg]}
      <div class="op">
        <h3 class="mono">{opId}</h3>
        <RadarChart perAxis={agg.perAxis} composite={agg.composite} scope="operation" />
      </div>
    {/each}
  </section>
{/if}
