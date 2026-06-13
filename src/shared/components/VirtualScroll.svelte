<script lang="ts" generics="T">
  import { createWindowVirtualizer } from "@tanstack/svelte-virtual";
  import { untrack } from "svelte";

  let {
    items = [],
    itemHeight = 80,
    columns = 1,
    gap = 0,
    enabled = true,
    class: className = "",
    children,
    fallback,
  }: {
    items: T[];
    itemHeight: number;
    columns: number;
    gap?: number;
    enabled?: boolean;
    class?: string;
    children: (props: {
      visibleItems: T[];
      topSpacerHeight: number;
      bottomSpacerHeight: number;
      virtualizer: any;
    }) => any;
    fallback?: import("svelte").Snippet;
  } = $props();

  let containerEl = $state<HTMLDivElement | null>(null);
  let scrollMargin = $state<number | null>(null);
  let measureQueued = false;

  const measure = (immediate = false) => {
    if (!enabled || !containerEl) return;

    // Skip if the element is hidden (display: none)
    if (containerEl.offsetParent === null) return;

    const perform = () => {
      measureQueued = false;
      if (!enabled || !containerEl || containerEl.offsetParent === null) return;

      const rect = containerEl.getBoundingClientRect();
      const newMargin = rect.top + window.scrollY;
      if (scrollMargin === null || Math.abs(scrollMargin - newMargin) > 1) {
        scrollMargin = newMargin;
      }
    };

    if (immediate) {
      perform();
    } else if (!measureQueued) {
      measureQueued = true;
      requestAnimationFrame(perform);
    }
  };

  // Robust measurement using ResizeObserver
  $effect(() => {
    if (!enabled || !containerEl) return;

    // Immediate measure on mount/enable
    measure(true);

    // We only need to observe the container itself for size/visibility changes.
    // Layout shifts from siblings will be caught by the window resize listener
    // or can be triggered manually if needed. Observing document.body is too expensive.
    const containerObserver = new ResizeObserver(() => measure());
    containerObserver.observe(containerEl);

    const handleResize = () => measure();
    window.addEventListener("resize", handleResize);

    return () => {
      containerObserver.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  });

  // Measure whenever items or enabled status change
  $effect(() => {
    if (enabled) {
      items;
      measure();
    }
  });

  const totalRows = $derived(Math.ceil(items.length / columns));

  // Initialize TanStack window virtualizer
  const virtualizer = createWindowVirtualizer({
    count: 0,
    estimateSize: () => itemHeight,
    scrollMargin: 0,
    overscan: 5,
    measureElement: (el) => el.getBoundingClientRect().height,
  });

  // Keep virtualizer options updated reactively
  $effect(() => {
    if (enabled && scrollMargin !== null) {
      untrack(() => $virtualizer).setOptions({
        count: totalRows,
        estimateSize: () => itemHeight,
        scrollMargin,
        overscan: 5,
        measureElement: (el) => el.getBoundingClientRect().height,
      });
    }
  });

  const virtualItems = $derived(
    enabled && scrollMargin !== null ? $virtualizer.getVirtualItems() : [],
  );
  const totalSize = $derived(
    enabled && scrollMargin !== null ? $virtualizer.getTotalSize() : 0,
  );

  // Map virtual row indices back to items
  const visibleItems = $derived.by(() => {
    if (!enabled || scrollMargin === null) return [];
    const itemsList = virtualItems;
    if (itemsList.length === 0) return [];
    const startIdx = itemsList[0].index * columns;
    const lastItem = itemsList[itemsList.length - 1];
    const endIdx = Math.min(items.length, (lastItem.index + 1) * columns);
    return items.slice(startIdx, endIdx);
  });

  // Spacer heights (subtracting layouts' gaps)
  const topSpacerHeight = $derived.by(() => {
    if (!enabled || scrollMargin === null) return 0;
    const itemsList = virtualItems;
    if (itemsList.length === 0) return 0;
    const height = itemsList[0].start - scrollMargin;
    return height > 0 ? height - gap : 0;
  });

  const bottomSpacerHeight = $derived.by(() => {
    if (!enabled || scrollMargin === null) return 0;
    const itemsList = virtualItems;
    if (itemsList.length === 0) return 0;
    const lastItem = itemsList[itemsList.length - 1];
    const height = totalSize - (lastItem.start + lastItem.size);
    return height > 0 ? height - gap : 0;
  });
</script>

<div bind:this={containerEl} class={className}>
  {#if enabled && scrollMargin !== null}
    {@render children({
      visibleItems,
      topSpacerHeight,
      bottomSpacerHeight,
      virtualizer: $virtualizer,
    })}
  {:else if enabled && fallback}
    {@render fallback()}
  {/if}
</div>
