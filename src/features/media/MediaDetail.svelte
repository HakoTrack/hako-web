<script lang="ts">
  import {
    MediaService,
    getMediaCharacters,
    getMediaStaff,
    getAnimeThemes,
    type AnimeTheme,
    groupStaff,
    filterTopStaff,
  } from "./services";
  import StaffPreview from "./StaffPreview.svelte";
  import StaffTab from "./StaffTab.svelte";
  import MediaTab from "./MediaTab.svelte";
  import {
    HakoImage,
    fetchMediaDetails,
    fetchTagDefinitions,
    formatDescription,
  } from "$shared/utils";
  import { CacheService, getDisplayTitle, settings } from "$core";
  import { MediaCover, Badge, InitialAvatar } from "$shared/components";
  import TasteProfile from "$features/profile/components/TasteProfile.svelte";
  import { computeMockVibes } from "./mockVibeCalc";
  import { RecommendationService, type MediaRecommendation } from "./services";
  import { AuthService } from "$core/auth";
  import type { Media, MediaCompanies, ForumThread } from "$shared/types";
  import { ForumThreadService } from "$features/forum/services/forumThreadService";
  import ThreadRow from "$features/forum/components/ThreadRow.svelte";

  let { mediaId, type = "anime" } = $props<{
    mediaId: string;
    type?: string;
  }>();

  let id = $derived(mediaId);
  let mediaType = $derived(type);

  let media: Media | null = $state(null);
  let relations: any[] = $state([]);
  let isLoading = $state(true);
  let currentActiveTab = $state("overview");
  let bannerError = $state(false);
  let characters = $state<any[]>([]);
  let staff = $state<any[]>([]);
  let companies = $state<MediaCompanies>({ studio: null, producers: [] });
  let themes = $state<AnimeTheme[]>([]);
  let forumThreads = $state<ForumThread[]>([]);
  let recommendations = $state<MediaRecommendation[]>([]);
  let isRecommending = $state(false);
  let recommendQuery = $state("");
  let recommendResults = $state<any[]>([]);
  let showAllRecs = $state(false);
  let showAllRelations = $state(false);
  let currentUser = $state<{ id: string } | null>(null);
  let tagDefs = $state<
    Record<number, { name: string; category: string; parentName: string | null }>
  >({});

  function goto(path: string) {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  async function handleVote(recommendationId: number, vote: 1 | -1) {
    const rec = recommendations.find((r) => r.id === recommendationId);
    if (!rec || !currentUser) return;

    if (rec.userVote === vote) {
      await RecommendationService.removeVote(recommendationId, currentUser.id);
    } else {
      await RecommendationService.vote(recommendationId, currentUser.id, vote);
    }

    const result = await RecommendationService.getRecommendations(
      Number(id),
      currentUser.id,
    );
    if (result.success) recommendations = result.data;
  }

  async function handleRecommend(mediaId: number) {
    if (!currentUser) return;
    const result = await RecommendationService.createRecommendation(
      Number(id),
      mediaId,
      currentUser.id,
    );
    if (result.success) {
      isRecommending = false;
      recommendQuery = "";
      recommendResults = [];
      const recResult = await RecommendationService.getRecommendations(
        Number(id),
        currentUser.id,
      );
      if (recResult.success) recommendations = recResult.data;
    }
  }

  const displayTitle = $derived.by(() => {
    const m = media;
    if (m && m.title) {
      return getDisplayTitle(m.title, settings.titlePreference) || "";
    }
    return "";
  });

  const CATEGORY_CONFIG: Record<
    string,
    { label: string; color: string }
  > = {
    subgenre: { label: "Genre", color: "var(--c5)" },
    theme: { label: "Theme", color: "var(--c1)" },
    setting: { label: "Setting", color: "var(--c3)" },
    content: { label: "Content", color: "var(--c2)" },
  };

  const categorizedTags = $derived.by(() => {
    const groups: Record<
      string,
      {
        category: string;
        label: string;
        color: string;
        tags: {
          name: string;
          parent?: string;
          spoiler?: boolean;
        }[];
      }
    > = {};
    for (const entry of media?.tags_v2 ?? []) {
      const def = tagDefs[entry.id];
      if (!def) continue;
      const cfg = CATEGORY_CONFIG[def.category];
      if (!cfg) continue;
      if (!groups[def.category]) {
        groups[def.category] = {
          category: def.category,
          label: cfg.label,
          color: cfg.color,
          tags: [],
        };
      }
      const tag: { name: string; parent?: string; spoiler?: boolean } = {
        name: def.name,
      };
      if (entry.spoiler) tag.spoiler = true;
      if (def.parentName) tag.parent = def.parentName;
      groups[def.category].tags.push(tag);
    }
    const order = ["subgenre", "theme", "setting", "content"];
    return order.map((cat) => groups[cat]).filter(Boolean);
  });

  let vibes = $derived(computeMockVibes(categorizedTags));

  const groupedStaff = $derived(groupStaff(staff));
  const keyStaff = $derived(filterTopStaff(groupedStaff));

  function toTitleCase(str: string | null | undefined): string {
    if (!str) return "N/A";
    return str
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  function getEffectiveRelationLabel(relationType: string): string {
    if (relationType === "ADAPTATION" && media?.source !== "ORIGINAL") {
      return "Source";
    }
    return toTitleCase(relationType);
  }

  function getEffectiveSource(media: Media): string {
    if (media.source !== "OTHER") return toTitleCase(media.source);

    const ANIME_FORMATS = new Set([
      "TV",
      "TV_SHORT",
      "MOVIE",
      "OVA",
      "ONA",
      "SPECIAL",
      "MUSIC",
    ]);
    const hasAnimeRelation = relations.some((rel: any) => {
      const type = rel.relation_type;
      const format = rel.related_media?.format;
      return type === "ADAPTATION" && ANIME_FORMATS.has(format);
    });
    return hasAnimeRelation ? "Anime" : toTitleCase(media.source);
  }

  const RELATION_PRIORITY: Record<string, number> = {
    ADAPTATION: 1,
    PREQUEL: 2,
    SIDE_STORY: 3,
    SPIN_OFF: 3,
    SEQUEL: 4,
  };

  function sortRelations(rels: any[]): any[] {
    return [...rels].sort((a, b) => {
      const pA = RELATION_PRIORITY[a.relation_type] || 99;
      const pB = RELATION_PRIORITY[b.relation_type] || 99;
      return pA - pB;
    });
  }

  $effect(() => {
    const currentId = id;
    const t = mediaType;
    if (!currentId) return;

    media = null;
    relations = [];
    characters = [];
    staff = [];
    themes = [];
    bannerError = false;
    currentActiveTab = "overview";
    isLoading = true;

    let aborted = false;

    (async () => {
      try {
        const [
          mediaRes,
          cachedRelations,
          characterRes,
          staffRes,
          companiesRes,
        ] = await Promise.all([
          fetchMediaDetails(Number(id)),
          CacheService.getMediaRelations(id),
          getMediaCharacters(Number(id)),
          getMediaStaff(Number(id)),
          MediaService.getMediaCompanies(Number(id)),
        ]);

        if (aborted) return;

        media = mediaRes;
        characters = characterRes;
        staff = staffRes;
        companies = companiesRes;

        if (mediaRes?.tags_v2?.length) {
          const defs = await fetchTagDefinitions(
            mediaRes.tags_v2.map((t) => t.id),
          );
          if (!aborted) tagDefs = defs;
        }

        if (cachedRelations) {
          relations = sortRelations(cachedRelations);
        } else {
          const relRes = await MediaService.getMediaRelations(Number(id));
          if (aborted) return;
          if (relRes.success) {
            relations = sortRelations(relRes.data);
            await CacheService.setMediaRelations(
              id,
              JSON.parse(JSON.stringify(relations)),
            );
          }
        }
      } catch (e) {
        if (aborted) return;
        console.error("Failed to fetch media:", e);
      } finally {
        if (!aborted) isLoading = false;
      }

      if (!aborted && t === "anime") {
        getAnimeThemes(Number(id)).then((result) => {
          if (!aborted) themes = result;
        });
      }

      ForumThreadService.getThreadsByMediaId(Number(id)).then((result) => {
        if (!aborted && result.success) forumThreads = result.data;
      });

      AuthService.getCurrentUser().then((user) => {
        if (aborted) return;
        currentUser = user;
        RecommendationService.getRecommendations(Number(id), user?.id).then(
          (result) => {
            if (!aborted && result.success) recommendations = result.data;
          },
        );
      });
    })();

    return () => {
      aborted = true;
    };
  });

  $effect(() => {
    const q = recommendQuery;
    if (!q || q.length < 2) {
      recommendResults = [];
      return;
    }

    const timer = setTimeout(async () => {
      const result = await RecommendationService.searchMedia(q);
      if (result.success) recommendResults = result.data;
    }, 200);

    return () => clearTimeout(timer);
  });

  const tabs = [
    { id: "overview", label: "Overview", icon: "fa-info-circle" },
    { id: "characters", label: "Characters", icon: "fa-users" },
    { id: "staff", label: "Staff", icon: "fa-user-tie" },
    { id: "media", label: "Media", icon: "fa-film" },
    { id: "community", label: "Community", icon: "fa-comments" },
  ];
</script>

{#if isLoading}
  <div class="animate-in fade-in duration-300">
    <div class="w-full h-100 bg-(--surface-elevated) animate-pulse"></div>
    <div class="max-w-375 mx-auto px-4 sm:px-6 lg:px-8">
      <div class="relative -mt-20 flex items-end space-x-6 pb-8">
        <div
          class="w-50 h-72 bg-(--surface) rounded-xl animate-pulse shrink-0"
        ></div>
        <div class="mb-2 space-y-4 w-full">
          <div class="h-8 w-2/3 bg-(--surface) rounded animate-pulse"></div>
          <div class="flex gap-2">
            <div class="w-20 h-6 bg-(--surface) rounded animate-pulse"></div>
            <div class="w-20 h-6 bg-(--surface) rounded animate-pulse"></div>
          </div>
        </div>
      </div>
      <div class="flex flex-col lg:flex-row gap-8 mb-12">
        <main class="grow min-h-100 pb-12 space-y-6">
          <div class="bg-card p-6 rounded-xl shadow-lg space-y-4">
            <div
              class="h-5 w-24 bg-(--surface-elevated) rounded animate-pulse"
            ></div>
            <div class="space-y-3">
              <div
                class="h-4 w-full bg-(--surface-elevated) rounded animate-pulse"
              ></div>
              <div
                class="h-4 w-5/6 bg-(--surface-elevated) rounded animate-pulse"
              ></div>
              <div
                class="h-4 w-4/6 bg-(--surface-elevated) rounded animate-pulse"
              ></div>
            </div>
          </div>
        </main>
        <aside class="lg:w-72 space-y-6">
          <div class="bg-card p-6 rounded-xl shadow-lg space-y-4">
            <div
              class="h-5 w-16 bg-(--surface-elevated) rounded animate-pulse"
            ></div>
            <div class="flex flex-wrap gap-2">
              <div
                class="w-16 h-6 bg-(--surface-elevated) rounded animate-pulse"
              ></div>
              <div
                class="w-16 h-6 bg-(--surface-elevated) rounded animate-pulse"
              ></div>
              <div
                class="w-20 h-6 bg-(--surface-elevated) rounded animate-pulse"
              ></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
{:else if !media}
  <div class="text-(--hako-fg) p-10 text-center">Media not found.</div>
{:else}
  <div class="relative">
    <div class="w-full h-100 relative overflow-hidden bg-(--hako-bg)">
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
          class="absolute inset-0 bg-linear-to-b from-transparent to-(--hako-bg)"
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
        class="absolute inset-0 bg-linear-to-t from-(--hako-bg) to-transparent"
      ></div>
    </div>

    <div class="max-w-375 mx-auto px-4 sm:px-6 lg:px-8">
      <div class="relative -mt-20 flex items-end space-x-6 pb-6">
        <MediaCover
          mediaId={media.media_id}
          {type}
          size="large"
          class="rounded shadow-2xl bg-(--surface) lg:w-50 shrink-0"
          showTooltip={false}
          alt={displayTitle}
        />
        <div class="mb-2 w-full">
          <div class="flex justify-between items-start">
            <div class="min-w-0">
              <h1 class="text-4xl font-bold text-(--hako-fg) mb-2">
                {displayTitle}
              </h1>
              <div
                class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-(--c8) mb-3"
              >
                <span class="font-medium text-(--hako-fg)">{media.format}</span>
                {#if type === "anime" && media.episodes}
                  <span>{media.episodes} eps</span>
                {:else if media.chapters}
                  <span>{media.chapters} ch.</span>
                {/if}
                <span>{toTitleCase(media.status)}</span>
                {#if media.season && media.seasonYear}
                  <span>{toTitleCase(media.season)} {media.seasonYear}</span>
                {/if}
                {#if companies.studio}
                  <span class="text-(--c5)">{companies.studio.name}</span>
                {/if}
              </div>
              <div class="flex flex-wrap gap-2">
                {#each media.genres as genre}
                  <Badge label={genre} variant="genre" />
                {/each}
              </div>
            </div>
            <div class="flex flex-col items-end shrink-0 ml-4">
              <div class="flex items-center gap-3">
                <div class="text-center">
                  <div class="text-2xl font-black text-(--c5)">8.5</div>
                  <div
                    class="text-[10px] text-(--c8) uppercase tracking-widest font-bold"
                  >
                    Score
                  </div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-black text-(--c5)">82</div>
                  <div
                    class="text-[10px] text-(--c8) uppercase tracking-widest font-bold"
                  >
                    Median
                  </div>
                </div>
                <div class="text-center">
                  <div
                    class="flex items-center gap-1 text-2xl font-black text-pink-500"
                  >
                    <i class="fa-solid fa-heart text-lg"></i>
                    <span>12.4k</span>
                  </div>
                  <div
                    class="text-[10px] text-(--c8) uppercase tracking-widest font-bold"
                  >
                    Fav
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex gap-1 mb-6 pb-1 border-b border-(--c0) overflow-x-auto">
        {#each tabs as tab}
          <button
            onclick={() => (currentActiveTab = tab.id)}
            class="flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px cursor-pointer
              {currentActiveTab === tab.id
              ? 'text-(--c5) border-(--c5)'
              : 'text-(--c8) border-transparent hover:text-(--hako-fg) hover:border-(--c8)'}"
          >
            <i class="fa-solid {tab.icon} text-xs"></i>
            {tab.label}
          </button>
        {/each}
      </div>

      <div class="flex flex-col lg:flex-row gap-8 mb-12">
        <main class="grow min-h-100 pb-12 space-y-6">
          <div class:hidden={currentActiveTab !== "overview"} class="space-y-6">
            <div class="bg-card p-6 rounded-xl shadow-lg">
              <h3 class="text-(--hako-fg) font-bold mb-4">Description</h3>
              <div class="text-slate-400 text-sm leading-relaxed">
                {@html formatDescription(media.description)}
              </div>
            </div>

            {#if relations.length > 0}
              <div class="space-y-4">
                <div class="flex justify-between items-center">
                  <h3 class="text-(--hako-fg) font-bold">Relations</h3>
                  {#if relations.length > 8 && !showAllRelations}
                    <button
                      onclick={() => (showAllRelations = true)}
                      class="text-xs text-(--c5) hover:underline cursor-pointer"
                    >
                      View all ({relations.length})
                    </button>
                  {/if}
                </div>
                <div class="flex flex-wrap gap-4">
                  {#each (showAllRelations ? relations : relations.slice(0, 8)) as relation}
                    <div class="relative group shrink-0">
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
                        {getEffectiveRelationLabel(relation.relation_type)}
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div class="space-y-4">
                <div class="flex justify-between items-center">
                  <h3 class="text-(--hako-fg) font-bold">Characters</h3>
                  <button
                    onclick={() => (currentActiveTab = "characters")}
                    class="text-xs text-slate-500 hover:text-accent font-medium transition-colors"
                    >View all</button
                  >
                </div>
                <div class="grid grid-cols-1 gap-3">
                  {#each [...characters]
                    .filter((c) => c.role === "MAIN")
                    .sort((a, b) => a.id - b.id) as char}
                    <div
                      class="bg-card rounded-lg overflow-hidden flex justify-between p-2 text-left w-full"
                    >
                      <div class="flex gap-3 min-w-0">
                        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <img
                          src={char.image}
                          alt={char.name}
                          class="w-10 h-14 object-cover rounded shadow-md shrink-0 cursor-pointer"
                          loading="lazy"
                          onclick={() => goto(`/character/${char.id}`)}
                        />
                        <div class="flex flex-col min-w-0">
                          <!-- svelte-ignore a11y_click_events_have_key_events -->
                          <!-- svelte-ignore a11y_no_static_element_interactions -->
                          <span
                            class="text-sm text-(--hako-fg) font-bold truncate cursor-pointer"
                            onclick={() => goto(`/character/${char.id}`)}
                            >{char.name}</span
                          >
                          <span class="text-xs text-slate-500"
                            >{toTitleCase(char.role)}</span
                          >
                        </div>
                      </div>
                      <div class="flex gap-2 text-right min-w-0 items-end">
                        <div class="flex flex-col min-w-0 text-right">
                          <!-- svelte-ignore a11y_click_events_have_key_events -->
                          <!-- svelte-ignore a11y_no_static_element_interactions -->
                          <span
                            class="text-sm text-(--hako-fg) font-bold truncate cursor-pointer"
                            onclick={(e) => {
                              e.stopPropagation();
                              if (char.va?.id) goto(`/staff/${char.va.id}`);
                            }}>{char.va?.name || "—"}</span
                          >
                          <span class="text-xs text-slate-500">Japanese</span>
                        </div>
                        <InitialAvatar
                          src={char.va?.image}
                          name={char.va?.name || "?"}
                          class="w-10 h-14 object-cover rounded shadow-md shrink-0 cursor-pointer"
                          onclick={(e) => {
                            e.stopPropagation();
                            if (char.va?.id) goto(`/staff/${char.va.id}`);
                          }}
                        />
                      </div>
                    </div>
                  {:else}
                    <p class="text-center text-slate-500 py-4 text-sm">
                      No character data available
                    </p>
                  {/each}
                </div>
              </div>

              <StaffPreview
                staff={keyStaff}
                onViewAll={() => (currentActiveTab = "staff")}
              />
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div class="space-y-4">
                <h3 class="text-(--hako-fg) font-bold">
                  Vibe-Driven Recommendations
                </h3>
                <p class="text-center text-slate-500 py-6 text-sm">
                  Coming soon
                </p>
              </div>
              <div class="space-y-4">
                <div class="flex justify-between items-center">
                  <h3 class="text-(--hako-fg) font-bold">
                    User Recommendations
                  </h3>
                  <div class="flex items-center gap-3">
                    <button
                      onclick={() => (isRecommending = true)}
                      class="text-xs text-slate-500 hover:text-accent font-medium transition-colors flex items-center gap-1"
                    >
                      <i class="fa-solid fa-plus"></i> Add
                    </button>
                    {#if recommendations.length > 4 && !showAllRecs}
                      <button
                        onclick={() => (showAllRecs = true)}
                        class="text-xs text-slate-500 hover:text-accent font-medium transition-colors"
                      >
                        View all
                      </button>
                    {/if}
                  </div>
                </div>
                {#if recommendations.length === 0}
                  <p class="text-center text-slate-500 py-6 text-sm">
                    No recommendations yet
                  </p>
                {:else}
                  <div class="flex flex-wrap gap-3">
                    {#each showAllRecs ? recommendations : recommendations.slice(0, 4) as rec (rec.id)}
                      <div class="relative group shrink-0">
                        <MediaCover
                          mediaId={rec.recommendedMediaId}
                          type={mediaType}
                          size="medium"
                        />
                        <div
                          class="absolute bottom-0 left-0 right-0 bg-(--hako-bg)/80 p-2 text-(--hako-fg) opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg"
                        >
                          <div
                            class="flex items-center justify-between text-xs font-bold pointer-events-auto"
                          >
                            <!-- svelte-ignore a11y_consider_explicit_label -->
                            <button
                              onclick={(e) => {
                                e.stopPropagation();
                                handleVote(rec.id, 1);
                              }}
                              class="cursor-pointer hover:text-(--c10) transition-colors {rec.userVote ===
                              1
                                ? 'text-(--c2)'
                                : ''}"
                            >
                              <i class="fa-solid fa-thumbs-up"></i>
                            </button>
                            <span>{rec.score}</span>
                            <!-- svelte-ignore a11y_consider_explicit_label -->
                            <button
                              onclick={(e) => {
                                e.stopPropagation();
                                handleVote(rec.id, -1);
                              }}
                              class="cursor-pointer hover:text-(--c1) transition-colors {rec.userVote ===
                              -1
                                ? 'text-(--c1)'
                                : ''}"
                            >
                              <i class="fa-solid fa-thumbs-down"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>

            {#if isRecommending}
              <div class="bg-card p-4 rounded-xl shadow-lg space-y-3">
                <div class="flex justify-between items-center">
                  <h3 class="text-(--hako-fg) font-bold text-sm">
                    Recommend a Title
                  </h3>
                  <!-- svelte-ignore a11y_consider_explicit_label -->
                  <button
                    onclick={() => {
                      isRecommending = false;
                      recommendQuery = "";
                      recommendResults = [];
                    }}
                    class="text-xs text-slate-500 hover:text-(--hako-fg)"
                  >
                    <i class="fa-solid fa-times"></i>
                  </button>
                </div>
                <input
                  type="text"
                  bind:value={recommendQuery}
                  placeholder="Search for a title..."
                  class="w-full px-3 py-2 rounded-lg bg-(--surface-elevated) text-sm text-(--hako-fg) border border-(--c0) outline-none focus:border-(--c5) transition-colors"
                />
                {#if recommendResults.length > 0}
                  <div class="max-h-48 overflow-y-auto space-y-1">
                    {#each recommendResults as result}
                      <button
                        onclick={() => handleRecommend(result.id)}
                        class="w-full text-left px-3 py-2 rounded-lg text-sm text-(--hako-fg) hover:bg-(--surface-elevated) transition-colors truncate"
                      >
                        {result.title}
                      </button>
                    {/each}
                  </div>
                {:else if recommendQuery.length >= 2 && recommendResults.length === 0}
                  <p class="text-xs text-slate-500 text-center py-2">
                    No results found
                  </p>
                {/if}
              </div>
            {/if}

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div class="space-y-3">
                <div class="flex justify-between items-center">
                  <h3 class="text-(--hako-fg) font-bold">Reviews</h3>
                  <button
                    onclick={() => (currentActiveTab = "community")}
                    class="text-xs text-slate-500 hover:text-accent font-medium transition-colors"
                    >View all</button
                  >
                </div>
                <p class="text-center text-slate-500 py-6 text-sm">
                  No reviews yet
                </p>
              </div>
              <div class="space-y-3">
                <div class="flex justify-between items-center">
                  <h3 class="text-(--hako-fg) font-bold">Forum Threads</h3>
                  <button
                    onclick={() => (currentActiveTab = "community")}
                    class="text-xs text-slate-500 hover:text-accent font-medium transition-colors"
                    >View all</button
                  >
                </div>
                {#if forumThreads.length === 0}
                  <p class="text-center text-slate-500 py-6 text-sm">
                    No forum threads yet
                  </p>
                {:else}
                  <div class="space-y-2">
                    {#each forumThreads.slice(0, 2) as thread (thread.id)}
                      <ThreadRow {thread} />
                    {/each}
                  </div>
                {/if}
              </div>
            </div>
          </div>

          <div class:hidden={currentActiveTab !== "characters"}>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              {#each [...characters].sort((a, b) => {
                const roleOrder = (r: string) => (r === "MAIN" ? 0 : 1);
                const diff = roleOrder(a.role) - roleOrder(b.role);
                return diff !== 0 ? diff : a.id - b.id;
              }) as char}
                <div
                  class="bg-card rounded-lg overflow-hidden flex justify-between p-2 text-left w-full"
                >
                  <div class="flex gap-4 min-w-0">
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <img
                      src={char.image}
                      alt={char.name}
                      class="w-12 h-16 object-cover rounded shadow-md shrink-0 cursor-pointer"
                      loading="lazy"
                      onclick={() => goto(`/character/${char.id}`)}
                    />
                    <div class="flex flex-col min-w-0">
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <span
                        class="text-sm text-(--hako-fg) font-bold truncate cursor-pointer"
                        onclick={() => goto(`/character/${char.id}`)}
                        >{char.name}</span
                      >
                      <span class="text-xs text-slate-500"
                        >{toTitleCase(char.role)}</span
                      >
                    </div>
                  </div>
                  <div class="flex gap-3 text-right min-w-0 items-end">
                    <div class="flex flex-col min-w-0 text-right">
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <span
                        class="text-sm text-(--hako-fg) font-bold truncate cursor-pointer"
                        onclick={(e) => {
                          e.stopPropagation();
                          if (char.va?.id) goto(`/staff/${char.va.id}`);
                        }}>{char.va?.name || "Unknown VA"}</span
                      >
                      <span class="text-xs text-slate-500">Japanese</span>
                    </div>
                    <InitialAvatar
                      src={char.va?.image}
                      name={char.va?.name || "?"}
                      class="w-12 h-16 object-cover rounded shadow-md shrink-0 cursor-pointer"
                      onclick={(e) => {
                        e.stopPropagation();
                        if (char.va?.id) goto(`/staff/${char.va.id}`);
                      }}
                    />
                  </div>
                </div>
              {:else}
                <p
                  class="col-span-full text-center text-slate-500 py-8 text-sm"
                >
                  No character data available
                </p>
              {/each}
            </div>
          </div>

          <div class:hidden={currentActiveTab !== "staff"}>
            <StaffTab staff={groupedStaff} />
          </div>

          <div class:hidden={currentActiveTab !== "media"}>
            <MediaTab {themes} {type} mediaId={Number(mediaId)} />
          </div>

          <div class:hidden={currentActiveTab !== "community"}>
            <h3 class="text-(--hako-fg) font-bold mb-4">Forum Threads</h3>
            {#if forumThreads.length === 0}
              <p class="text-slate-500 text-sm">No forum threads yet.</p>
            {:else}
              <div class="space-y-2">
                {#each forumThreads as thread (thread.id)}
                  <ThreadRow {thread} />
                {/each}
              </div>
            {/if}
          </div>
        </main>

        <aside class="lg:w-72 shrink-0">
          <div class="top-24 space-y-6">
            <div class="bg-card p-5 rounded-xl shadow-lg">
              <h3 class="text-(--hako-fg) font-bold mb-3 text-sm">Info</h3>
              <div class="space-y-2.5 text-sm text-slate-300">
                <div class="flex justify-between">
                  <span class="text-(--c8)">Source</span>
                  <span class="text-(--hako-fg)"
                    >{getEffectiveSource(media)}</span
                  >
                </div>
                <div class="flex justify-between">
                  <span class="text-(--c8)">Format</span>
                  <span class="text-(--hako-fg)">{media.format}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-(--c8)"
                    >{type === "anime" ? "Episodes" : "Chapters"}</span
                  >
                  <span class="text-(--hako-fg)">
                    {type === "anime"
                      ? media.episodes || "N/A"
                      : media.chapters || "N/A"}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-(--c8)">Duration</span>
                  <span class="text-(--hako-fg)"
                    >{media.duration || "N/A"}{type === "anime"
                      ? " mins"
                      : ""}</span
                  >
                </div>
                <div class="space-y-0.5">
                  <div class="flex justify-between">
                    <span class="text-(--c8)">Season</span>
                    <span class="text-(--hako-fg)"
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
                <hr class="border-(--c0) my-3" />
                <div class="flex justify-between">
                  <span class="text-(--c8)">Studio</span>
                  <span class="text-(--c5) font-medium"
                    >{companies.studio?.name || "—"}</span
                  >
                </div>
                {#if companies.producers.length > 0}
                  <div class="space-y-1">
                    <span class="text-(--c8) text-xs">Producers</span>
                    <div class="flex flex-wrap gap-1">
                      {#each companies.producers as producer (producer.id)}
                        <span
                          class="text-[10px] text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded border border-slate-700/50"
                          >{producer.name}</span
                        >
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>
            </div>

            <TasteProfile {vibes} />

            <div class="bg-card p-5 rounded-xl shadow-lg">
              <h3 class="text-(--hako-fg) font-bold mb-3 text-sm">Tags</h3>
              <div class="space-y-4">
                {#each categorizedTags as group}
                  <div>
                    <h4
                      class="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                      style="color: {group.color}"
                    >
                      {group.label}
                    </h4>
                    <div class="flex flex-wrap gap-1">
                      {#each group.tags as tag}
                        <span
                          class="px-2 py-0.5 rounded text-[11px] font-medium border {tag.spoiler
                            ? 'blur-sm hover:blur-none cursor-pointer transition-all duration-200'
                            : ''}"
                          style="border-color: {group.color}30; color: {group.color}; background: {group.color}10"
                        >
                          {tag.name}
                          {#if tag.parent}
                            <span class="opacity-50 ml-0.5">· {tag.parent}</span
                            >
                          {/if}
                        </span>
                      {/each}
                    </div>
                  </div>
                {/each}
              </div>
            </div>

            <div class="bg-card p-5 rounded-xl shadow-lg">
              <h3 class="text-(--hako-fg) font-bold mb-3 text-sm">Stats</h3>
              <div class="space-y-3">
                <div class="flex justify-between items-center">
                  <span class="text-(--c8) text-sm">Mean Score</span>
                  <span class="text-lg font-black text-(--c5)">8.5</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-(--c8) text-sm">Median Score</span>
                  <span class="text-lg font-black text-(--c5)">82</span>
                </div>
                <hr class="border-(--c0)" />
                <div class="flex justify-between items-center">
                  <span class="text-(--c8) text-sm">Favorites</span>
                  <span class="flex items-center gap-1 text-pink-500 font-bold">
                    <i class="fa-solid fa-heart text-xs"></i>
                    12.4k
                  </span>
                </div>
                <hr class="border-(--c0)" />
                <div>
                  <span class="text-(--c8) text-xs font-medium block mb-2"
                    >Score Distribution</span
                  >
                  <div class="flex items-end gap-px h-20">
                    {#each [{ score: 10, count: 120 }, { score: 20, count: 450 }, { score: 30, count: 800 }, { score: 40, count: 1500 }, { score: 50, count: 3200 }, { score: 60, count: 5600 }, { score: 70, count: 12000 }, { score: 80, count: 18000 }, { score: 90, count: 14000 }, { score: 100, count: 9000 }] as dist}
                      <div
                        class="flex-1 flex flex-col items-center justify-end h-full gap-0.5"
                      >
                        <div
                          class="w-full rounded-t opacity-70 hover:opacity-100 transition-opacity"
                          style="height: {(dist.count / 18000) *
                            100}%; background: var(--c5)"
                        ></div>
                        <span class="text-[8px] text-(--c8) font-bold"
                          >{dist.score}</span
                        >
                      </div>
                    {/each}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
{/if}
