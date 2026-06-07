<script lang="ts">
  import { onMount } from "svelte";
  import { FavoritesService } from "../services/favoritesService";
  import { fetchMediaSummaries } from "../../../shared/utils/mediaData";
  import MediaCover from "../../../shared/components/MediaCover.svelte";
  import type { Media } from "../../../shared/types";

  let { profileId, limit } = $props();

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
  <h3 class="text-(--hako-fg) font-bold flex items-center mb-4">
    <i class="fa-solid fa-heart text-accent mr-2"></i> Favorites
  </h3>

  {#if !isLoading}
    {#each Object.entries(mediaData) as [type, ids]}
      {#if ids.length > 0}
        <div id="fav-{type}-section" class="mb-6 last:mb-0">
          <h4
            class="text-[10px] uppercase text-slate-500 font-bold mb-3 tracking-widest"
          >
            {formatType(type)}
          </h4>
          <div id="fav-{type}-grid" class="grid grid-cols-5 gap-2">
            {#each limit ? ids.slice(0, limit) : ids as id}
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
  {/if}
</div>
