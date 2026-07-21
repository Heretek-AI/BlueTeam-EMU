<script lang="ts">
  import { page } from '$app/stores';
  import FirewallConsole from '$lib/components/FirewallConsole.svelte';
  const opId = $derived($page.params.id!);
</script>

<h2>Firewall — operation <span class="mono">{opId}</span></h2>
<FirewallConsole operationId={opId} />
