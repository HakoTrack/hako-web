<script lang="ts">
  let {
    options,
    value = $bindable(),
    onchange,
  } = $props<{
    options: { label: string; value: string }[];
    value: string;
    onchange?: (val: string) => void;
  }>();
</script>

<div
  class="flex bg-(--surface-dim) rounded-lg border border-(--surface-elevated) p-0.5"
>
  {#each options as option}
    <button
      type="button"
      onclick={() => {
        value = option.value;
        if (onchange) onchange(option.value);
      }}
      class="px-3 py-1 text-xs font-bold rounded transition-colors cursor-pointer outline-none focus:ring-0 {value ===
      option.value
        ? 'bg-(--surface-elevated) text-white'
        : 'text-slate-500 hover:text-white'}"
    >
      {option.label}
    </button>
  {/each}
</div>
