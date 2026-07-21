<script lang="ts">
  import { onMount } from 'svelte';

  let { step, onReveal }: { step: any; onReveal?: () => void } = $props();

  let timer = $state(0);
  let revealed = $state(0);
  let interval: ReturnType<typeof setInterval>;

  onMount(() => {
    interval = setInterval(() => (timer += 1), 1000);
    return () => clearInterval(interval);
  });

  function shouldShow(i: number) {
    if (i === 0) return timer >= (step.hints_after_seconds ?? 30);
    const prev = step.hints[i - 1].after_seconds;
    const interval_ = step.hints_interval_seconds ?? 60;
    return timer >= prev + interval_ * i;
  }
</script>

<section class="hints">
  <h3>Hints</h3>
  <p class="muted">Revealed over time. Each revealed hint costs {step.hint_penalty_percent ?? 10}% of the methodology axis.</p>
  <ol>
    {#each step.hints ?? [] as h, i}
      <li>
        {#if shouldShow(i)}
          <span class="pill low">shown</span> {h.text}
        {:else}
          <span class="muted">locked</span>
          <span class="muted mono">at +{h.after_seconds}s</span>
        {/if}
      </li>
    {/each}
  </ol>
</section>

<style>
  .hints { padding: 8px 12px; background: #161b22; border-radius: 6px; }
  .hints ol { padding-left: 20px; }
  .hints li { margin: 4px 0; }
</style>
