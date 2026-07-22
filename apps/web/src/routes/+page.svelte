<script lang="ts">
  import { onMount } from 'svelte';

  let opCount = $state(0);
  let trackCount = $state(0);
  let completionCount = $state(0);

  onMount(async () => {
    const [tracks, completions, ops] = await Promise.all([
      import('$lib/client/tracks.js').then((m) => m.listTracks()),
      import('$lib/client/db.js').then(() =>
        // getDb initializes, then we count track completions
        import('$lib/client/tracks.js').then((m) => m.getTrackDetail).then()
      ),
      import('$lib/client/db.js').then(async ({ getDb }) => {
        const h = await getDb();
        const r = h.db.exec('SELECT COUNT(*) FROM operations');
        return (r[0]?.values?.[0]?.[0] ?? 0) as number;
      })
    ]);
    opCount = ops;
    // Track completions from db
    const h = await (await import('$lib/client/db.js')).getDb();
    const cr = h.db.exec("SELECT COUNT(*) FROM track_completions WHERE user_id = 'local'");
    completionCount = (cr[0]?.values?.[0]?.[0] ?? 0) as number;
    const tr = h.db.exec('SELECT COUNT(*) FROM tracks');
    trackCount = (tr[0]?.values?.[0]?.[0] ?? 0) as number;
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
