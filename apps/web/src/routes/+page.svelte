<script lang="ts">
  let { data } = $props();
</script>

<h1>BlueTeam-EMU</h1>
<p class="muted">A SOC simulator. Practice investigations, follow tracks, earn a competency radar.</p>

<div class="row" style="margin-top:24px; gap:24px;">
  <div>
    <div class="muted">Operations</div>
    <div style="font-size:28px;">{data.opCount}</div>
  </div>
  <div>
    <div class="muted">Tracks</div>
    <div style="font-size:28px;">{data.trackCount}</div>
  </div>
  <div>
    <div class="muted">Tracks completed</div>
    <div style="font-size:28px;">{data.completionCount}</div>
  </div>
</div>

<h2 style="margin-top:32px;">Get started</h2>
<ul>
  <li><a href="/operations">Browse operations</a></li>
  <li><a href="/tracks">Pick a learning track</a></li>
  <li><a href="/reports">See your radar</a></li>
</ul>
