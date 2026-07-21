<script lang="ts">
  import { page } from '$app/stores';
  import SiemConsole from '$lib/components/SiemConsole.svelte';
  const opId = $derived($page.params.id!);
</script>

<h2>SIEM — operation <span class="mono">{opId}</span></h2>
<SiemConsole operationId={opId} />
