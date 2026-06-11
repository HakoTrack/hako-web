<script lang="ts">
  import { onMount, onDestroy, tick } from "svelte";
  import {
    computePosition,
    flip,
    shift,
    offset,
    type Placement,
  } from "@floating-ui/dom";

  interface Props {
    children: import("svelte").Snippet;
    content: import("svelte").Snippet;
    placement?: Placement;
    offset?: number;
    delay?: number;
    class?: string;
    contentClass?: string;
    style?: string;
  }

  let {
    children,
    content,
    placement = "top",
    offset: offsetValue = 8,
    delay = 200,
    class: className = "",
    contentClass = "",
    style = "",
  }: Props = $props();

  let isVisible = $state(false);
  let wrapperRef = $state<HTMLElement | null>(null);
  let tooltipRef = $state<HTMLElement | null>(null);
  let timeoutId: any;

  async function updatePosition() {
    if (isVisible && wrapperRef && tooltipRef) {
      // Use the first child as the reference to anchor precisely to the content
      const referenceElement =
        (wrapperRef.firstElementChild as HTMLElement) || wrapperRef;

      const { x, y } = await computePosition(referenceElement, tooltipRef, {
        placement,
        strategy: "fixed",
        middleware: [offset(offsetValue), flip(), shift({ padding: 5 })],
      });

      if (tooltipRef) {
        Object.assign(tooltipRef.style, {
          left: `${x}px`,
          top: `${y}px`,
          visibility: "visible",
        });
      }
    }
  }

  function show() {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(async () => {
      isVisible = true;
      await tick();
      updatePosition();
    }, delay);
  }

  function hide() {
    clearTimeout(timeoutId);
    isVisible = false;
  }

  // Handle positioning update on scroll/resize when visible
  $effect(() => {
    if (isVisible) {
      window.addEventListener("scroll", updatePosition, {
        capture: true,
        passive: true,
      });
      window.addEventListener("resize", updatePosition, { passive: true });
      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  });

  // Attach listeners to the child element instead of the wrapper
  // This ensures the hover area matches the content (the media cover)
  $effect(() => {
    const el = wrapperRef?.firstElementChild as HTMLElement;
    if (el) {
      el.addEventListener("mouseenter", show);
      el.addEventListener("mouseleave", hide);
      el.addEventListener("focusin", show);
      el.addEventListener("focusout", hide);
      return () => {
        el.removeEventListener("mouseenter", show);
        el.removeEventListener("mouseleave", hide);
        el.removeEventListener("focusin", show);
        el.removeEventListener("focusout", hide);
      };
    } else if (wrapperRef) {
      // Fallback to wrapper if no child is present
      wrapperRef.addEventListener("mouseenter", show);
      wrapperRef.addEventListener("mouseleave", hide);
      return () => {
        wrapperRef?.removeEventListener("mouseenter", show);
        wrapperRef?.removeEventListener("mouseleave", hide);
      };
    }
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  bind:this={wrapperRef}
  class="flex shrink-0 {className}"
  {style}
  aria-haspopup="true"
>
  {@render children()}
</div>

{#if isVisible}
  <div
    bind:this={tooltipRef}
    style="visibility: hidden"
    class="fixed z-9999 pointer-events-none bg-(--surface-elevated) text-(--hako-fg) p-2.5 rounded-lg shadow-2xl text-sm animate-in fade-in zoom-in-95 duration-200 backdrop-blur-md {contentClass}"
    role="tooltip"
  >
    {@render content()}
  </div>
{/if}
