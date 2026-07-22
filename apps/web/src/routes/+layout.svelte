<script lang="ts">
  import { onMount } from 'svelte';
  import '../app.css';
  import TopBar from '$lib/components/TopBar.svelte';
  import LeftRail from '$lib/components/LeftRail.svelte';
  import { page } from '$app/stores';
  let { children } = $props();

  const showShell = $derived(!['/profile'].includes($page.url.pathname));

  onMount(async () => {
    const { initApp } = await import('$lib/client/boot.js');
    await initApp();
  });
</script>

{#if showShell}
  <div class="shell">
    <TopBar />
    <div class="layout">
      <LeftRail />
      <main class="content">
        {@render children?.()}
      </main>
    </div>
  </div>
{:else}
  {@render children?.()}
{/if}
