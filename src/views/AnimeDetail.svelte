<script lang="ts">
  import { onMount } from "svelte";
  import { fetchMediaById } from "../utils/mediaData";
  import { HakoImage } from "../utils/images";
  import { getVibes } from "../utils/vibeCalc";
  import { openQuickEditor } from "../core/ui.svelte";

  import type { Media } from "../types/Media";

  let { mediaId } = $props();
  let media: Media | null = $state(null);
  let isLoading = $state(true);

  // Reactive vibe calculation
  let vibes = $derived(media ? getVibes(media) : null);

  onMount(async () => {
    try {
      media = await fetchMediaById(mediaId);
      if (media) {
        console.log("DEBUG: All media keys:", Object.keys(media));
        console.log("DEBUG: Full media object:", $state.snapshot(media));
      }
    } catch (e) {
      console.error("Failed to fetch anime:", e);
    } finally {
      isLoading = false;
    }
  });
</script>

{#if isLoading}
  <div class="flex items-center justify-center p-20 text-white">Loading...</div>
{:else if !media}
  <div class="text-white p-10 text-center">Anime not found.</div>
{:else}
  <div class="relative">
    <!-- Full-width Banner -->
    <div class="w-full h-80 relative overflow-hidden bg-[#0b1622]">
      <img
        src={HakoImage.getBanner("anime", media.media_id)}
        class="w-full h-full object-cover opacity-50"
        alt="Banner"
      />
      <div
        class="absolute inset-0 bg-linear-to-t from-[#0b1622] to-transparent"
      ></div>
    </div>

    <!-- Main Content Container -->
    <div class="max-w-375 mx-auto px-4 sm:px-6 lg:px-8">
      <div class="relative -mt-20 flex items-end space-x-6 pb-8">
        <!-- Cover -->
        <button
          onclick={() => media && openQuickEditor(media.media_id, "anime")}
          class="hover:scale-105 transition-transform duration-200 cursor-pointer focus:outline-none"
        >
          <img
            src={HakoImage.getCover("anime", media.media_id, "large")}
            class="media-cover w-40 h-56 rounded-xl border-4 border-[#0b1622] shadow-2xl object-cover bg-[#151f2e]"
            data-media-id={media.media_id}
            alt={media.title.romaji}
          />
        </button>

        <!-- Header Info -->
        <div class="mb-2">
          <h1 class="text-4xl font-bold text-white mb-2">
            {media.title.romaji}
          </h1>
          <div class="flex flex-wrap gap-2">
            {#each media.genres as genre}
              <span
                class="bg-blue-500/10 text-blue-400 text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider"
                >{genre}</span
              >
            {/each}
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Main Description -->
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-card p-6 rounded-xl shadow-lg">
            <h3 class="text-white font-bold mb-4">Description</h3>
            <p
              class="text-slate-400 text-sm leading-relaxed mb-6 whitespace-pre-wrap"
            >
              {media.description}
            </p>

            <h3 class="text-white font-bold mb-4">Tags</h3>
            <div class="flex flex-wrap gap-2">
              {#each media.tags as tag}
                <span
                  class="bg-slate-800 text-slate-400 text-xs px-2 py-1 rounded font-medium"
                  >{tag.name}</span
                >
              {/each}
            </div>
          </div>
        </div>

        <!-- Sidebar Metadata -->
        <div class="space-y-6">
          <!-- Vibes (Moved above Info) -->
          <div class="bg-card p-6 rounded-xl shadow-lg">
            <h3 class="text-white font-bold mb-4">Vibes</h3>
            <div class="flex flex-wrap gap-2">
              {#if vibes && vibes.sorted}
                {#each vibes.sorted.slice(0, 3) as pillar}
                  <span
                    class="bg-slate-800 text-slate-300 text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider"
                    >{pillar.name}</span
                  >
                {/each}
              {/if}
            </div>
          </div>

          <div class="bg-card p-6 rounded-xl shadow-lg">
            <h3 class="text-white font-bold mb-4">Info</h3>
            <div class="space-y-3 text-sm text-slate-300">
              <div class="flex justify-between">
                <span>Format</span><span class="text-white">{media.format}</span
                >
              </div>
              <div class="flex justify-between">
                <span>Episodes</span><span class="text-white"
                  >{media.episodes || "N/A"}</span
                >
              </div>
              <div class="flex justify-between">
                <span>Duration</span><span class="text-white"
                  >{media.duration} mins</span
                >
              </div>
              <div class="flex justify-between">
                <span>Season</span><span class="text-white"
                  >{media.season} {media.seasonYear}</span
                >
              </div>
              <div class="flex justify-between">
                <span>Started</span><span class="text-white"
                  >{media.startDate?.year
                    ? `${String(media.startDate.month).padStart(2, "0")}/${String(media.startDate.day).padStart(2, "0")}/${media.startDate.year}`
                    : "N/A"}</span
                >
              </div>
              <div class="flex justify-between">
                <span>Ended</span><span class="text-white"
                  >{media.endDate?.year
                    ? `${String(media.endDate.month).padStart(2, "0")}/${String(media.endDate.day).padStart(2, "0")}/${media.endDate.year}`
                    : "N/A"}</span
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
