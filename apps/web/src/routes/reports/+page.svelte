<script lang="ts">
  import RadarChart from '$lib/components/RadarChart.svelte';
  let { data } = $props();
</script>

<h1>Reports</h1>

<section>
  <h2>Per-user radar</h2>
  <RadarChart perAxis={data.perAxis} composite={data.composite} scope="user" />
</section>

<section>
  <h2>Per-operation</h2>
  {#each Object.entries(data.perAxisByOp) as [opId, agg]}
    <div class="op">
      <h3 class="mono">{opId}</h3>
      <RadarChart perAxis={agg.perAxis} composite={agg.composite} scope="operation" />
    </div>
  {/each}
</section>
