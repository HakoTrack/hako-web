<script lang="ts">
  import { parseMarkdown } from "../utils/markdown";
  import hljs from "highlight.js/lib/core";
  import javascript from "highlight.js/lib/languages/javascript";
  import typescript from "highlight.js/lib/languages/typescript";
  import python from "highlight.js/lib/languages/python";
  import rust from "highlight.js/lib/languages/rust";
  import css from "highlight.js/lib/languages/css";
  import xml from "highlight.js/lib/languages/xml";
  import json from "highlight.js/lib/languages/json";
  import bash from "highlight.js/lib/languages/bash";
  import svelte from "highlightjs-svelte/dist/index.mjs";

  hljs.registerLanguage("javascript", javascript);
  hljs.registerLanguage("typescript", typescript);
  hljs.registerLanguage("python", python);
  hljs.registerLanguage("rust", rust);
  hljs.registerLanguage("css", css);
  hljs.registerLanguage("xml", xml);
  hljs.registerLanguage("json", json);
  hljs.registerLanguage("bash", bash);
  svelte(hljs);

  let { content, avatars = {} as Record<string, string> } = $props<{
    content: string;
    avatars?: Record<string, string>;
  }>();
  let htmlContent = $derived(parseMarkdown(content, avatars));
  let containerEl: HTMLDivElement;
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

  $effect(() => {
    htmlContent;
    if (containerEl) {
      queueMicrotask(() => {
        containerEl.querySelectorAll<HTMLElement>("pre code").forEach((el) => {
          hljs.highlightElement(el);
        });
      });
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
<div
  bind:this={containerEl}
  class="whitespace-pre-wrap text-sm leading-relaxed text-(--hako-fg)"
  onclick={handleContainerClick}
>
  {@html htmlContent}
</div>

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
