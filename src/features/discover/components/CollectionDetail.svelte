<script lang="ts">
  import { onMount } from "svelte";
  import { supabase } from "../../../core/supabase";
  import { openModal } from "../../../core/ui.svelte";
  import { getDisplayTitle, settings } from "../../../core/settings.svelte";
  import { GENRES } from "../../../shared/utils/constants";
  import { CollectionService } from "../services/collectionService";
  import MediaCover from "../../../shared/components/MediaCover.svelte";
  import Badge from "../../../shared/components/Badge.svelte";
  import type {
    CollectionDetail as CollectionDetailType,
    CollectionEntrySummary,
  } from "../../../shared/types";

  let {
    collectionId,
    onBack,
  }: {
    collectionId: string;
    onBack?: () => void;
  } = $props();

  let collection = $state<CollectionDetailType | null>(null);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let isAdded = $state(false);
  let toggling = $state(false);
  let currentUserId = $state<string | null>(null);

  let isOwner = $derived(
    !!collection && !!currentUserId && collection.author_id === currentUserId,
  );

  onMount(async () => {
    const { data: session } = await supabase.auth.getSession();
    currentUserId = session?.session?.user?.id ?? null;

    const result = await CollectionService.get(collectionId);
    if (!result.success) {
      error = result.error;
    } else if (!result.data) {
      error = "Collection not found";
    } else {
      collection = result.data;
      isAdded = result.data.is_added;
    }
    isLoading = false;
  });

  async function toggleAdd() {
    toggling = true;
    if (isAdded) {
      await CollectionService.remove(collectionId);
      isAdded = false;
    } else {
      await CollectionService.add(collectionId);
      isAdded = true;
    }
    toggling = false;
  }

  function handleEdit() {
    openModal("collection-form", {
      entry: collection,
      onSaved: (id) => window.location.reload(),
    });
  }

  function getScoreColor(score: number | null): string {
    if (!score) return "text-(--c8)";
    if (score >= 9) return "text-(--c2)";
    if (score >= 8) return "text-(--c4)";
    if (score >= 7) return "text-(--c15)";
    if (score >= 5) return "text-(--c3)";
    return "text-(--c1)";
  }

  let typeLabel = $derived(
    collection
      ? ({
          anime: "Anime",
          manga: "Manga",
          light_novel: "Light Novel",
          visual_novel: "Visual Novel",
          mixed: "Mixed",
        }[collection.collection_type] ?? collection.collection_type)
      : "",
  );

  function entryTitle(entry: CollectionEntrySummary): string {
    return getDisplayTitle(
      {
        romaji: entry.title_romaji,
        english: entry.title_english,
        native: entry.title_native,
      },
      settings.titlePreference,
    );
  }

  function entryGenres(entry: CollectionEntrySummary): string[] {
    return (entry.genre_ids ?? [])
      .map((id: number) => GENRES[id - 1])
      .filter(Boolean);
  }

  function mediaTypePath(entry: CollectionEntrySummary): string {
    return entry.media_type === "light_novel"
      ? "lightnovel"
      : entry.media_type === "visual_novels"
        ? "visualnovels"
        : entry.media_type;
  }

  function navigateTo(url: string) {
    window.history.pushState({}, "", url);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  const VIBE_KEYS = [
    "Speculative",
    "Visceral",
    "Cerebral",
    "Emotive",
    "Interpersonal",
    "Lighthearted",
  ] as const;

  function topVibes(
    v: Record<string, number> | null | undefined,
  ): { name: string; score: number }[] {
    if (!v || Object.keys(v).length === 0) return [];
    return VIBE_KEYS.map((name) => ({
      name: name.toLowerCase(),
      score: v[name] ?? 0,
    }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .filter((p) => p.score > 0);
  }

  function statusColor(status: string | null): string {
    return (
      {
        completed: "text-emerald-400",
        current: "text-blue-400",
        watching: "text-blue-400",
        planning: "text-slate-400",
        paused: "text-amber-400",
        dropped: "text-red-400",
      }[status ?? ""] ?? "text-slate-500"
    );
  }
</script>

<div class="max-w-5xl mx-auto px-4 py-8">
  {#if isLoading}
    <div class="flex justify-center py-20">
      <div
        class="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"
      ></div>
    </div>
  {:else if error || !collection}
    <div class="text-center py-20">
      <p class="text-slate-400">{error || "Collection not found"}</p>
      {#if onBack}
        <button
          onclick={onBack}
          class="mt-4 text-sm text-accent hover:underline"
        >
          ← Back to collections
        </button>
      {/if}
    </div>
  {:else}
    <!-- Header -->
    <div class="mb-8">
      {#if onBack}
        <button
          onclick={onBack}
          class="text-xs text-slate-400 hover:text-(--hako-fg) mb-3 transition-colors"
        >
          ← Back to collections
        </button>
      {/if}

      <div class="flex items-start justify-between gap-4">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-1">
            <h1 class="text-2xl font-bold text-(--hako-fg)">
              {collection.title}
            </h1>
            <span
              class="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-sky-500/20 text-sky-300"
            >
              {typeLabel}
            </span>
          </div>

          {#if collection.description}
            <p class="text-sm text-slate-400 mt-1">{collection.description}</p>
          {/if}

          <div class="flex items-center gap-4 mt-3 text-xs text-slate-500">
            <span>by {collection.author_username}</span>
            <span>{collection.entry_count} entries</span>
            <span>{collection.subscriber_count} saved</span>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          {#if isOwner}
            <button
              onclick={handleEdit}
              class="px-3 py-2 text-sm font-semibold rounded-lg bg-(--surface-elevated) text-(--hako-fg) hover:brightness-120 transition-all"
            >
              <i class="fa-solid fa-pen mr-1"></i> Edit
            </button>
          {/if}
          <button
            onclick={toggleAdd}
            disabled={toggling}
            class="px-4 py-2 text-sm font-semibold rounded-lg transition-all {isAdded
              ? 'bg-(--surface-elevated) text-slate-400 hover:text-red-400 border border-(--surface-elevated)'
              : 'bg-accent text-white hover:brightness-110'}"
          >
            {isAdded ? "Remove" : "Add to Collection"}
          </button>
        </div>
      </div>
    </div>

    <!-- Entry cards -->
    {#if collection.entries.length > 0}
      <div class="space-y-2">
        {#each collection.entries as entry (entry.id)}
          {@const entryVibes = topVibes(entry.vibe_vector)}
          <div
            onclick={() =>
              navigateTo(`/${mediaTypePath(entry)}/${entry.media_id}`)}
            class="group relative bg-card rounded-xl p-3 flex items-center gap-4 cursor-pointer overflow-hidden"
          >
            <div
              class="absolute inset-0 bg-(--surface-elevated) opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div class="relative z-[1] flex items-start gap-4 w-full min-w-0">
              <MediaCover
                mediaId={entry.media_id}
                type={entry.media_type}
                size="medium"
                showTooltip={false}
                noHoverScale
              />

              <div class="flex-1 min-w-0 flex flex-col">
                <div class="text-base font-bold text-(--hako-fg) truncate">
                  {entryTitle(entry)}
                </div>
                {#if entryVibes.length > 0}
                  <div class="flex flex-wrap gap-1 mt-1">
                    {#each entryVibes as vibe}
                      <Badge label={vibe.name} variant="vibe" />
                    {/each}
                  </div>
                {/if}
                <div class="flex flex-wrap gap-1 mt-1">
                  {#each entryGenres(entry).slice(0, 5) as genre}
                    <Badge label={genre} variant="genre" />
                  {/each}
                </div>
                {#if entry.notes}
                  <div class="text-[11px] text-slate-500 italic mt-1 truncate">
                    "{entry.notes}"
                  </div>
                {/if}
              </div>

              <div class="flex items-center gap-4 shrink-0 self-start">
                <div class="text-center">
                  <div
                    class="text-[10px] text-slate-500 uppercase tracking-wider"
                  >
                    Author
                  </div>
                  <div
                    class="text-sm font-mono font-semibold {getScoreColor(
                      entry.author_score,
                    )}"
                  >
                    {entry.author_score?.toFixed(1) ?? "—"}
                  </div>
                </div>
                <div class="text-center">
                  <div
                    class="text-[10px] text-slate-500 uppercase tracking-wider"
                  >
                    You
                  </div>
                  {#if entry.viewer_score}
                    <div
                      class="text-sm font-mono font-semibold {getScoreColor(
                        entry.viewer_score,
                      )}"
                    >
                      {entry.viewer_score.toFixed(1)}
                    </div>
                  {:else if entry.viewer_status}
                    <div
                      class="text-[10px] font-semibold uppercase mt-0.5 {statusColor(
                        entry.viewer_status,
                      )}"
                    >
                      {entry.viewer_status}
                    </div>
                  {:else}
                    <div class="text-sm font-mono text-(--c8)">—</div>
                  {/if}
                </div>
                <span
                  class="text-[10px] font-bold bg-(--surface-dim) px-2 py-1 rounded text-slate-400 hidden sm:block"
                >
                  {(entry.format || "TV").replace(/_/g, " ")}
                </span>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div
        class="text-center py-12 text-slate-500 text-sm bg-card rounded-lg shadow-md"
      >
        No entries in this collection yet.
      </div>
    {/if}
  {/if}
</div>
