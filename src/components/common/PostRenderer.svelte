<script lang="ts">
  import { parseMarkdown, type MarkdownPart } from "../../utils/markdown";
  import { isSafeUrl } from "../../utils/url";

  let { content } = $props<{ content: string }>();
  let parts = $derived(parseMarkdown(content));
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
</script>

<p class="whitespace-pre-wrap text-sm leading-relaxed text-(--hako-fg)">
  {#each parts as part}
    {#if part.type === "bold"}
      <strong class="font-bold text-white">{part.content}</strong>
    {:else if part.type === "italic"}
      <em class="italic text-slate-300">{part.content}</em>
    {:else if part.type === "bold-italic"}
      <strong class="font-bold text-white"
        ><em class="italic text-slate-300">{part.content}</em></strong
      >
    {:else if part.type === "link"}
      <a
        href={part.url}
        target="_blank"
        rel="noopener noreferrer"
        class="text-(--hako-accent) hover:underline">{part.content}</a
      >
    {:else if part.type === "image"}
      {#if isSafeUrl(part.url)}
        <!-- svelte-ignore node_invalid_placement_ssr -->
        <div
          class="relative w-full overflow-hidden rounded-lg my-2 bg-(--surface-elevated) animate-pulse cursor-pointer"
          style="min-height: 200px;"
        >
          <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <img
            src={part.url}
            alt={part.alt}
            class="max-w-full rounded-lg shadow-md transition-opacity duration-300"
            style="opacity: 0;"
            loading="lazy"
            onclick={() => (activeImage = part.url)}
            onload={(e: Event) => {
              const target = e.target as HTMLImageElement;
              target.style.opacity = "1";
              target.parentElement!.classList.remove(
                "animate-pulse",
                "bg-(--surface-elevated)",
              );
              target.parentElement!.style.minHeight = "auto";
            }}
            onerror={(e: Event) => {
              const target = e.target as HTMLElement;
              if (target.parentElement)
                target.parentElement.style.display = "none";
            }}
          />
        </div>
      {/if}
    {:else if part.type === "text"}
      {part.content}
    {/if}
  {/each}
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
