<script lang="ts">
  import { onMount } from 'svelte';

  let displayName = $state('');
  let open = $state(false);

  onMount(async () => {
    const res = await fetch('/api/profile');
    if (res.ok) {
      const j = await res.json();
      displayName = j.displayName;
    }
  });
</script>

<header class="topbar">
  <a href="/" class="brand">BlueTeam<strong>EMU</strong></a>
  <span class="muted">›</span>
  <span class="scenario-label">SOC simulator</span>
  <div style="flex:1"></div>
  <button class="cmd" onclick={() => (open = !open)} title="Command palette">
    <span class="mono">⌘K</span>
  </button>
  <details>
    <summary class="muted">{displayName || 'profile'}</summary>
    <div class="dropdown">
      <a href="/profile">Edit display name</a>
    </div>
  </details>
  {#if open}
    <div class="palette">
      <input placeholder="Jump to a console, command, or page…" autofocus />
      <ul>
        <li><a href="/operations">Operations</a></li>
        <li><a href="/tracks">Tracks</a></li>
        <li><a href="/reports">Reports</a></li>
      </ul>
    </div>
  {/if}
</header>

<style>
  .brand { color: var(--fg); }
  .brand strong { color: var(--accent); }
  .scenario-label { color: var(--muted); }
  .cmd { padding: 2px 6px; }
  details summary { cursor: pointer; list-style: none; }
  details summary::-webkit-details-marker { display: none; }
  .dropdown {
    position: absolute;
    top: 48px;
    right: 16px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px;
    z-index: 50;
  }
  .palette {
    position: absolute;
    top: 56px;
    right: 16px;
    width: 360px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px;
    z-index: 50;
  }
  .palette ul { list-style: none; margin: 8px 0 0; padding: 0; }
  .palette li { padding: 4px 8px; }
  .palette li:hover { background: #21262d; }
</style>
