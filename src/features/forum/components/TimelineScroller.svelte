<script lang="ts">
  import { untrack } from "svelte";

  let {
    scrollMargin,
    totalSize,
  }: {
    scrollMargin: number;
    totalSize: number;
  } = $props();

  let isDragging = $state(false);
  let trackEl = $state<HTMLDivElement | null>(null);
  let fraction = $state(0);

  function updateFraction() {
    const range = totalSize;
    if (range <= 0) {
      fraction = 0;
      return;
    }
    const scrolled = window.scrollY - scrollMargin;
    fraction = Math.max(0, Math.min(1, scrolled / range));
  }

  function handleDragStart(e: MouseEvent) {
    if (!trackEl) return;
    isDragging = true;
    handleDrag(e);
    window.addEventListener("mousemove", handleDrag);
    window.addEventListener("mouseup", handleDragEnd);
  }

  function handleDrag(e: MouseEvent) {
    if (!trackEl) return;
    const rect = trackEl.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const pct = Math.max(0, Math.min(1, y / rect.height));
    window.scrollTo(0, scrollMargin + pct * totalSize);
  }

  function handleDragEnd() {
    isDragging = false;
    window.removeEventListener("mousemove", handleDrag);
    window.removeEventListener("mouseup", handleDragEnd);
  }

  $effect(() => {
    scrollMargin;
    totalSize;
    updateFraction();
    const onScroll = () => untrack(updateFraction);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  });
</script>

<div
  class="fixed right-4 top-1/2 -translate-y-1/2 h-[60vh] z-50 select-none"
  class:cursor-grab={!isDragging}
  class:cursor-grabbing={isDragging}
>
  <div class="relative w-full h-full flex items-center">
    <!-- Track -->
    <div
      bind:this={trackEl}
      role="slider"
      aria-label="Thread timeline"
      aria-valuenow={Math.round(fraction * 100)}
      tabindex="0"
      onmousedown={handleDragStart}
      class="group relative w-6 h-full flex justify-center"
    >
      <!-- Bar -->
      <div
        class="w-0.5 h-full rounded-full transition-all duration-200"
        style="background-color: {isDragging
          ? 'var(--hako-accent)'
          : 'rgb(51 65 85 / 0.6)'}; opacity: {isDragging ? 0.4 : 1}"
      ></div>

      <!-- Thumb -->
      <div
        class="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full transition-all duration-200"
        style="
          top: {fraction * 100}%;
          background-color: {isDragging
          ? 'var(--hako-accent)'
          : 'rgb(100 116 139 / 0.8)'};
          transform: translateX(-50%) scale({isDragging ? 1.25 : 1});
        "
        class:group-hover:scale-110={!isDragging}
        class:group-hover:bg-slate-400={!isDragging}
      ></div>
    </div>
  </div>
</div>
