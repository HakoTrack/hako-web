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
  let bannerError = $state(false);

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
  <div class="animate-in fade-in duration-300">
    <!-- Banner Skeleton -->
    <div
      class="w-full h-80 bg-[#0b1622] animate-pulse relative overflow-hidden"
    >
      <div
        class="absolute inset-0 bg-linear-to-t from-[#0b1622] to-transparent"
      ></div>
    </div>

    <!-- Main Content Container Skeleton -->
    <div class="max-w-375 mx-auto px-4 sm:px-6 lg:px-8">
      <div class="relative -mt-20 flex items-end space-x-6 pb-8">
        <!-- Cover Skeleton -->
        <div
          class="w-40 h-56 rounded-xl border-4 border-[#0b1622] bg-[#151f2e] animate-pulse shadow-2xl shrink-0"
        ></div>

        <!-- Header Info Skeleton -->
        <div class="mb-2 space-y-4 w-full">
          <div
            class="w-1/3 h-10 bg-(--surface-elevated) animate-pulse rounded"
          ></div>
          <div class="flex gap-2">
            <div class="w-20 h-5 bg-blue-500/10 animate-pulse rounded"></div>
            <div class="w-20 h-5 bg-blue-500/10 animate-pulse rounded"></div>
          </div>
        </div>
      </div>

      <!-- Main Layout Skeleton -->
      <div class="flex flex-col lg:flex-row gap-8">
        <!-- Sidebar Skeleton -->
        <aside class="lg:w-50 shrink-0">
          <div
            class="bg-card rounded-xl border border-slate-800 overflow-hidden"
          >
            {#each Array(4) as _}
              <div
                class="h-11 w-full border-l-4 border-transparent bg-slate-800/20 animate-pulse mb-[1px]"
              ></div>
            {/each}
          </div>
        </aside>

        <!-- Main Content Area Skeleton -->
        <main class="lg:w-[65%] min-h-100 pb-12 space-y-6">
          <div
            class="bg-card p-6 rounded-xl shadow-lg border border-slate-800 space-y-4"
          >
            <div
              class="w-32 h-6 bg-(--surface-elevated) animate-pulse rounded"
            ></div>
            <div class="space-y-3">
              <div
                class="w-full h-4 bg-(--surface-elevated)/50 animate-pulse rounded"
              ></div>
              <div
                class="w-full h-4 bg-(--surface-elevated)/50 animate-pulse rounded"
              ></div>
              <div
                class="w-full h-4 bg-(--surface-elevated)/50 animate-pulse rounded"
              ></div>
              <div
                class="w-3/4 h-4 bg-(--surface-elevated)/50 animate-pulse rounded"
              ></div>
            </div>
          </div>
        </main>

        <!-- Metadata Column Skeleton -->
        <div class="lg:w-[20%] space-y-6">
          <div
            class="bg-card p-6 rounded-xl shadow-lg border border-slate-800 space-y-4"
          >
            <div
              class="w-20 h-5 bg-(--surface-elevated) animate-pulse rounded"
            ></div>
            <div class="flex flex-wrap gap-2">
              <div class="w-16 h-6 bg-slate-800 animate-pulse rounded"></div>
              <div class="w-16 h-6 bg-slate-800 animate-pulse rounded"></div>
            </div>
          </div>
          <div
            class="bg-card p-6 rounded-xl shadow-lg border border-slate-800 space-y-4"
          >
            <div
              class="w-16 h-5 bg-(--surface-elevated) animate-pulse rounded"
            ></div>
            <div class="space-y-4">
              {#each Array(4) as _}
                <div class="flex justify-between">
                  <div
                    class="w-12 h-4 bg-(--surface-elevated)/50 animate-pulse rounded"
                  ></div>
                  <div
                    class="w-16 h-4 bg-(--surface-elevated) animate-pulse rounded"
                  ></div>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{:else if !media}
  <div class="text-white p-10 text-center">Media not found.</div>
{:else}
  <div class="relative">
    <!-- Banner -->
    <div class="w-full h-80 relative overflow-hidden bg-[#0b1622]">
      {#if bannerError}
        <div
          class="absolute inset-0"
          style="
            --s: 40px;
            --c1: var(--surface-elevated);
            --c2: var(--surface-dim);
            --c: #0000 71%, var(--c1) 0 79%, #0000 0;
            --_s: calc(var(--s)/2)/calc(2*var(--s)) calc(2*var(--s));
            background:
              linear-gradient(45deg, var(--c)) calc(var(--s)/-2) var(--_s),
              linear-gradient(135deg, var(--c)) calc(var(--s)/2) var(--_s),
              radial-gradient(var(--c1) 35%, var(--c2) 37%) 0 0/var(--s) var(--s);
            opacity: 0.15;
          "
        ></div>
        <div
          class="absolute inset-0 bg-linear-to-b from-transparent to-[#0b1622]"
        ></div>
      {:else}
        <img
          src={HakoImage.getBanner(media.media_id)}
          class="w-full h-full object-cover opacity-50"
          alt="Banner"
          onerror={() => (bannerError = true)}
        />
      {/if}
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
                  {#if type === "anime"}
                    <span>Episodes</span>
                  {:else}
                    <span>Chapters</span>
                  {/if}
                  <span class="text-white">
                    {#if type === "anime"}
                      {media.episodes || "N/A"}
                    {:else}
                      {media.chapters || "N/A"}
                    {/if}
                  </span>
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
