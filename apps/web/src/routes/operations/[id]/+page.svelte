<script lang="ts">
  import HintPanel from '$lib/components/HintPanel.svelte';
  let { data } = $props();

  let activeStep = $state(0);
  let verdict = $state<'tp' | 'fp' | 'benign' | null>(null);
  let note = $state('');
  let mitreTags = $state<string[]>([]);
  let runId = $state<string | null>(data.runs.find((r: any) => r.status === 'active')?.id ?? null);
  let errorMessage = $state('');
  let submitting = $state(false);
  let operationMitre = $state<string[]>([]);
  let completionInProgress = $state(false);
  let completed = $state(false);

  const step = $derived(data.payload.steps[activeStep]);

  async function startRun() {
    errorMessage = '';
    const res = await fetch(`/api/operations/${data.operation.id}/start`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}'
    });
    if (!res.ok) {
      errorMessage = await res.text();
      return;
    }
    const j = await res.json();
    runId = j.id;
  }

  async function submitStep() {
    if (!runId) return;
    submitting = true;
    errorMessage = '';
    try {
      const res = await fetch(`/api/runs/${runId}/step`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          stepId: step.id,
          verdict,
          note,
          mitreTags
        })
      });
      if (!res.ok) { errorMessage = await res.text(); return; }
      verdict = null;
      note = '';
      mitreTags = [];
      if (activeStep < data.payload.steps.length - 1) activeStep += 1;
    } finally { submitting = false; }
  }

  async function complete() {
    if (!runId) return;
    completionInProgress = true;
    errorMessage = '';
    try {
      const res = await fetch(`/api/runs/${runId}/complete`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ finalMitre: operationMitre })
      });
      const j = await res.json();
      if (!res.ok) { errorMessage = j?.error ?? await res.text(); return; }
      completed = true;
    } finally { completionInProgress = false; }
  }
</script>

<header>
  <h1 class="mono">{data.operation.id}</h1>
  <span class="pill medium">{data.operation.difficulty}</span>
  <span class="muted">{data.operation.durationMinutes}m · {data.operation.xp}xp</span>
</header>
<p>{data.operation.summary}</p>

<h3>Steps</h3>
<ol>
  {#each data.payload.steps as s, i}
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

    <HintPanel {step} />

    <button onclick={submitStep} disabled={!verdict || submitting}>Submit step</button>
    {#if errorMessage}<span class="error">{errorMessage}</span>{/if}
  </section>

  {#if activeStep === data.payload.steps.length - 1}
    <section class="complete">
      <h3>Final MITRE tag set (required)</h3>
      <input bind:value={operationMitre} placeholder="T1566.001,T1059.001,T1078" onchange={(e) => operationMitre = (e.currentTarget as HTMLInputElement).value.split(',').map((s) => s.trim()).filter(Boolean)} />
      <button onclick={complete} disabled={operationMitre.length === 0 || completionInProgress}>
        Complete run
      </button>
      {#if errorMessage}<span class="error">{errorMessage}</span>{/if}
    </section>
  {/if}
{:else}
  <p class="success">Run completed. Visit <a href="/reports">/reports</a> to see your radar.</p>
{/if}

<style>
  header { display: flex; align-items: center; gap: 12px; }
  ol { padding-left: 20px; }
  li.active { font-weight: 600; }
  .step { margin-top: 16px; display: flex; flex-direction: column; gap: 8px; }
  .complete { margin-top: 24px; }
</style>
