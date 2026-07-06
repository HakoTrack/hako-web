<script lang="ts">
  import { HakoImage } from "../../../shared/utils/images";
  import { getDisplayTitle, settings } from "../../../core/settings.svelte";
  import type { Media } from "../../../shared/types";

  let { media, onRemove } = $props<{
    media: Media;
    onRemove?: () => void;
  }>();

  let title = $derived(getDisplayTitle(media.title, settings.titlePreference));
  let info = $derived.by(() => {
    const parts: string[] = [];
    if (media.format) parts.push(media.format);
    if (media.seasonYear) parts.push(String(media.seasonYear));
    if (media.media_type) parts.push(media.media_type.replace("_", " "));
    return parts.join(" \u2022 ");
  });

  function navigateToMedia() {
    const type = media.media_type || "anime";
    window.history.pushState({}, "", `/${type}/${media.media_id}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
</script>

<div
  class="bg-(--hako-bg) rounded-lg border border-(--surface-elevated) p-3 flex items-center gap-3"
>
  <button type="button" onclick={navigateToMedia} class="shrink-0">
    <img
      src={HakoImage.getCover(media.media_id, "small")}
      class="w-10 h-14 rounded object-cover bg-slate-700"
      alt={title}
      onerror={(e: Event) => ((e.target as HTMLImageElement).src = "")}
    />
  </button>
  <div class="flex-1 min-w-0">
    <button
      type="button"
      onclick={navigateToMedia}
      class="text-sm font-bold text-(--hako-fg) hover:text-(--hako-accent) transition-colors text-left truncate block w-full"
    >
      {title}
    </button>
    <p class="text-xs text-slate-500 mt-0.5">{info}</p>
  </div>
  {#if onRemove}
    <button
      type="button"
      onclick={onRemove}
      class="shrink-0 text-slate-500 hover:text-(--hako-fg) transition-colors cursor-pointer"
    >
      <i class="fa-solid fa-times"></i>
    </button>
  {/if}
</div>
