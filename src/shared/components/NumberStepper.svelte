<script>
  let {
    value = $bindable(),
    min = 0,
    max = Infinity,
    step = 1,
    suffix = "",
    onchange = undefined,
    label = "",
  } = $props();
</script>

<div class="w-full">
  <!-- svelte-ignore a11y_label_has_associated_control -->
  <label
    class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block"
  >
    {label}
  </label>
  <div
    class="grid grid-cols-[auto_1fr_auto] items-center bg-(--surface-dim) rounded-xl overflow-hidden h-10 border border-(--c8)"
  >
    <!-- Minus Button -->
    <!-- svelte-ignore a11y_consider_explicit_label -->
    <button
      type="button"
      onclick={() => (value = Math.max(min, value - step))}
      class="px-4 h-full text-slate-400 hover:text-(--hako-fg) hover:bg-(--surface-elevated) transition-colors flex items-center justify-center"
    >
      <i class="fa-solid fa-minus text-xs"></i>
    </button>

    <!-- Value Display -->
    <div
      class="grow flex items-center justify-center text-sm tabular-nums gap-0"
    >
      <input
        type="number"
        bind:value
        {step}
        {min}
        {max}
        {onchange}
        class="w-[3ch] bg-transparent text-(--hako-fg) text-center focus:ring-0 outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      {#if suffix}
        <span class="text-(--c8)">{suffix}</span>
      {/if}
    </div>

    <!-- Plus Button -->
    <!-- svelte-ignore a11y_consider_explicit_label -->
    <button
      type="button"
      onclick={() => (value = Math.min(max, value + step))}
      class="px-4 h-full text-slate-400 hover:text-(--hako-fg) hover:bg-(--surface-elevated) transition-colors flex items-center justify-center"
    >
      <i class="fa-solid fa-plus text-xs"></i>
    </button>
  </div>
</div>
