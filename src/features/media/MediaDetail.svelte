<script lang="ts">
  import { onMount } from "svelte";
  import {
    fetchMediaDetails,
    formatDescription,
  } from "../../shared/utils/mediaData";
  import { MediaService } from "./services/mediaService";
  import { CacheService } from "../../core/cache";
  import { HakoImage } from "../../shared/utils/images";
  import { get_vibes_wasm } from "$wasm/hako_wasm";
  import { wasmInitialized } from "../../core/wasm-init";
  import { getDisplayTitle, settings } from "../../core/settings.svelte";
  import MediaCover from "../../shared/components/MediaCover.svelte";
  import Badge from "../../shared/components/Badge.svelte";
  import TasteProfile from "../profile/components/TasteProfile.svelte";
  import type { Media } from "../../shared/types/index";

  let { mediaId, type = "anime" } = $props<{
    mediaId: string;
    type?: string;
  }>();
  let media: Media | null = $state(null);
  let relations: any[] = $state([]);
  let isLoading = $state(true);
  let isWasmReady = $state(false);
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
  let vibes = $derived(isWasmReady && media ? get_vibes_wasm(media) : null);

  $effect(() => {
    const unsub = wasmInitialized.subscribe((ready) => {
      isWasmReady = ready;
    });
    return unsub;
  });

  function toTitleCase(str: string | null | undefined): string {
    if (!str) return "N/A";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  onMount(async () => {
    try {
      const [mediaRes, cachedRelations] = await Promise.all([
        fetchMediaDetails(Number(mediaId)),
        CacheService.getMediaRelations(mediaId),
      ]);

      media = mediaRes;

      if (cachedRelations) {
        relations = cachedRelations;
      } else {
        const relRes = await MediaService.getMediaRelations(Number(mediaId));
        if (relRes.success) {
          relations = relRes.data;
          await CacheService.setMediaRelations(
            mediaId,
            JSON.parse(JSON.stringify(relations)),
          );
        }
      }
    } catch (e) {
      console.error("Failed to fetch media:", e);
    } finally {
      isLoading = false;
    }
  });

  const tabs = [
    { id: "overview", label: "Overview", icon: "fa-info-circle" },
    { id: "characters", label: "Characters", icon: "fa-users" },
    { id: "staff", label: "Staff", icon: "fa-user-tie" },
    { id: "recommendations", label: "Recommendations", icon: "fa-thumbs-up" },
    { id: "reviews", label: "Reviews", icon: "fa-comments" },
    { id: "stats", label: "Stats", icon: "fa-chart-simple" },
  ];

  // Placeholder data for the new sections
  const mockExtraData = {
    studio: "Kyoto Animation",
    producers: ["Pony Canyon", "Lantis", "ABC Animation"],
    favorites: 12450,
    tags: [
      { name: "Coming of Age", rank: 95 },
      { name: "Music", rank: 88 },
      { name: "School", rank: 82 },
      { name: "Slice of Life", rank: 75 },
      { name: "Post-Apocalyptic", rank: 68 },
      { name: "Melancholy", rank: 62 },
    ],
    relations: [
      {
        id: 101,
        title: "Hako: The Movie",
        type: "Sequel",
        format: "Movie",
        image: "https://placehold.co/100x150/151f2e/ffffff?text=Movie",
      },
      {
        id: 102,
        title: "Hako: Side Story",
        type: "Side Story",
        format: "OVA",
        image: "https://placehold.co/100x150/151f2e/ffffff?text=OVA",
      },
      {
        id: 103,
        title: "Hako: Early Days",
        type: "Prequel",
        format: "TV",
        image: "https://placehold.co/100x150/151f2e/ffffff?text=Prequel",
      },
    ],
    characters: [
      {
        name: "Hako-chan",
        role: "Main",
        image: "https://placehold.co/100x150/151f2e/ffffff?text=Hako",
        va: {
          name: "Aoi Koga",
          image: "https://placehold.co/100x150/0b1622/ffffff?text=VA1",
        },
      },
      {
        name: "Sora-kun",
        role: "Main",
        image: "https://placehold.co/100x150/151f2e/ffffff?text=Sora",
        va: {
          name: "Natsuki Hanae",
          image: "https://placehold.co/100x150/0b1622/ffffff?text=VA2",
        },
      },
      {
        name: "Rin",
        role: "Supporting",
        image: "https://placehold.co/100x150/151f2e/ffffff?text=Rin",
        va: {
          name: "Rie Takahashi",
          image: "https://placehold.co/100x150/0b1622/ffffff?text=VA3",
        },
      },
      {
        name: "Ken",
        role: "Supporting",
        image: "https://placehold.co/100x150/151f2e/ffffff?text=Ken",
        va: {
          name: "Mamoru Miyano",
          image: "https://placehold.co/100x150/0b1622/ffffff?text=VA4",
        },
      },
    ],
    staff: [
      {
        name: "Naoko Yamada",
        role: "Director",
        image: "https://placehold.co/100x100/151f2e/ffffff?text=Staff1",
      },
      {
        name: "Reiko Yoshida",
        role: "Series Composition",
        image: "https://placehold.co/100x100/151f2e/ffffff?text=Staff2",
      },
      {
        name: "Futoshi Nishiya",
        role: "Character Design",
        image: "https://placehold.co/100x100/151f2e/ffffff?text=Staff3",
      },
      {
        name: "Kensuke Ushio",
        role: "Music",
        image: "https://placehold.co/100x100/151f2e/ffffff?text=Staff4",
      },
    ],
    stats: {
      medianScore: 84,
      distribution: [
        { score: 10, count: 120 },
        { score: 20, count: 450 },
        { score: 30, count: 800 },
        { score: 40, count: 1500 },
        { score: 50, count: 3200 },
        { score: 60, count: 5600 },
        { score: 70, count: 12000 },
        { score: 80, count: 18000 },
        { score: 90, count: 14000 },
        { score: 100, count: 9000 },
      ],
    },
  };
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
          class="w-40 lg:w-50 aspect-17/23 rounded bg-(--surface-elevated) animate-pulse shadow-2xl shrink-0"
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
      <div class="flex flex-col lg:flex-row gap-8 mb-12">
        <!-- Sidebar Skeleton -->
        <aside class="lg:w-50 shrink-0">
          <div
            class="bg-card rounded-xl border border-slate-800 overflow-hidden"
          >
            {#each Array(4) as _}
              <div
                class="h-11 w-full border-l-4 border-transparent bg-slate-800/20 animate-pulse mb-px"
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
        </div>
      </div>
    </div>
  </div>
{:else if !media}
  <div class="text-(--hako-fg) p-10 text-center">Media not found.</div>
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
          class="rounded shadow-2xl bg-(--surface) lg:w-50 shrink-0"
          showTooltip={false}
          alt={displayTitle}
        />

        <!-- Header Info -->
        <div class="mb-2 w-full">
          <div class="flex justify-between items-start">
            <h1 class="text-4xl font-bold text-(--hako-fg) mb-2">
              {displayTitle}
            </h1>
            <div class="flex flex-col items-end shrink-0">
              <div class="flex items-center gap-2 text-pink-500 mb-1">
                <i class="fa-solid fa-heart"></i>
                <span class="text-xl font-bold"
                  >{mockExtraData.favorites.toLocaleString()}</span
                >
              </div>
              <span
                class="text-[10px] text-slate-500 uppercase tracking-widest font-bold"
                >Favorites</span
              >
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            {#each media.genres as genre}
              <Badge label={genre} variant="genre" />
            {/each}
          </div>
        </div>
      </div>

      <!-- Main Layout -->
      <div class="flex flex-col lg:flex-row gap-8 mb-12">
        <!-- Sidebar Navigation -->
        <aside class="lg:w-50 shrink-0">
          <div class="sticky top-24">
            <div class="bg-card rounded-xl overflow-hidden">
              {#each tabs as tab}
                <button
                  onclick={() => (currentActiveTab = tab.id)}
                  class="flex items-center px-4 py-3 text-sm font-medium w-full transition-all border-l-4 outline-none focus:ring-0 {currentActiveTab ===
                  tab.id
                    ? 'text-(--hako-fg) bg-(--surface-elevated) border-accent'
                    : 'text-slate-400 hover:text-(--hako-fg) border-transparent'} "
                >
                  <i class="fa-solid {tab.icon} mr-3"></i>
                  {tab.label}
                </button>
              {/each}
            </div>
          </div>
        </aside>

        <!-- Main Content Area -->
        <main class="lg:w-[65%] min-h-100 pb-12 space-y-6">
          <!-- Overview Tab -->
          <div class:hidden={currentActiveTab !== "overview"} class="space-y-6">
            <div class="bg-card p-6 rounded-xl shadow-lg">
              <h3 class="text-(--hako-fg) font-bold mb-4">Description</h3>
              <div class="text-slate-400 text-sm leading-relaxed">
                {@html formatDescription(media.description)}
              </div>
            </div>

            <!-- Relations -->
            {#if relations.length > 0}
              <div class="space-y-4">
                <h3 class="text-(--hako-fg) font-bold px-2">Relations</h3>
                <div class="flex flex-wrap gap-4">
                  {#each relations as relation}
                    <div class="relative group">
                      <MediaCover
                        mediaId={relation.related_media.id}
                        type={relation.related_media.format === "MANGA"
                          ? "manga"
                          : "anime"}
                        size="medium"
                        alt={relation.related_media.title_romaji}
                      />
                      <div
                        class="absolute bottom-0.5 left-0.5 bg-(--hako-bg)/80 text-[0.7rem] font-bold text-(--hako-fg) px-1.5 py-0.5 rounded z-10 whitespace-nowrap"
                      >
                        {toTitleCase(relation.relation_type)}
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

            <!-- Characters Preview -->
            <div class="space-y-4">
              <div class="flex justify-between items-center px-2">
                <h3 class="text-(--hako-fg) font-bold">Characters</h3>
                <button
                  onclick={() => (currentActiveTab = "characters")}
                  class="text-xs text-slate-500 hover:text-accent font-medium transition-colors"
                  >View all</button
                >
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                {#each mockExtraData.characters.slice(0, 4) as char}
                  <div
                    class="bg-card rounded-lg overflow-hidden flex justify-between p-2 hover:bg-slate-800/30 transition-colors"
                  >
                    <div class="flex gap-3 min-w-0">
                      <img
                        src={char.image}
                        alt={char.name}
                        class="w-12 h-16 object-cover rounded shadow-md shrink-0"
                      />
                      <div class="flex flex-col justify-center min-w-0">
                        <span
                          class="text-xs text-(--hako-fg) font-bold truncate"
                          >{char.name}</span
                        >
                        <span class="text-[10px] text-slate-500"
                          >{char.role}</span
                        >
                      </div>
                    </div>
                    <div class="flex gap-3 text-right min-w-0">
                      <div class="flex flex-col justify-center min-w-0">
                        <span
                          class="text-xs text-(--hako-fg) font-bold truncate"
                          >{char.va.name}</span
                        >
                        <span class="text-[10px] text-slate-500">Japanese</span>
                      </div>
                      <img
                        src={char.va.image}
                        alt={char.va.name}
                        class="w-12 h-16 object-cover rounded shadow-md shrink-0"
                      />
                    </div>
                  </div>
                {/each}
              </div>
            </div>

            <!-- Staff Preview -->
            <div class="space-y-4">
              <div class="flex justify-between items-center px-2">
                <h3 class="text-(--hako-fg) font-bold">Staff</h3>
                <button
                  onclick={() => (currentActiveTab = "staff")}
                  class="text-xs text-slate-500 hover:text-accent font-medium transition-colors"
                  >View all</button
                >
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {#each mockExtraData.staff as person}
                  <div
                    class="bg-card rounded-lg overflow-hidden p-3 hover:bg-slate-800/30 transition-colors text-center"
                  >
                    <img
                      src={person.image}
                      alt={person.name}
                      class="w-16 h-16 object-cover rounded-full shadow-md mx-auto mb-2"
                    />
                    <span
                      class="block text-xs text-(--hako-fg) font-bold truncate"
                      >{person.name}</span
                    >
                    <span class="block text-[10px] text-slate-500 truncate"
                      >{person.role}</span
                    >
                  </div>
                {/each}
              </div>
            </div>
          </div>

          <!-- Characters Tab -->
          <div class:hidden={currentActiveTab !== "characters"}>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              {#each mockExtraData.characters as char}
                <div
                  class="bg-card rounded-lg overflow-hidden flex justify-between p-3 hover:bg-slate-800/30 transition-colors"
                >
                  <div class="flex gap-4 min-w-0">
                    <img
                      src={char.image}
                      alt={char.name}
                      class="w-16 h-24 object-cover rounded shadow-lg shrink-0"
                    />
                    <div class="flex flex-col justify-center min-w-0">
                      <span class="text-sm text-(--hako-fg) font-bold truncate"
                        >{char.name}</span
                      >
                      <span class="text-xs text-slate-500">{char.role}</span>
                    </div>
                  </div>
                  <div class="flex gap-4 text-right min-w-0">
                    <div class="flex flex-col justify-center min-w-0">
                      <span class="text-sm text-(--hako-fg) font-bold truncate"
                        >{char.va.name}</span
                      >
                      <span class="text-xs text-slate-500">Japanese</span>
                    </div>
                    <img
                      src={char.va.image}
                      alt={char.va.name}
                      class="w-16 h-24 object-cover rounded shadow-lg shrink-0"
                    />
                  </div>
                </div>
              {/each}
            </div>
          </div>

          <!-- Staff Tab -->
          <div class:hidden={currentActiveTab !== "staff"}>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {#each mockExtraData.staff as person}
                <div
                  class="bg-card rounded-xl p-4 hover:bg-slate-800/30 transition-all text-center group"
                >
                  <div class="relative mb-4">
                    <img
                      src={person.image}
                      alt={person.name}
                      class="w-24 h-24 object-cover rounded-full shadow-xl mx-auto border-2 border-slate-700 group-hover:border-accent transition-colors"
                    />
                  </div>
                  <span
                    class="block text-sm text-(--hako-fg) font-bold truncate mb-1"
                    >{person.name}</span
                  >
                  <span class="block text-xs text-slate-500 truncate"
                    >{person.role}</span
                  >
                </div>
              {/each}
            </div>
          </div>

          <div class:hidden={currentActiveTab !== "recommendations"}>
            <div class="p-10 text-slate-500 text-center">
              Recommendations view coming soon...
            </div>
          </div>
          <div class:hidden={currentActiveTab !== "reviews"}>
            <div class="p-10 text-slate-500 text-center">
              Reviews view coming soon...
            </div>
          </div>

          <!-- Stats Tab -->
          <div class:hidden={currentActiveTab !== "stats"}>
            <div class="bg-card p-8 rounded-xl shadow-lg space-y-10">
              <div class="flex flex-col items-center text-center">
                <span class="text-6xl font-black text-accent mb-2"
                  >{mockExtraData.stats.medianScore}%</span
                >
                <span
                  class="text-sm text-slate-400 uppercase tracking-widest font-bold"
                  >Median Score</span
                >
              </div>

              <div class="space-y-6">
                <h4
                  class="text-(--hako-fg) font-bold text-sm uppercase tracking-wider text-center"
                >
                  Score Distribution
                </h4>
                <div class="flex items-end gap-1 h-48 group px-4">
                  {#each mockExtraData.stats.distribution as dist}
                    <div
                      class="flex-1 flex flex-col items-center gap-3 group/bar"
                    >
                      <div
                        class="w-full bg-accent/20 rounded-t-md group-hover:bg-accent/10 group-hover/bar:bg-accent transition-all relative"
                        style="height: {(dist.count / 18000) * 100}%"
                      >
                        <div
                          class="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-[10px] px-2 py-1.5 rounded-md opacity-0 group-hover/bar:opacity-100 transition-opacity shadow-xl border border-slate-700 whitespace-nowrap z-10"
                        >
                          <span class="text-accent font-bold"
                            >{dist.count.toLocaleString()}</span
                          > users
                        </div>
                      </div>
                      <span class="text-[10px] text-slate-500 font-bold"
                        >{dist.score}</span
                      >
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          </div>
        </main>

        <!-- Metadata Column -->
        {#if currentActiveTab === "overview"}
          <div class="lg:w-[20%] space-y-6">
            <!-- Vibes -->
            <TasteProfile {vibes} />

            <!-- Info -->
            <div class="bg-card p-6 rounded-xl shadow-lg">
              <h3 class="text-(--hako-fg) font-bold mb-4">Info</h3>
              <div class="space-y-3 text-sm text-slate-300">
                <div class="flex justify-between">
                  <span>Source</span><span class="text-(--hako-fg)"
                    >{toTitleCase(media.source)}</span
                  >
                </div>
                <div class="flex justify-between">
                  <span>Format</span><span class="text-(--hako-fg)"
                    >{media.format}</span
                  >
                </div>
                <div class="flex justify-between">
                  {#if type === "anime"}
                    <span>Episodes</span>
                  {:else}
                    <span>Chapters</span>
                  {/if}
                  <span class="text-(--hako-fg)">
                    {#if type === "anime"}
                      {media.episodes || "N/A"}
                    {:else}
                      {media.chapters || "N/A"}
                    {/if}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span>Duration</span><span class="text-(--hako-fg)"
                    >{media.duration || "N/A"}
                    {type === "anime" ? "mins" : ""}</span
                  >
                </div>
                <div class="space-y-1">
                  <div class="flex justify-between">
                    <span>Season</span><span class="text-(--hako-fg)"
                      >{toTitleCase(media.season)}
                      {media.seasonYear || ""}</span
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

                <hr class="border-slate-800 my-4" />

                <div class="flex justify-between">
                  <span>Studio</span><span class="text-accent font-medium"
                    >{mockExtraData.studio}</span
                  >
                </div>
                <div class="space-y-1">
                  <span class="text-slate-500 text-xs">Producers</span>
                  <div class="flex flex-wrap gap-1">
                    {#each mockExtraData.producers as producer}
                      <span
                        class="text-[10px] text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded border border-slate-700/50"
                        >{producer}</span
                      >
                    {/each}
                  </div>
                </div>
              </div>
            </div>

            <!-- Tags -->
            <div class="bg-card p-6 rounded-xl shadow-lg">
              <h3 class="text-(--hako-fg) font-bold mb-4">Tags</h3>
              <div class="space-y-3">
                {#each mockExtraData.tags as tag}
                  <div class="group cursor-default">
                    <div class="flex justify-between text-[11px] mb-1.5">
                      <span
                        class="text-slate-400 group-hover:text-accent transition-colors"
                        >{tag.name}</span
                      >
                      <span
                        class="text-slate-600 group-hover:text-slate-400 transition-colors font-medium"
                        >{tag.rank}%</span
                      >
                    </div>
                    <div
                      class="w-full h-1 bg-slate-800 rounded-full overflow-hidden"
                    >
                      <div
                        class="h-full bg-accent/40 group-hover:bg-accent transition-all duration-500"
                        style="width: {tag.rank}%"
                      ></div>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
