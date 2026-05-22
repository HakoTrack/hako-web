<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  let { items = [], value = $bindable(), label = "", onchange } = $props();
  let isOpen = $state(false);
  let containerRef = $state<HTMLElement | null>(null);

  function toggle() {
    isOpen = !isOpen;
  }

  function selectItem(val: any) {
    value = val;
    isOpen = false;
    if (onchange) onchange(val);
  }

  function handleClickOutside(event) {
    if (isOpen && containerRef && !containerRef.contains(event.target)) {
      isOpen = false;
    }
  }

  onMount(() => {
    window.addEventListener("click", handleClickOutside, true);
  });

  onDestroy(() => {
    window.removeEventListener("click", handleClickOutside, true);
  });
</script>

<div bind:this={containerRef} class="relative w-full">
  <!-- svelte-ignore a11y_label_has_associated_control -->
  <label
    class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block"
  >
    {label}
  </label>
  <button
    type="button"
    onclick={toggle}
    class="w-full h-10 flex justify-between items-center bg-(--surface-dim) text-(--hako-fg) text-sm rounded-xl border border-(--c8) p-3 focus:border-(--hako-accent) outline-none"
  >
    <span>{items.find((i) => i.value === value)?.label || "Select..."}</span>
    <i class="fa-solid fa-chevron-down text-xs text-(--c8)"></i>
  </button>

  {#if isOpen}
    <div
      class="absolute z-20 w-full p-2 mt-1 bg-(--surface) border border-(--c8) rounded-xl shadow-2xl py-1"
    >
      {#each items as item}
        <button
          type="button"
          onclick={() => selectItem(item.value)}
          class="w-full text-left px-4 p-2 rounded-xl text-sm text-(--hako-fg) hover:bg-(--surface-elevated) hover:text-(--hako-fg) transition-colors"
        >
          {item.label}
        </button>
      {/each}
    </div>
  {/if}
</div>
