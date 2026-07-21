<script lang="ts">
  let { data } = $props();
</script>

<h1>Operations</h1>
<p class="muted">Pick an investigation to start a run.</p>

<table>
  <thead>
    <tr><th>id</th><th>title</th><th>difficulty</th><th>duration</th><th>xp</th><th>MITRE</th><th></th></tr>
  </thead>
  <tbody>
    {#each data.operations as op}
      <tr>
        <td class="mono">{op.id}</td>
        <td>{op.title}</td>
        <td><span class="pill medium">{op.difficulty}</span></td>
        <td>{op.durationMinutes}m</td>
        <td>{op.xp}</td>
        <td class="mono">{JSON.parse(op.payload).mitre_techniques.join(', ')}</td>
        <td><a href={`/operations/${op.id}`}>open</a></td>
      </tr>
    {/each}
  </tbody>
</table>
