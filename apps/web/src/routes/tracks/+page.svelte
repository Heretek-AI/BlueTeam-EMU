<script lang="ts">
  import { onMount } from 'svelte';
  import { waitForHydration } from '$lib/client/hydration.js';

  let tracks = $state<any[]>([]);
  onMount(async () => {
    await waitForHydration();
    const { listTracks } = await import('$lib/client/tracks.js');
    tracks = await listTracks();
  });
</script>

<h1>Learning tracks</h1>
{#each tracks as t}
  <section>
    <h2>{t.title}</h2>
    <p class="muted">{t.summary}</p>
    <p>Threshold: <strong>{t.threshold}</strong> · Difficulty: <span class="pill medium">{t.difficulty}</span></p>
    <a href={`/tracks/${t.id}`}>open</a>
  </section>
{/each}
