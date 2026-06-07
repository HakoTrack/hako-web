<script lang="ts">
  import { onMount } from "svelte";
  import { supabase } from "../../../core/supabase.js";
  import MediaCover from "../../../shared/components/MediaCover.svelte";

  let { mediaType } = $props<{
    mediaType: "anime" | "manga" | "light_novel";
  }>();
  let media = $state<any[]>([]);
  let isLoading = $state(true);

  $effect(() => {
    isLoading = true;
    supabase
      .from("top_rated_media_view")
      .select("id, title_romaji, title_english, title_native, median_score")
      .eq("media_type", mediaType)
      .limit(12)
      .then(({ data, error }) => {
        if (error) console.error("Error fetching top rated:", error);
        else media = data || [];
        isLoading = false;
      });
  });
</script>

<section>
  <h2 class="text-2xl font-bold text-(--hako-fg) mb-6">Top Rated</h2>

  {#if isLoading}
    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
      {#each Array(6) as _}
        <div
          class="bg-card h-64 rounded-lg border border-(--surface-elevated) animate-pulse"
        ></div>
      {/each}
    </div>
  {:else if media.length === 0}
    <p class="text-slate-500 italic">
      No rated media found for this category yet.
    </p>
  {:else}
    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
      {#each media as item}
        <div class="space-y-2">
          <MediaCover
            mediaId={item.id}
            type={mediaType}
            size="medium"
            class="w-full"
          />
          <div
            class="text-sm font-medium text-(--hako-fg) truncate"
            title={item.title_romaji}
          >
            {item.title_romaji}
          </div>
          <div class="text-xs text-accent font-bold">
            Score: {item.median_score.toFixed(1)}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</section>
