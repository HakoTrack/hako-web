<script>
  import { onMount, onDestroy } from "svelte";
  import { computePosition, flip, shift, offset } from "@floating-ui/dom";

  let { items = [], children } = $props();
  let isOpen = $state(false);
  let triggerRef = $state(null);
  let dropdownRef = $state(null);

  function updatePosition() {
    if (isOpen && triggerRef && dropdownRef) {
      computePosition(triggerRef, dropdownRef, {
        middleware: [offset(12), flip(), shift()],
        strategy: "absolute",
      }).then(({ x, y }) => {
        Object.assign(dropdownRef.style, {
          left: `${x}px`,
          top: `${y}px`,
        });
      });
    }
  }

  function toggle(e) {
    e.stopPropagation();
    isOpen = !isOpen;
    if (isOpen) {
      requestAnimationFrame(updatePosition);
    }
  }

  function handleClickOutside(event) {
    if (
      isOpen &&
      dropdownRef &&
      !dropdownRef.contains(event.target) &&
      triggerRef &&
      !triggerRef.contains(event.target)
    ) {
      isOpen = false;
    }
  }

  onMount(() => {
    window.addEventListener("click", handleClickOutside);
  });

  onDestroy(() => {
    window.removeEventListener("click", handleClickOutside);
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div bind:this={triggerRef} class="relative inline-block" onclick={toggle}>
  {@render children?.()}

  {#if isOpen}
    <div
      bind:this={dropdownRef}
      class="absolute w-48 py-2 p-2 bg-(--surface) border border-(--c8) rounded-xl shadow-2xl z-100 animate-in fade-in zoom-in-95 duration-100"
      onclick={(e) => e.stopPropagation()}
    >
      {#each items as item}
        <button
          onclick={() => {
            item.action();
            isOpen = false;
          }}
          class="w-full flex items-center px-4 rounded-xl py-2.5 text-sm text-(--hako-fg) hover:bg-(--surface-elevated) hover:text-(--hako-fg) transition-colors"
        >
          <i class="fa-solid {item.icon} mr-3 w-4 text-center text-(--c8)"></i>
          {item.label}
        </button>
      {/each}
    </div>
  {/if}
</div>
