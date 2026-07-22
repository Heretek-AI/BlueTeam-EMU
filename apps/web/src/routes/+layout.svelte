<script lang="ts">
  import '../app.css';
  import TopBar from '$lib/components/TopBar.svelte';
  import LeftRail from '$lib/components/LeftRail.svelte';
  import { page } from '$app/stores';
  let { children } = $props();

  const showShell = $derived(!['/profile'].includes($page.url.pathname));

  let ready = $state(false);

  onMount(async () => {
    const { initApp } = await import('$lib/client/boot.js');
    await initApp();
    ready = true;
  });

  import { onMount } from 'svelte';
</script>

{#if !ready}
  <div class="shell">
    <div class="content" style="display:flex;align-items:center;justify-content:center;height:100vh">
      <p class="muted">Loading…</p>
    </div>
  </div>
{:else if showShell}
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

<style>
  .content { padding-top: 8px; }
</style>
