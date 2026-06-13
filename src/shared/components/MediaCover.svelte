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
    isLoading?: boolean;
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
    isLoading = false,
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
    if (isLoading) return;
    openQuickEditor(Number(mediaId), type);
  }

  async function handleHover() {
    if (isLoading) return;
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
    {#if isLoading || !loaded}
      <div
        class="absolute inset-0 bg-(--surface-elevated) animate-pulse rounded"
      ></div>
    {/if}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_mouse_events_have_key_events -->
    {#if !isLoading}
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
          img.src = HakoImage.get("global/placeholderCover.webp");
        }}
        onclick={handleOpenEditor}
      />
    {/if}
  </div>
{/snippet}

{#if tooltip || showTooltip}
  <Tooltip content={tooltip || defaultTooltip} placement="bottom" offset={10}>
    {@render coverImage()}
  </Tooltip>
{:else}
  {@render coverImage()}
{/if}
