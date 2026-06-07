<script lang="ts">
  import { onMount } from "svelte";
  import { FavoritesService } from "../services/favoritesService";
  import { fetchMediaSummaries } from "../../../shared/utils/mediaData";
  import MediaCover from "../../../shared/components/MediaCover.svelte";
  import type { Media } from "../../../shared/types";

  let { profileId } = $props();

  let mediaData: Record<string, number[]> = $state({
    anime: [],
    manga: [],
    light_novel: [],
  });
  let metadata: Record<string, any> = $state({});
  let isLoading = $state(true);

  onMount(async () => {
    try {
      const types = ["anime", "manga", "light_novel"];
      const results = await Promise.all(
        types.map(async (type) => ({
          type,
          ids: await FavoritesService.syncFavorites(profileId, type),
        })),
      );

      results.forEach((r) => {
        mediaData[r.type] = r.ids;
      });

      const allIds = Object.values(mediaData).flat();
      if (allIds.length > 0) {
        metadata = await fetchMediaSummaries(allIds);
      }
    } catch (e) {
      console.error("Error loading favorites:", e);
    } finally {
      isLoading = false;
    }
  });

  function formatType(t: string): string {
    if (t === "light_novel" || t === "lightnovel") return "Light Novels";
    if (t === "anime") return "Anime";
    if (t === "manga") return "Manga";
    return t.charAt(0).toUpperCase() + t.slice(1) + "s";
  }
</script>

<div class="bg-card p-6 shadow-md space-y-6">
  <h3 class="text-(--hako-fg) font-bold text-xl flex items-center mb-6">
    <i class="fa-solid fa-heart text-accent mr-3"></i> All Favorites
  </h3>

  {#if isLoading}
    <p class="text-slate-400">Loading favorites...</p>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      {#each Object.entries(mediaData) as [type, ids]}
        {#if ids.length > 0}
          <div id="fav-{type}-section" class="space-y-4">
            <h4
              class="text-xs uppercase text-slate-500 font-bold tracking-widest border-b border-(--surface-elevated) pb-2"
            >
              {formatType(type)} ({ids.length})
            </h4>
            <div id="fav-{type}-grid" class="grid grid-cols-5 gap-3">
              {#each ids as id}
                <MediaCover
                  mediaId={id}
                  {type}
                  size="medium"
                  alt="{type} {id}"
                  prefetchedMedia={metadata[id]}
                />
              {/each}
            </div>
          </div>
        {/if}
      {/each}
    </div>
  {/if}
</div>
