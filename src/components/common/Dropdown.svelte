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
        middleware: [offset(10), flip(), shift()],
        strategy: "absolute",
      }).then(({ x, y }) => {
        Object.assign(dropdownRef.style, {
          left: `${x}px`,
          top: `${y}px`,
        });
      });
    }
  }

  function toggle() {
    isOpen = !isOpen;
    if (isOpen) {
      // Use requestAnimationFrame to ensure the element is rendered before positioning
      requestAnimationFrame(updatePosition);
    }
  }

  // Handle click outside to close
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

<div bind:this={triggerRef} class="relative inline-block">
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div onclick={toggle}>
    {@render children?.()}
  </div>

  {#if isOpen}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      bind:this={dropdownRef}
      class="absolute w-48 pt-2 bg-nav rounded-br-lg rounded-bl-lg animate-in fade-in zoom-in-95 z-30"
      onclick={() => (isOpen = false)}
    >
      {#each items as item}
        <button
          onclick={item.action}
          class="w-full flex items-center px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
        >
          <i class="fa-solid {item.icon} mr-3 w-4 text-center text-slate-500"
          ></i>
          {item.label}
        </button>
      {/each}
    </div>
  {/if}
</div>
