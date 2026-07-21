<script lang="ts">
  let { data } = $props();
</script>

<h1>Learning tracks</h1>

{#each data.tracks as t}
  <section>
    <h2>{t.title}</h2>
    <p class="muted">{t.summary}</p>
    <p>Threshold: <strong>{t.threshold}</strong> · Difficulty: <span class="pill medium">{t.difficulty}</span></p>
    <a href={`/tracks/${t.id}`}>open</a>
  </section>
{/each}
