<script lang="ts" generics="T">
  import { createWindowVirtualizer } from "@tanstack/svelte-virtual";
  import { untrack } from "svelte";

  let {
    items = [],
    itemHeight = 80,
    columns = 1,
    gap = 0,
    class: className = "",
    children,
  }: {
    items: T[];
    itemHeight: number;
    columns: number;
    gap?: number;
    class?: string;
    children: (props: {
      visibleItems: T[];
      topSpacerHeight: number;
      bottomSpacerHeight: number;
    }) => any;
  } = $props();

  let containerEl = $state<HTMLDivElement | null>(null);
  let scrollMargin = $state(0);

  const measure = () => {
    if (!containerEl) return;
    const rect = containerEl.getBoundingClientRect();
    // Only update if visible and actually changed
    if (rect.height > 0) {
      const newMargin = rect.top + window.scrollY;
      if (Math.abs(scrollMargin - newMargin) > 1) {
        scrollMargin = newMargin;
      }
    }
  };

  // Robust measurement using ResizeObserver to catch layout shifts from siblings
  $effect(() => {
    if (!containerEl) return;

    measure();

    // Watch the document body for any layout changes that might push this component down
    const bodyObserver = new ResizeObserver(() => {
      measure();
    });
    bodyObserver.observe(document.body);

    // Also watch the container itself for visibility/size changes
    const containerObserver = new ResizeObserver(() => {
      measure();
    });
    containerObserver.observe(containerEl);

    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);

    return () => {
      bodyObserver.disconnect();
      containerObserver.disconnect();
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  });

  // Measure whenever items change
  $effect(() => {
    items;
    measure();
  });

  const totalRows = $derived(Math.ceil(items.length / columns));

  // Initialize TanStack window virtualizer
  const virtualizer = createWindowVirtualizer({
    count: 0,
    estimateSize: () => itemHeight,
    scrollMargin: 0,
    overscan: 5,
    // Add measureElement for dynamic height support
    measureElement: (el) => el.getBoundingClientRect().height,
  });

  // Keep virtualizer options updated reactively
  $effect(() => {
    untrack(() => $virtualizer).setOptions({
      count: totalRows,
      estimateSize: () => itemHeight,
      scrollMargin,
      overscan: 5,
      measureElement: (el) => el.getBoundingClientRect().height,
    });
  });

  const virtualItems = $derived($virtualizer.getVirtualItems());
  const totalSize = $derived($virtualizer.getTotalSize());

  // Map virtual row indices back to items
  const visibleItems = $derived.by(() => {
    const itemsList = virtualItems;
    if (itemsList.length === 0) return [];
    const startIdx = itemsList[0].index * columns;
    const lastItem = itemsList[itemsList.length - 1];
    const endIdx = Math.min(items.length, (lastItem.index + 1) * columns);
    return items.slice(startIdx, endIdx);
  });

  // Spacer heights (subtracting layouts' gaps)
  const topSpacerHeight = $derived.by(() => {
    const itemsList = virtualItems;
    if (itemsList.length === 0) return 0;
    // The first item's start is absolute, subtract our scrollMargin to get local spacer
    const height = itemsList[0].start - scrollMargin;
    return height > 0 ? height - gap : 0;
  });

  const bottomSpacerHeight = $derived.by(() => {
    const itemsList = virtualItems;
    if (itemsList.length === 0) return 0;
    const lastItem = itemsList[itemsList.length - 1];
    const height = totalSize - (lastItem.start + lastItem.size);
    return height > 0 ? height - gap : 0;
  });
</script>

<div bind:this={containerEl} class={className}>
  {@render children({
    visibleItems,
    topSpacerHeight,
    bottomSpacerHeight,
    virtualizer: $virtualizer,
  })}
</div>
