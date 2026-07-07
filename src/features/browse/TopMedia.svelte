<script lang="ts">
  import { onMount } from "svelte";
  import { supabase } from "../../core/supabase.js";
  import { HakoImage } from "../../shared/utils/images";
  import { formatDescription } from "../../shared/utils/mediaData";
  import { GENRES } from "../../shared/utils/constants";
  import { getDisplayTitle, settings } from "../../core/settings.svelte";
  import MediaCover from "../../shared/components/MediaCover.svelte";
  import Badge from "../../shared/components/Badge.svelte";

  interface TopMediaItem {
    id: number;
    title_romaji: string;
    title_english: string | null;
    title_native: string | null;
    median_score: number;
  }

  interface ExtraData {
    description: string;
    genre_ids: number[];
    vibe_vector: Record<string, number> | null;
  }

  interface VibePillar {
    name: string;
    score: number;
  }

  interface EnrichedItem extends TopMediaItem {
    description: string;
    genres: string[];
    vibes: VibePillar[];
  }

  let { mediaType = "anime" } = $props<{
    mediaType: string;
  }>();

  let enriched = $state<EnrichedItem[]>([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);

  let label = $derived(
    mediaType === "light_novel"
      ? "Light Novels"
      : mediaType.charAt(0).toUpperCase() + mediaType.slice(1),
  );

  const vibeKeys = [
    "Speculative",
    "Visceral",
    "Cerebral",
    "Emotive",
    "Interpersonal",
    "Lighthearted",
  ] as const;

  function extractVibes(
    v: Record<string, number> | null | undefined,
  ): VibePillar[] {
    if (!v || Object.keys(v).length === 0) return [];
    return vibeKeys
      .map((name) => ({ name: name.toLowerCase(), score: v[name] ?? 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .filter((p) => p.score > 0);
  }

  onMount(() => load());

  async function load() {
    isLoading = true;
    error = null;
    const { data: topData, error: err } = await supabase
      .from("top_rated_media_view")
      .select("id, title_romaji, title_english, title_native, median_score")
      .eq("media_type", mediaType)
      .order("median_score", { ascending: false })
      .limit(100);

    if (err) {
      error = err.message;
      isLoading = false;
      return;
    }
    const items = topData || [];

    if (items.length === 0) {
      isLoading = false;
      return;
    }

    const ids = items.map((i) => i.id);
    const { data: extraData } = await supabase
      .from("media")
      .select("id, genre_ids, vibe_vector, description")
      .in("id", ids);

    const extraMap = new Map<number, ExtraData>();
    if (extraData) {
      for (const row of extraData) {
        extraMap.set(row.id, {
          description: (row as any).description || "",
          genre_ids: (row as any).genre_ids || [],
          vibe_vector: (row as any).vibe_vector || null,
        });
      }
    }

    enriched = items.map((item) => {
      const extra = extraMap.get(item.id);
      return {
        ...item,
        description: extra?.description ?? "",
        genres: (extra?.genre_ids ?? [])
          .map((id: number) => GENRES[id - 1] || "")
          .filter(Boolean),
        vibes: extractVibes(extra?.vibe_vector),
      };
    });
    isLoading = false;
  }

  function navigateTo(id: number) {
    const path = mediaType === "light_novel" ? "lightnovel" : mediaType;
    window.history.pushState({}, "", `/${path}/${id}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
</script>

<div class="max-w-5xl mx-auto px-4 py-8">
  <div class="flex items-center justify-between mb-8">
    <h1 class="text-3xl font-bold text-(--hako-fg)">Top 100 {label}</h1>
    <span class="text-sm text-(--c8)">{enriched.length} titles</span>
  </div>

  {#if isLoading}
    <div class="space-y-4">
      {#each Array(5) as _}
        <div
          class="h-56 bg-(--surface-elevated) rounded-xl animate-pulse"
        ></div>
      {/each}
    </div>
  {:else if error}
    <div class="text-center py-20 text-(--c8)">
      <p class="text-sm">Failed to load: {error}</p>
    </div>
  {:else if enriched.length === 0}
    <div class="text-center py-20 text-(--c8)">
      <i class="fa-solid fa-star text-4xl mb-4 block opacity-20"></i>
      <p class="text-sm font-medium">No rated titles found.</p>
    </div>
  {:else}
    <div class="space-y-4">
      {#each enriched as item, i (item.id)}
        {@const rank = i + 1}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="rounded-xl transition-shadow duration-200 hover:shadow-2xl hover:ring-1 hover:ring-white/10"
        >
          <div
            class="relative cursor-pointer overflow-hidden rounded-xl"
            style="-webkit-mask-image: url(data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' rx='12' fill='white'/%3E%3C/svg%3E); mask-image: url(data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' rx='12' fill='white'/%3E%3C/svg%3E); background:
            linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 50%),
            linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 100%),
            url({HakoImage.getBanner(item.id)}) center/cover
            var(--hako-bg);
          "
            onclick={() => navigateTo(item.id)}
          >
            <!-- Content -->
            <div class="relative flex items-start gap-6 p-5">
              <!-- Cover -->
              <div class="shrink-0">
                <MediaCover
                  mediaId={item.id}
                  type={mediaType}
                  size="large"
                  showTooltip={false}
                />
              </div>

              <!-- Text content -->
              <div class="flex flex-col min-w-0 gap-2 pt-1 grow">
                <!-- Title -->
                <h2
                  class="text-lg font-bold text-(--hako-fg) leading-tight pr-24"
                >
                  {getDisplayTitle(
                    {
                      romaji: item.title_romaji,
                      english: item.title_english,
                      native: item.title_native,
                    },
                    settings.titlePreference,
                  )}
                </h2>

                <!-- Badges: vibes + genres -->
                <div class="flex flex-wrap items-center gap-1.5">
                  {#each item.vibes as vibe}
                    <Badge label={vibe.name} variant="vibe" />
                  {/each}
                  {#each item.genres.slice(0, 4) as genre}
                    <Badge label={genre} />
                  {/each}
                  {#if item.genres.length > 4}
                    <span class="text-[10px] text-(--c8)"
                      >+{item.genres.length - 4}</span
                    >
                  {/if}
                </div>

                <!-- Description -->
                {#if item.description}
                  <p
                    class="text-sm text-slate-300 leading-relaxed line-clamp-5"
                  >
                    {@html formatDescription(item.description)}
                  </p>
                {/if}
              </div>

              <!-- Rank + Score (top right) -->
              <div class="absolute top-4 right-4 flex items-center gap-2">
                {#if rank <= 3}
                  <i
                    class="fa-solid fa-crown"
                    style="color: {rank === 1
                      ? '#FFD700'
                      : rank === 2
                        ? '#C0C0C0'
                        : '#CD7F32'}"
                  ></i>
                {/if}
                <span class="flex items-baseline gap-1">
                  <span class="text-xs text-(--c8)">#</span>
                  <span class="text-lg font-bold text-(--hako-fg)">{rank}</span>
                  <span class="text-sm font-bold text-(--c2) font-mono ml-2">
                    {item.median_score?.toFixed(2)}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  :global(.line-clamp-5) {
    display: -webkit-box;
    -webkit-line-clamp: 5;
    -webkit-box-orient: vertical;
    line-clamp: 5;
    overflow: hidden;
  }
</style>
