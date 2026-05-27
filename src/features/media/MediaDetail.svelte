<script lang="ts">
  import { onMount } from "svelte";
  import { fetchMediaById } from "../../shared/utils/mediaData";
  import { HakoImage } from "../../shared/utils/images";
  import { getVibes } from "../profile/services/vibeCalc";
  import { openQuickEditor, ui } from "../../core/ui.svelte";
  import { getDisplayTitle, settings } from "../../core/settings.svelte";
  import { formatDescription } from "../../shared/utils/mediaData";
  import MediaCover from "../../shared/components/MediaCover.svelte";
  import type { Media } from "../../shared/types/index";

  let { mediaId, type = "anime" } = $props<{
    mediaId: string;
    type?: string;
  }>();
  let media: Media | null = $state(null);
  let isLoading = $state(true);
  let currentActiveTab = $state("overview"); // Tab tracking state

  // Derived title based on user preference
  const displayTitle = $derived.by(() => {
    const m = media;
    if (m && m.title) {
      return getDisplayTitle(m.title, settings.titlePreference) || "";
    }
    return "";
  });

  // Reactive vibe calculation
  let vibes = $derived(media ? getVibes(media) : null);

  onMount(async () => {
    try {
      media = await fetchMediaById(Number(mediaId));
    } catch (e) {
      console.error("Failed to fetch media:", e);
    } finally {
      isLoading = false;
    }
  });

  const tabs = [
    { id: "overview", label: "Overview", icon: "fa-info-circle" },
    { id: "characters", label: "Characters", icon: "fa-users" },
    { id: "reviews", label: "Reviews", icon: "fa-comments" },
    { id: "stats", label: "Stats", icon: "fa-chart-simple" },
  ];
</script>

{#if isLoading}
  <div class="flex items-center justify-center p-20 text-white">Loading...</div>
{:else if !media}
  <div class="text-white p-10 text-center">Media not found.</div>
{:else}
  <div class="relative">
    <!-- Banner -->
    <div class="w-full h-80 relative overflow-hidden bg-[#0b1622]">
      <img
        src={HakoImage.getBanner(media.media_id)}
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
        <MediaCover
          mediaId={media.media_id}
          {type}
          size="large"
          class="rounded-xl border-4 border-[#0b1622] shadow-2xl bg-[#151f2e]"
          showTooltip={false}
          alt={displayTitle}
        />

        <!-- Header Info -->
        <div class="mb-2">
          <h1 class="text-4xl font-bold text-white mb-2">
            {displayTitle}
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

      <!-- Main Layout -->
      <div class="flex flex-col lg:flex-row gap-8">
        <!-- Sidebar Navigation -->
        <aside class="lg:w-50 shrink-0">
          <div class="sticky top-24">
            <div
              class="bg-card rounded-xl border border-slate-800 overflow-hidden"
            >
              {#each tabs as tab}
                <button
                  onclick={() => (currentActiveTab = tab.id)}
                  class="flex items-center px-4 py-3 text-sm font-medium w-full transition-all border-l-4 {currentActiveTab ===
                  tab.id
                    ? 'text-white bg-slate-800/50 border-accent'
                    : 'text-slate-400 hover:text-white border-transparent'} "
                >
                  <i class="fa-solid {tab.icon} mr-3"></i>
                  {tab.label}
                </button>
              {/each}
            </div>
          </div>
        </aside>

        <!-- Main Content Area -->
        <main class="lg:w-[65%] min-h-100 pb-12">
          <div class:hidden={currentActiveTab !== "overview"}>
            <div
              class="bg-card p-6 rounded-xl shadow-lg border border-slate-800"
            >
              <h3 class="text-white font-bold mb-4">Description</h3>
              <div class="text-slate-400 text-sm leading-relaxed">
                {@html formatDescription(media.description)}
              </div>
            </div>
          </div>
          <div class:hidden={currentActiveTab !== "characters"}>
            <div class="p-10 text-slate-500">Character view coming soon...</div>
          </div>
        </main>

        <!-- Metadata Column -->
        {#if currentActiveTab === "overview"}
          <div class="lg:w-[20%] space-y-6">
            <!-- Vibes -->
            <div
              class="bg-card p-6 rounded-xl shadow-lg border border-slate-800"
            >
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

            <!-- Info -->
            <div
              class="bg-card p-6 rounded-xl shadow-lg border border-slate-800"
            >
              <h3 class="text-white font-bold mb-4">Info</h3>
              <div class="space-y-3 text-sm text-slate-300">
                <div class="flex justify-between">
                  <span>Format</span><span class="text-white"
                    >{media.format}</span
                  >
                </div>
                <div class="flex justify-between">
                  <span>{type === "anime" ? "Episodes" : "Chapters"}</span><span
                    class="text-white"
                    >{(type === "anime" ? media.episodes : media.chapters) ||
                      "N/A"}</span
                  >
                </div>
                <div class="flex justify-between">
                  <span>Duration</span><span class="text-white"
                    >{media.duration || "N/A"}
                    {type === "anime" ? "mins" : ""}</span
                  >
                </div>
                <div class="space-y-1">
                  <div class="flex justify-between">
                    <span>Season</span><span class="text-white"
                      >{media.season || ""} {media.seasonYear || ""}</span
                    >
                  </div>
                  {#if media.startDate?.year || media.endDate?.year}
                    <div class="text-[10px] text-slate-500 text-right">
                      {media.startDate?.year
                        ? `${String(media.startDate.month).padStart(2, "0")}/${String(media.startDate.day).padStart(2, "0")}/${media.startDate.year}`
                        : "???"}
                      -
                      {media.endDate?.year
                        ? `${String(media.endDate.month).padStart(2, "0")}/${String(media.endDate.day).padStart(2, "0")}/${media.endDate.year}`
                        : "Present"}
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
