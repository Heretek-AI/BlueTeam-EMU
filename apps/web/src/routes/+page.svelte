<script lang="ts">
  import { onMount } from 'svelte';
  import { waitForHydration } from '$lib/client/hydration.js';

  let opCount = $state(0);
  let trackCount = $state(0);
  let completionCount = $state(0);

  onMount(async () => {
    await waitForHydration();
    const { getDb } = await import('$lib/client/db.js');
    const h = await getDb();
    const res = h.db.exec('SELECT COUNT(*) FROM operations');
    opCount = (res[0]?.values?.[0]?.[0] ?? 0) as number;
    const tr = h.db.exec('SELECT COUNT(*) FROM tracks');
    trackCount = (tr[0]?.values?.[0]?.[0] ?? 0) as number;
    const cr = h.db.exec("SELECT COUNT(*) FROM track_completions WHERE user_id = 'local'");
    completionCount = (cr[0]?.values?.[0]?.[0] ?? 0) as number;
  });
</script>

<h1>BlueTeam-EMU</h1>
<p class="muted">A SOC simulator. Practice investigations, follow tracks, earn a competency radar.</p>

<div class="row" style="margin-top:24px; gap:24px;">
  <div>
    <div class="muted">Operations</div>
    <div style="font-size:28px;">{opCount}</div>
  </div>
  <div>
    <div class="muted">Tracks</div>
    <div style="font-size:28px;">{trackCount}</div>
  </div>
  <div>
    <div class="muted">Tracks completed</div>
    <div style="font-size:28px;">{completionCount}</div>
  </div>
</div>

<h2 style="margin-top:32px;">Get started</h2>
<ul>
  <li><a href="/operations">Browse operations</a></li>
  <li><a href="/tracks">Pick a learning track</a></li>
  <li><a href="/reports">See your radar</a></li>
</ul>
