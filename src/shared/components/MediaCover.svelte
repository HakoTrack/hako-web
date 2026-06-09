<script lang="ts">
  import { HakoImage } from "../utils/images";
  import { fetchMediaSummaries } from "../utils/mediaData";
  import { openQuickEditor } from "../../core/ui.svelte";
  import { getDisplayTitle, settings } from "../../core/settings.svelte";
  import Tooltip from "./Tooltip.svelte";
  import type { Media } from "../types";

  interface Props {
    mediaId: string | number;
    type: string;
    size?: "small" | "medium" | "large";
    class?: string;
    alt?: string;
    onmouseover?: () => void;
    tooltip?: import("svelte").Snippet;
    showTooltip?: boolean;
    prefetchedMedia?: Media | null;
  }

  let {
    mediaId,
    type,
    size = "small",
    class: className = "",
    alt = "Cover",
    onmouseover,
    tooltip,
    showTooltip = true,
    prefetchedMedia = null,
  }: Props = $props();

  const sizeClasses = {
    small: "w-12 aspect-[17/23]",
    medium: "w-28 aspect-[17/23]",
    large: "w-40 aspect-[17/23]",
  };
  let loaded = $state(false);
  // Keep mediaInfo for tooltip title if prefetched
  let fetchedInfo = $state<Media | null>(null);
  let mediaInfo = $derived(prefetchedMedia || fetchedInfo);
  let isHovered = $state(false);

  async function handleOpenEditor() {
    openQuickEditor(Number(mediaId), type);
  }

  function handleNavigate(e: Event) {
    e.stopPropagation();
    window.history.pushState({}, "", `/${type}/${mediaId}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  async function handleHover() {
    isHovered = true;
    if (onmouseover) onmouseover();
    if (showTooltip && !mediaInfo) {
      const mediaMap = await fetchMediaSummaries([Number(mediaId)]);
      fetchedInfo = mediaMap[mediaId] as any;
    }
  }
</script>

{#snippet defaultTooltip()}
  <div class="font-bold text-xs">
    {mediaInfo
      ? getDisplayTitle(mediaInfo.title, settings.titlePreference)
      : alt}
  </div>
{/snippet}

{#snippet coverImage()}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="relative {sizeClasses[size]} {className} group"
    onmouseenter={handleHover}
  >
    {#if !loaded}
      <div
        class="absolute inset-0 bg-(--surface-elevated) animate-pulse rounded"
      ></div>
    {/if}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_mouse_events_have_key_events -->
    <img
      src={HakoImage.getCover(mediaId, size === "large" ? "large" : "medium")}
      class="w-full h-full object-cover rounded shadow cursor-pointer group-hover:scale-105 transition-transform {loaded
        ? 'opacity-100'
        : 'opacity-0'} transition-opacity"
      {alt}
      loading="lazy"
      onload={() => (loaded = true)}
      onerror={(e) => {
        const img = e.target as HTMLImageElement;
        img.src =
          "https://ik.imagekit.io/HakoImage/covers/placeholder.webp?tr=w-240,f=webp";
      }}
      onclick={handleOpenEditor}
    />
    <button
      onclick={handleNavigate}
      class="absolute bottom-0 right-0 bg-(--hako-bg)/80 text-(--hako-fg) rounded-full w-7 h-7 flex items-center justify-center text-xs z-50 opacity-0 group-hover:opacity-100 transition-opacity hover:text-accent pointer-events-auto cursor-pointer"
      title="Go to page"
      style="pointer-events: auto;"
    >
      <i
        class="fa-solid fa-arrow-up-right-from-square text-[10px] translate-x-[0.5px] -translate-y-[0.5px]"
      ></i>
    </button>
  </div>
{/snippet}

{#if tooltip || showTooltip}
  <Tooltip content={tooltip || defaultTooltip} placement="bottom" offset={10}>
    {@render coverImage()}
  </Tooltip>
{:else}
  {@render coverImage()}
{/if}
