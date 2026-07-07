<script lang="ts">
  import MediaCover from "../../../shared/components/MediaCover.svelte";
  import type { CollectionSummary } from "../../../shared/types";

  let {
    collection,
    onClick,
  }: {
    collection: CollectionSummary;
    onClick?: () => void;
  } = $props();

  let t = $derived(collection.collection_type ?? "mixed");

  let typeLabel = $derived(
    {
      anime: "Anime",
      manga: "Manga",
      light_novel: "Light Novel",
      visual_novel: "Visual Novel",
      mixed: "Mixed",
    }[t] ?? t,
  );

  let typeVar = $derived(
    {
      anime: "--c4",
      manga: "--c1",
      light_novel: "--c10",
      visual_novel: "--c5",
      mixed: "--c2",
    }[t] ?? "--c8",
  );

  let breakdown = $derived(collection.viewer_breakdown);
  let hasBreakdown = $derived(!!breakdown && breakdown.total > 0);

  let barSegments = $derived.by(() => {
    if (!breakdown || breakdown.total === 0) return [];
    const statuses = [
      {
        id: "completed",
        label: "Completed",
        color: "var(--c12)",
        count: breakdown.completed,
      },
      {
        id: "current",
        label: "Current",
        color: "var(--c2)",
        count: breakdown.current,
      },
      {
        id: "paused",
        label: "Paused",
        color: "var(--c3)",
        count: breakdown.paused,
      },
      {
        id: "dropped",
        label: "Dropped",
        color: "var(--c1)",
        count: breakdown.dropped,
      },
      {
        id: "planning",
        label: "Planning",
        color: "var(--c8)",
        count: breakdown.planning,
      },
      {
        id: "unlisted",
        label: "Not in list",
        color: "var(--c6)",
        count: breakdown.unlisted,
      },
    ].filter((s) => s.count > 0);

    return statuses.map((s) => ({
      ...s,
      percent: (s.count / breakdown.total) * 100,
    }));
  });

  let previewIds = $derived(collection.preview_media_ids?.slice(0, 3) ?? []);
</script>

<div
  class="group relative bg-card rounded-lg cursor-pointer"
  onclick={onClick}
  role="button"
  tabindex="0"
  onkeydown={(e) => e.key === "Enter" && onClick?.()}
>
  <div
    class="absolute inset-0 rounded-lg bg-card group-hover:brightness-120 transition-all"
  ></div>

  <div class="relative flex items-start gap-4 p-4">
    <!-- Cover stack -->
    {#if previewIds.length > 0}
      <div class="relative w-[140px] h-[168px] shrink-0">
        {#each previewIds as id, i (id)}
          <div
            class="absolute"
            style="top: {(previewIds.length - 1 - i) * 8}px; left: {i *
              14}px; z-index: {previewIds.length - i}; opacity: {1 - i * 0.15};"
          >
            <MediaCover
              mediaId={id}
              type=""
              size="medium"
              noHoverScale
              showTooltip={false}
            />
          </div>
        {/each}
      </div>
    {/if}

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <h3
        class="font-bold text-(--hako-fg) truncate mb-1 group-hover:brightness-120 transition-all"
      >
        {collection.title}
      </h3>

      <div class="flex items-center gap-1.5 mb-2">
        <span
          class="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider"
          style="background: color-mix(in srgb, var({typeVar}), transparent 80%); color: var({typeVar});"
        >
          {typeLabel}
        </span>
        {#if collection.has_hentai}
          <span
            class="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-red-500/20 text-red-400"
          >
            18+
          </span>
        {/if}
      </div>

      {#if hasBreakdown}
          <div class="flex gap-px h-2 mb-2">
            {#each barSegments as seg}
              <div
                style="flex: {seg.percent}; background: {seg.color};"
                title="{seg.label}: {seg.count}"
                class="h-full rounded-sm transition-all"
              ></div>
            {/each}
          </div>
      {:else}
        <div class="mb-2"></div>
      {/if}

      {#if collection.description}
        <p
          class="text-xs text-slate-400 line-clamp-2 mb-3 group-hover:brightness-120 transition-all"
        >
          {collection.description}
        </p>
      {:else}
        <div class="mb-3"></div>
      {/if}

      <div
        class="flex items-center justify-between text-[11px] text-slate-500 group-hover:brightness-120 transition-all"
      >
        <div class="flex items-center gap-3">
          <span>{collection.entry_count} entries</span>
          <span>{collection.subscriber_count} saved</span>
        </div>
        <span class="truncate max-w-[120px]"
          >by {collection.author_username}</span
        >
      </div>
    </div>
  </div>
</div>
