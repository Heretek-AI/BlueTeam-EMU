<script lang="ts">
  import { onMount } from 'svelte';

  let ops = $state<any[]>([]);
  onMount(async () => {
    const { getDb } = await import('$lib/client/db.js');
    const h = await getDb();
    const res = h.db.exec('SELECT id, title, summary, difficulty, duration_minutes, xp, payload FROM operations ORDER BY title');
    ops = (res[0]?.values ?? []).map((r: any) => ({
      id: r[0],
      title: r[1],
      summary: r[2],
      difficulty: r[3],
      durationMinutes: r[4],
      xp: r[5],
      payload: JSON.parse(r[6] ?? '{}')
    }));
  });
</script>

<h1>Operations</h1>
<p class="muted">Pick an investigation to start a run.</p>

<table>
  <thead>
    <tr><th>id</th><th>title</th><th>difficulty</th><th>duration</th><th>xp</th><th>MITRE</th><th></th></tr>
  </thead>
  <tbody>
    {#each ops as op}
      <tr>
        <td class="mono">{op.id}</td>
        <td>{op.title}</td>
        <td><span class="pill medium">{op.difficulty}</span></td>
        <td>{op.durationMinutes}m</td>
        <td>{op.xp}</td>
        <td class="mono">{(op.payload.mitre_techniques ?? []).join(', ')}</td>
        <td><a href={`/operations/${op.id}`}>open</a></td>
      </tr>
    {/each}
  </tbody>
</table>
