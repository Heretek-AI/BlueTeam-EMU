<script lang="ts">
  import { onMount } from 'svelte';
  import { getLocalUser, setLocalDisplayName, getGithubPat, setGithubPat, clearGithubPat, resetAllLocalData } from '$lib/client/localUser.js';

  let displayName = $state('');
  let pat = $state('');
  let status = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
  let errorMessage = $state('');

  onMount(async () => {
    const u = await getLocalUser();
    if (u) {
      displayName = u.displayName;
    }
    pat = getGithubPat() ?? '';
  });

  async function save(e: SubmitEvent) {
    e.preventDefault();
    status = 'saving';
    errorMessage = '';
    try {
      await setLocalDisplayName(displayName);
      if (pat) setGithubPat(pat);
      else clearGithubPat();
      status = 'saved';
      setTimeout(() => (status = 'idle'), 1500);
    } catch (err) {
      status = 'error';
      errorMessage = err instanceof Error ? err.message : String(err);
    }
  }

  let confirmingClear = $state(false);
  async function clearAll() {
    if (!confirm('Delete all local data? This cannot be undone.')) return;
    await resetAllLocalData();
    window.location.reload();
  }
</script>

<h1>Profile</h1>

<form onsubmit={save}>
  <label>
    Display name
    <input bind:value={displayName} required maxlength="64" />
  </label>

  <label>
    GitHub PAT (optional — for private repo scenario sync)
    <input bind:value={pat} type="password" placeholder="github_pat_..." />
  </label>

  <button type="submit" disabled={status === 'saving'}>Save</button>
  {#if status === 'saved'}<span class="success">Saved</span>{/if}
  {#if status === 'error'}<span class="error">{errorMessage}</span>{/if}
</form>

<section>
  <h2>Danger zone</h2>
  <button onclick={clearAll} class="danger">Clear all data and reset</button>
  <p class="muted">Deletes your runs, saved searches, and profile from IndexedDB.</p>
</section>

<style>
  form { display: flex; flex-direction: column; gap: 12px; max-width: 480px; }
  .danger { background: var(--danger); color: #fff; }
</style>
