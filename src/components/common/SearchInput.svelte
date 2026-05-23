<script lang="ts">
  let {
    value = $bindable(""),
    placeholder = "Search...",
    label = "",
    oninput,
    inputRef = $bindable(null),
  } = $props<{
    value?: string;
    placeholder?: string;
    label?: string;
    oninput?: (e: Event) => void;
    inputRef?: HTMLInputElement | null;
  }>();

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    value = target.value;
    oninput?.(e);
  }

  function clear() {
    value = "";
    // Manually trigger oninput to ensure any linked logic (like resetting limits) fires
    oninput?.(new Event("input"));
  }
</script>

<div class="w-full">
  {#if label}
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <label
      class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block"
    >
      {label}
    </label>
  {/if}
  <div class="relative group">
    <div
      class="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--c8) group-focus-within:text-(--hako-accent) transition-colors pointer-events-none"
    >
      <i class="fa-solid fa-search text-xs"></i>
    </div>
    <input
      bind:this={inputRef}
      type="text"
      {placeholder}
      {value}
      oninput={handleInput}
      class="w-full h-10 bg-(--surface-dim) border border-(--c8) rounded-xl pl-10 pr-10 text-sm text-(--hako-fg) placeholder:text-slate-600 focus:border-(--hako-accent) outline-none transition-all"
    />
    {#if value}
      <button
        type="button"
        onclick={clear}
        class="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-(--c8) hover:text-(--hako-fg) transition-colors rounded-lg"
        aria-label="Clear search"
      >
        <i class="fa-solid fa-circle-xmark text-xs"></i>
      </button>
    {/if}
  </div>
</div>
