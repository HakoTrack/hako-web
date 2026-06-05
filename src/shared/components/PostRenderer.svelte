<script lang="ts">
  import { parseMarkdown } from "../utils/markdown";

  let { content } = $props<{ content: string }>();
  let htmlContent = $derived(parseMarkdown(content));
  let activeImage = $state<string | null>(null);

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.stopPropagation();
      activeImage = null;
    }
  }

  $effect(() => {
    if (activeImage) {
      window.addEventListener("keydown", handleKeydown);
      return () => window.removeEventListener("keydown", handleKeydown);
    }
  });

  // Handle image clicks via event delegation
  function handleContainerClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.tagName === "IMG" && target.dataset.imageModal !== undefined) {
      activeImage = target.getAttribute("src");
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<p
  class="whitespace-pre-wrap text-sm leading-relaxed text-(--hako-fg)"
  onclick={handleContainerClick}
>
  {@html htmlContent}
</p>

{#if activeImage}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-100 flex items-center justify-center bg-[color-mix(in srgb,var(--hako-bg),transparent_20%)] backgrop-blur-sm p-4 pt-20"
    onclick={() => (activeImage = null)}
  >
    <img
      src={activeImage}
      alt="Expanded view"
      class="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
    />
  </div>
{/if}
