<script lang="ts">
  import { page } from '$app/stores';
  import XdrConsole from '$lib/components/XdrConsole.svelte';
  const opId = $derived($page.params.id!);
  let host = $state($page.url.searchParams.get('host') ?? '');
</script>

<h2>XDR — operation <span class="mono">{opId}</span></h2>
<input bind:value={host} placeholder="host (e.g. WS01)" />
{#if host}
  <XdrConsole operationId={opId} {host} />
{/if}
