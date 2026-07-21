<script lang="ts">
  import { AXES, AXIS_META } from '@blueteam-emu/grading';

  let { perAxis, composite, scope = 'user' }: { perAxis: Record<string, number>; composite: number; scope?: 'user' | 'track' | 'operation' } = $props();

  const cx = 200;
  const cy = 200;
  const radius = 140;

  function point(axisIndex: number, value: number) {
    const angle = (axisIndex / AXES.length) * Math.PI * 2 - Math.PI / 2;
    const r = (value / 100) * radius;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  }

  const polyPoints = $derived(
    AXES.map((axis, i) => {
      const v = perAxis[axis] ?? 0;
      const p = point(i, v);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(' ')
  );

  function labelPos(i: number) {
    const angle = (i / AXES.length) * Math.PI * 2 - Math.PI / 2;
    return {
      x: cx + (radius + 18) * Math.cos(angle),
      y: cy + (radius + 18) * Math.sin(angle)
    };
  }
</script>

<svg viewBox="0 0 400 400" width="400" height="400" aria-label={`${scope} competency radar`}>
  <!-- gridlines at 25/50/75/100 -->
  {#each [25, 50, 75, 100] as g}
    <polygon
      points={AXES.map((_, i) => {
        const p = point(i, g);
        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      }).join(' ')}
      fill="none"
      stroke="#30363d"
      stroke-width="1"
    />
  {/each}
  <!-- axis lines -->
  {#each AXES as _, i}
    {@const p = point(i, 100)}
    <line x1={cx} y1={cy} x2={p.x.toFixed(1)} y2={p.y.toFixed(1)} stroke="#30363d" />
  {/each}
  <!-- axis labels -->
  {#each AXES as axis, i}
    {@const lp = labelPos(i)}
    <text x={lp.x.toFixed(1)} y={lp.y.toFixed(1)} fill="#c9d1d9" font-size="11" text-anchor="middle" dominant-baseline="middle">
      {AXIS_META[axis].label}
    </text>
  {/each}
  <!-- polygon -->
  <polygon points={polyPoints} fill="rgba(47,129,247,0.3)" stroke="#2f81f7" stroke-width="2" />
  <!-- vertices -->
  {#each AXES as axis, i}
    {@const v = perAxis[axis] ?? 0}
    {@const p = point(i, v)}
    <circle cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="3" fill="#2f81f7">
      <title>{AXIS_META[axis].label}: {v}/100 — {AXIS_META[axis].description}</title>
    </circle>
  {/each}
  <!-- composite -->
  <text x={cx} y={cy + 8} fill="#c9d1d9" font-size="14" text-anchor="middle" dominant-baseline="middle">
    {Math.round(composite)}
  </text>
</svg>
