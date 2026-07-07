<script lang="ts">
  import { HakoImage } from "../../../shared/utils/images";
  import { getDisplayTitle, settings } from "../../../core/settings.svelte";
  import MediaCover from "../../../shared/components/MediaCover.svelte";
  import type { CollectionEntrySummary } from "../../../shared/types";

  let {
    entry,
    showViewerScores,
  }: {
    entry: CollectionEntrySummary;
    showViewerScores: boolean;
  } = $props();

  let title = $derived(
    getDisplayTitle(
      {
        romaji: entry.title_romaji,
        english: entry.title_english,
        native: entry.title_native,
      },
      settings.titlePreference,
    ),
  );

  let statusColor = $derived(
    {
      completed: "text-emerald-400",
      watching: "text-blue-400",
      planning: "text-slate-400",
      paused: "text-amber-400",
      dropped: "text-red-400",
    }[entry.viewer_status ?? ""] ?? "text-slate-500",
  );

  let typePath = $derived(
    entry.media_type === "light_novel"
      ? "lightnovel"
      : entry.media_type === "visual_novels"
        ? "visualnovels"
        : entry.media_type,
  );
</script>

<div
  class="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-(--surface-elevated)/50 transition-colors"
>
  <div class="w-9 shrink-0">
    <MediaCover
      mediaId={entry.media_id}
      type={entry.media_type}
      size="small"
      showTooltip={false}
      noHoverScale
    />
  </div>

  <div class="flex-1 min-w-0">
    <a
      href="/{typePath}/{entry.media_id}"
      class="text-sm font-medium text-(--hako-fg) truncate block hover:text-accent transition-colors"
    >
      {title}
    </a>
    <div class="text-[11px] text-slate-500">{entry.format}</div>
  </div>

  {#if entry.notes}
    <div
      class="hidden md:block text-xs text-slate-400 italic max-w-[200px] truncate"
    >
      "{entry.notes}"
    </div>
  {/if}

  <div class="flex items-center gap-4 text-xs shrink-0">
    <div class="text-center">
      <div class="text-slate-400 mb-0.5">Author</div>
      <div class="font-semibold text-(--hako-fg)">
        {entry.author_score ?? "—"}
      </div>
    </div>

    {#if showViewerScores}
      <div class="text-center">
        <div class="text-slate-400 mb-0.5">You</div>
        <div class="font-semibold text-(--hako-fg)">
          {entry.viewer_score ?? "—"}
        </div>
      </div>
    {/if}
  </div>

  {#if showViewerScores && entry.viewer_status}
    <span class="text-[10px] font-semibold uppercase shrink-0 {statusColor}">
      {entry.viewer_status}
    </span>
  {/if}
</div>
