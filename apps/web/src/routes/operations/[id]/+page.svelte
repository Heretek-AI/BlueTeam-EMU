<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import HintPanel from '$lib/components/HintPanel.svelte';

  const opId = $derived($page.params.id!);

  let operation = $state<any>(null);
  let payload = $state<any>(null);
  let runs = $state<any[]>([]);
  let activeStep = $state(0);
  let verdict = $state<'tp' | 'fp' | 'benign' | null>(null);
  let note = $state('');
  let mitreTags = $state<string[]>([]);
  let runId = $state<string | null>(null);
  let errorMessage = $state('');
  let submitting = $state(false);
  let operationMitre = $state<string[]>([]);
  let completed = $state(false);
  let loading = $state(true);

  onMount(async () => {
    const { getDb } = await import('$lib/client/db.js');
    const h = await getDb();
    const res = h.db.exec('SELECT payload FROM operations WHERE id = ?', [opId]);
    if (res.length === 0 || res[0]!.values.length === 0) {
      errorMessage = 'Operation not found';
      loading = false;
      return;
    }
    payload = JSON.parse(res[0]!.values[0]![0] as string);
    operation = { id: opId, ...payload };

    // Check for existing active/paused runs
    const runRes = h.db.exec(
      `SELECT id, status, current_step_id FROM runs WHERE operation_id = ? AND user_id = 'local' AND status != 'completed' ORDER BY started_at DESC LIMIT 1`,
      [opId]
    );
    if (runRes.length > 0 && runRes[0]!.values.length > 0) {
      const r = runRes[0]!.values[0]!;
      runId = r[0] as string;
      activeStep = payload.steps.findIndex((s: any) => s.id === r[2]) || 0;
    }
    loading = false;
  });

  const step = $derived(payload?.steps?.[activeStep]);

  async function startRun() {
    errorMessage = '';
    const { startRun: sr } = await import('$lib/client/runs.js');
    try {
      const r = await sr(opId);
      runId = r.id;
      activeStep = 0;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
    }
  }

  async function submitStep() {
    if (!runId || !step) return;
    submitting = true;
    errorMessage = '';
    try {
      const { submitStep: ss } = await import('$lib/client/runs.js');
      await ss(runId, {
        stepId: step.id,
        verdict,
        note,
        mitreTags,
        hintsUsed: 0,
        startedAt: Date.now()
      });
      verdict = null;
      note = '';
      mitreTags = [];
      if (activeStep < (payload?.steps?.length ?? 1) - 1) activeStep += 1;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
    } finally {
      submitting = false;
    }
  }

  async function completeRun() {
    if (!runId) return;
    errorMessage = '';
    try {
      const { completeRun: cr } = await import('$lib/client/runs.js');
      const result = await cr(runId, operationMitre);
      completed = true;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
    }
  }
</script>

{#if loading}
  <p class="muted">Loading…</p>
{:else if !payload}
  <p class="error">{errorMessage || 'Operation not found.'}</p>
{:else}
  <header>
    <h1 class="mono">{opId}</h1>
    <span class="pill medium">{operation.difficulty}</span>
    <span class="muted">{operation.durationMinutes}m · {operation.xp}xp</span>
  </header>
  <p>{operation.summary}</p>

  {#if payload.mitre_techniques?.length}
    <p class="muted mono">MITRE: {payload.mitre_techniques.join(', ')}</p>
  {/if}

  <h3>Steps</h3>
  <ol>
    {#each payload.steps as s, i}
      <li class:active={i === activeStep}>
        <strong>{s.prompt}</strong>
        <span class="muted mono">[{s.console_focus ?? 'any'}]</span>
        {#if i < activeStep}<span class="success">✓ submitted</span>{/if}
      </li>
    {/each}
  </ol>

  {#if !runId}
    <button onclick={startRun}>Start run</button>
    {#if errorMessage}<span class="error">{errorMessage}</span>{/if}
  {:else if !completed}
    {#if step}
      <section class="step">
        <h3>Step {activeStep + 1}: {step.prompt}</h3>

        <div class="row">
          <label><input type="radio" name="verdict" value="tp" onchange={() => (verdict = 'tp')} /> True positive</label>
          <label><input type="radio" name="verdict" value="fp" onchange={() => (verdict = 'fp')} /> False positive</label>
          <label><input type="radio" name="verdict" value="benign" onchange={() => (verdict = 'benign')} /> Benign</label>
        </div>

        <label>
          Note (indicators you noticed)
          <textarea bind:value={note} rows="3"></textarea>
        </label>

        <details>
          <summary>MITRE tags (optional here, required at completion)</summary>
          <input bind:value={mitreTags} placeholder="T1078,T1566.001" onchange={(e) => mitreTags = (e.currentTarget as HTMLInputElement).value.split(',').map((s) => s.trim()).filter(Boolean)} />
        </details>

        <HintPanel step={step} onReveal={() => {}} />

        <button onclick={submitStep} disabled={!verdict || submitting}>Submit step</button>
        {#if errorMessage}<span class="error">{errorMessage}</span>{/if}
      </section>
    {/if}

    {#if activeStep === (payload.steps?.length ?? 1) - 1}
      <section class="complete">
        <h3>Final MITRE tag set (required)</h3>
        <input bind:value={operationMitre} placeholder="T1566.001,T1059.001,T1078" onchange={(e) => operationMitre = (e.currentTarget as HTMLInputElement).value.split(',').map((s) => s.trim()).filter(Boolean)} />
        <button onclick={completeRun} disabled={operationMitre.length === 0}>
          Complete run
        </button>
        {#if errorMessage}<span class="error">{errorMessage}</span>{/if}
      </section>
    {/if}
  {:else}
    <p class="success">Run completed. Visit <a href="/reports">/reports</a> to see your radar.</p>
  {/if}
{/if}

<style>
  header { display: flex; align-items: center; gap: 12px; }
  ol { padding-left: 20px; }
  li.active { font-weight: 600; }
  .step { margin-top: 16px; display: flex; flex-direction: column; gap: 8px; }
  .complete { margin-top: 24px; }
</style>
