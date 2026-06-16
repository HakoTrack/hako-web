<script lang="ts">
  import { HakoImage } from "../utils/images";
  import { fetchMediaSummaries } from "../utils/mediaData";
  import { openQuickEditor } from "../../core/ui.svelte";
  import { getDisplayTitle, settings } from "../../core/settings.svelte";
  import { registerShortcut } from "../../core/keys.svelte";
  import Tooltip from "./Tooltip.svelte";
  import type { Media } from "../types";

  let activeCoverId: number | null = null;
  let activeCoverType: string | null = null;

  interface Props {
    mediaId: string | number;
    type: string;
    size?: "small" | "medium" | "large";
    class?: string;
    alt?: string;
    onmouseover?: () => void;
    tooltip?: any;
    showTooltip?: boolean;
    prefetchedMedia?: Media | null;
    isLoading?: boolean;
    onClick?: () => void;
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
    onClick,
  }: Props = $props();

  const sizeClasses: Record<string, string> = {
    small: "w-12 aspect-[17/23]",
    medium: "w-28 aspect-[17/23]",
    large: "w-40 aspect-[17/23]",
  };
  let loaded = $state(false);
  let fetchedInfo = $state<Media | null>(null);
  let mediaInfo = $derived(prefetchedMedia || fetchedInfo);
  let isHovered = $state(false);

  $effect(() => {
    if (isLoading) return;
    const cleanup = registerShortcut("e", (e) => {
      if (activeCoverId === Number(mediaId) && activeCoverType === type) {
        e.preventDefault();
        openQuickEditor(Number(mediaId), type);
      }
    });
    return cleanup;
  });

  function navigateToPage() {
    const path = type === "light_novel" ? "lightnovel" : type;
    window.history.pushState({}, "", `/${path}/${mediaId}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  function handleClick() {
    if (isLoading) return;
    if (onClick) {
      onClick();
    } else {
      navigateToPage();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  }

  async function handleHover() {
    if (isLoading) return;
    activeCoverId = Number(mediaId);
    activeCoverType = type;
    isHovered = true;
    if (onmouseover) onmouseover();
    if (showTooltip && !mediaInfo) {
      const mediaMap = await fetchMediaSummaries([Number(mediaId)]);
      fetchedInfo = mediaMap[mediaId] as any;
    }
  }

  function handleMouseLeave() {
    if (activeCoverId === Number(mediaId)) {
      activeCoverId = null;
      activeCoverType = null;
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
    class="relative {sizeClasses[size]} {className} group cursor-pointer"
    role="button"
    tabindex="0"
    onmouseenter={handleHover}
    onmouseleave={handleMouseLeave}
    onclick={handleClick}
    onkeydown={handleKeydown}
  >
    {#if isLoading || !loaded}
      <div
        class="absolute inset-0 bg-(--surface-elevated) animate-pulse rounded"
      ></div>
    {/if}
    {#if !isLoading}
      <img
        src={HakoImage.getCover(mediaId, size === "large" ? "large" : "medium")}
        class="w-full h-full object-cover rounded shadow group-hover:scale-105 transition-transform {loaded
          ? 'opacity-100'
          : 'opacity-0'} transition-opacity"
        {alt}
        loading="lazy"
        onload={() => (loaded = true)}
        onerror={(e) => {
          const img = e.target as HTMLImageElement;
          img.src = HakoImage.get("global/placeholderCover.webp");
        }}
      />
    {/if}
  </div>
{/snippet}

{#if tooltip || showTooltip}
  <Tooltip content={tooltip ?? defaultTooltip} placement="bottom" offset={10}>
    {@render coverImage()}
  </Tooltip>
{:else}
  {@render coverImage()}
{/if}
