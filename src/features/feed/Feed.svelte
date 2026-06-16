<script lang="ts">
  import { onMount } from "svelte";
  import FeedWrapper from "./components/FeedWrapper.svelte";
  import SegmentedControl from "../../shared/components/SegmentedControl.svelte";
  import MediaCover from "../../shared/components/MediaCover.svelte";
  import { MediaService } from "../media/services/mediaService";
  import type { Media } from "../../shared/types";

  let { user } = $props();
  let feedFilter = $state("all");
  let feedMode = $state("global");

  type FeedItem = Media | { isLoading: true };

  let recentlyAdded = $state<{
    anime: FeedItem[];
    manga: FeedItem[];
    light_novel: FeedItem[];
  }>({
    anime: Array(5).fill({ isLoading: true }),
    manga: Array(5).fill({ isLoading: true }),
    light_novel: Array(5).fill({ isLoading: true }),
  });

  onMount(async () => {
    const types = ["anime", "manga", "light_novel"];
    const results = await Promise.all(
      types.map(async (type) => {
        const result = await MediaService.getRecentlyAdded(type, 5);
        console.log(`Fetched ${type}:`, result);
        return { type, media: result.success ? result.data : [] };
      }),
    );

    results.forEach((r) => {
      recentlyAdded[r.type as keyof typeof recentlyAdded] = r.media;
    });
  });

  const placeholderMedia = [1, 2, 3, 4, 5];
</script>

<div class="max-w-300 mx-auto py-12 px-4 grid grid-cols-[1.5fr_2fr] gap-8">
  <aside class="space-y-8">
    <div class="bg-card p-6 shadow-md">
      <h3 class="text-(--hako-fg) font-bold mb-4 flex items-center">
        <i class="fa-solid fa-fire text-accent mr-2"></i> Trending
      </h3>
      <div class="grid grid-cols-5 gap-2">
        {#each placeholderMedia as id}
          <MediaCover mediaId={id} type="anime" size="medium" />
        {/each}
      </div>
    </div>

    <div class="bg-card p-6 shadow-md space-y-6">
      <h3 class="text-(--hako-fg) font-bold flex items-center">
        <i class="fa-solid fa-clock text-accent mr-2"></i> Recently Added
      </h3>

      <div class="space-y-4">
        <div>
          <h4
            class="text-[10px] uppercase text-slate-500 font-bold mb-3 tracking-widest"
          >
            Anime
          </h4>
          <div class="grid grid-cols-5 gap-2">
            {#each recentlyAdded.anime as media, i}
              {#if "isLoading" in media}
                <MediaCover
                  mediaId={i}
                  type="anime"
                  size="medium"
                  isLoading={true}
                />
              {:else}
                <MediaCover
                  mediaId={media.media_id}
                  type="anime"
                  size="medium"
                />
              {/if}
            {/each}
          </div>
        </div>

        <div>
          <h4
            class="text-[10px] uppercase text-slate-500 font-bold mb-3 tracking-widest"
          >
            Manga
          </h4>
          <div class="grid grid-cols-5 gap-2">
            {#each recentlyAdded.manga as media, i}
              {#if "isLoading" in media}
                <MediaCover
                  mediaId={i}
                  type="manga"
                  size="medium"
                  isLoading={true}
                />
              {:else}
                <MediaCover
                  mediaId={media.media_id}
                  type="manga"
                  size="medium"
                />
              {/if}
            {/each}
          </div>
        </div>

        <div>
          <h4
            class="text-[10px] uppercase text-slate-500 font-bold mb-3 tracking-widest"
          >
            Light Novels
          </h4>
          <div class="grid grid-cols-5 gap-2">
            {#each recentlyAdded.light_novel as media, i}
              {#if "isLoading" in media}
                <MediaCover
                  mediaId={i}
                  type="light_novel"
                  size="medium"
                  isLoading={true}
                />
              {:else}
                <MediaCover
                  mediaId={media.media_id}
                  type="light_novel"
                  size="medium"
                />
              {/if}
            {/each}
          </div>
        </div>
      </div>
    </div>
  </aside>

  <main>
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-3xl font-bold text-(--hako-fg)">Activity Feed</h1>
      <div class="flex items-center space-x-4">
        <SegmentedControl
          bind:value={feedMode}
          options={[
            { label: "Global", value: "global" },
            { label: "Following", value: "circle" },
          ]}
        />
        <SegmentedControl
          bind:value={feedFilter}
          options={[
            { label: "All", value: "all" },
            { label: "Posts", value: "posts" },
            { label: "Updates", value: "updates" },
          ]}
        />
      </div>
    </div>

    <FeedWrapper userId={user?.id} mode={feedMode} filter={feedFilter} />
  </main>
</div>
