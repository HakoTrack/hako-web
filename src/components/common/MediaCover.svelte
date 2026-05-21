<script lang="ts">
  import { HakoImage } from "../../utils/images";
  import { fetchMediaById } from "../../utils/mediaData";
  import { openQuickEditor } from "../../core/ui.svelte";
  import Tooltip from "./Tooltip.svelte";
  import type { Media } from "../../types";

  interface Props {
    mediaId: string | number;
    type: string;
    size?: "small" | "medium" | "large";
    class?: string;
    alt?: string;
    onmouseover?: () => void;
    tooltip?: import("svelte").Snippet;
    showTooltip?: boolean;
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
  }: Props = $props();

  const sizeClasses = {
    small: "w-12 h-16",
    medium: "aspect-85/115",
    large: "w-40 h-56",
  };

  let loaded = $state(false);
  let mediaInfo = $state<Media | null>(null);

  async function handleOpenEditor() {
    const media = mediaInfo || (await fetchMediaById(Number(mediaId)));
    if (media) openQuickEditor(media, type);
  }

  async function handleHover() {
    if (onmouseover) onmouseover();
    if (showTooltip && !mediaInfo) {
      mediaInfo = await fetchMediaById(Number(mediaId));
    }
  }
</script>

{#snippet defaultTooltip()}
  <div class="font-bold text-xs">
    {mediaInfo?.title?.romaji || alt}
  </div>
{/snippet}

{#snippet coverImage()}
  <div class="relative {sizeClasses[size]} {className}">
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
      class="w-full h-full object-cover rounded shadow cursor-pointer hover:scale-105 transition-transform {loaded
        ? 'opacity-100'
        : 'opacity-0'} transition-opacity"
      {alt}
      loading="lazy"
      onload={() => (loaded = true)}
      onerror={(e) => {
        const img = e.target as HTMLImageElement;
        img.src =
          "https://ik.imagekit.io/HakoImage/covers/placeholder.jpg?tr=w-240,f=webp";
      }}
      onclick={handleOpenEditor}
      onmouseenter={handleHover}
    />
  </div>
{/snippet}

{#if tooltip || showTooltip}
  <Tooltip content={tooltip || defaultTooltip} placement="bottom" offset={10}>
    {@render coverImage()}
  </Tooltip>
{:else}
  {@render coverImage()}
{/if}
