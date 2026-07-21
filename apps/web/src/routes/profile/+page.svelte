<script lang="ts">
  import { onMount } from 'svelte';

  let displayName = $state('');
  let status = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
  let errorMessage = $state('');

  onMount(async () => {
    const res = await fetch('/api/profile');
    const j = await res.json();
    displayName = j.displayName;
  });

  async function save(e: SubmitEvent) {
    e.preventDefault();
    status = 'saving';
    errorMessage = '';
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ displayName })
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'save failed');
      }
      status = 'saved';
      setTimeout(() => (status = 'idle'), 1500);
    } catch (err) {
      status = 'error';
      errorMessage = err instanceof Error ? err.message : String(err);
    }
  }
</script>

<form onsubmit={save}>
  <label>
    Display name
    <input bind:value={displayName} required maxlength="64" />
  </label>
  <button type="submit" disabled={status === 'saving'}>Save</button>
  {#if status === 'saved'}<span>Saved</span>{/if}
  {#if status === 'error'}<span class="err">{errorMessage}</span>{/if}
</form>
