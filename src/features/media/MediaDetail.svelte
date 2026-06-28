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
  import { computeMockVibes } from "./mockVibeCalc";
  import { RecommendationService, type MediaRecommendation } from "./services";
  import { AuthService } from "$core/auth";
  import type { Media, MediaCompanies, ForumThread } from "$shared/types";
  import { ForumThreadService } from "$features/forum/services/forumThreadService";
  import ThreadRow from "$features/forum/components/ThreadRow.svelte";
  import MediaRecommendations from "./MediaRecommendations.svelte";
  import MediaSidebar from "./MediaSidebar.svelte";

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
  let companies = $state<MediaCompanies>({ studios: [], producers: [] });
  let themes = $state<AnimeTheme[]>([]);
  let forumThreads = $state<ForumThread[]>([]);
  let recommendations = $state<MediaRecommendation[]>([]);
  let showAllRelations = $state(false);
  let currentUser = $state<{ id: string } | null>(null);
  let tagDefs = $state<
    Record<
      number,
      { name: string; category: string; parentName: string | null }
    >
  >({});

  function goto(path: string) {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  function getSiteConfig(site: string): { icon: string; color: string } {
    const lower = site.toLowerCase();
    if (lower.includes("twitter") || lower.includes("x.com")) return { icon: "fa-brands fa-x-twitter", color: "#000000" };
    if (lower.includes("youtube")) return { icon: "svg-youtube", color: "#FF0000" };
    if (lower.includes("crunchyroll")) return { icon: "svg-crunchyroll", color: "#F47521" };
    if (lower.includes("wikipedia")) return { icon: "fa-brands fa-wikipedia-w", color: "#636466" };
    if (lower.includes("facebook")) return { icon: "fa-brands fa-facebook", color: "#1877F2" };
    if (lower.includes("instagram")) return { icon: "fa-brands fa-instagram", color: "#E4405F" };
    if (lower.includes("amazon")) return { icon: "fa-brands fa-amazon", color: "#FF9900" };
    if (lower.includes("tiktok")) return { icon: "fa-brands fa-tiktok", color: "#000000" };
    if (lower.includes("discord")) return { icon: "fa-brands fa-discord", color: "#5865F2" };
    if (lower.includes("reddit")) return { icon: "fa-brands fa-reddit", color: "#FF4500" };
    if (lower.includes("twitch")) return { icon: "fa-brands fa-twitch", color: "#9146FF" };
    if (lower.includes("tumblr")) return { icon: "fa-brands fa-tumblr", color: "#36465D" };
    if (lower.includes("netflix")) return { icon: "fa-solid fa-film", color: "#E50914" };
    if (lower.includes("hulu")) return { icon: "fa-solid fa-film", color: "#1CE783" };
    if (lower.includes("hidive")) return { icon: "fa-solid fa-film", color: "#00A2FF" };
    if (lower.includes("funimation")) return { icon: "fa-solid fa-film", color: "#5B158B" };
    if (lower.includes("anilist") || lower.includes("myanimelist") || lower.includes("anidb") || lower.includes("mal")) return { icon: "fa-solid fa-database", color: "#02A9FF" };
    if (lower.includes("official")) return { icon: "fa-solid fa-globe", color: "#64748B" };
    return { icon: "fa-solid fa-link", color: "#64748B" };
  }

  const displayTitle = $derived.by(() => {
    const m = media;
    if (m && m.title) {
      return getDisplayTitle(m.title, settings.titlePreference) || "";
    }
    return "";
  });

  const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
    subgenre: { label: "Genre", color: "var(--c5)" },
    theme: { label: "Theme", color: "var(--c1)" },
    setting: { label: "Setting", color: "var(--c3)" },
    content: { label: "Content", color: "var(--c2)" },
    cast_trait: { label: "Cast Trait", color: "var(--c4)" },
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
    const order = ["subgenre", "theme", "setting", "content", "cast_trait"];
    return order.map((cat) => groups[cat]).filter(Boolean);
  });

  let vibes = $derived(computeMockVibes(categorizedTags));

  const groupedStaff = $derived(groupStaff(staff));
  const keyStaff = $derived(filterTopStaff(groupedStaff));

  function toTitleCase(str: string | null | undefined): string {
    if (!str) return "N/A";
    return str
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function getEffectiveRelationLabel(relationType: string): string {
    return toTitleCase(relationType);
  }

  const effectiveSource = $derived.by(() => {
    if (!media) return "";
    const m = media;
    if (m.source !== "OTHER") return toTitleCase(m.source);
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
    return hasAnimeRelation ? "Anime" : toTitleCase(m.source);
  });

  const RELATION_PRIORITY: Record<string, number> = {
    SOURCE: 1,
    ADAPTATION: 1,
    PREQUEL: 2,
    SIDE_STORY: 3,
    SPIN_OFF: 3,
    SEQUEL: 4,
  };

  const MEDIA_TYPE_ORDER: Record<string, number> = {
    anime: 1,
    manga: 2,
    light_novel: 3,
  };

  function sortRelations(rels: any[]): any[] {
    return [...rels].sort((a, b) => {
      const pA = RELATION_PRIORITY[a.relation_type] || 99;
      const pB = RELATION_PRIORITY[b.relation_type] || 99;
      if (pA !== pB) return pA - pB;

      const tA = MEDIA_TYPE_ORDER[a.related_media?.media_type] || 99;
      const tB = MEDIA_TYPE_ORDER[b.related_media?.media_type] || 99;
      if (tA !== tB) return tA - tB;

      return (a.related_media?.id || 0) - (b.related_media?.id || 0);
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

        if (cachedRelations && cachedRelations[0]?.related_media?.media_type) {
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
      <div class="relative -mt-20 flex items-end space-x-6 pb-6">
        <div
          class="w-40 lg:w-50 aspect-[17/23] bg-(--surface) rounded animate-pulse shrink-0"
        ></div>
        <div class="mb-2 w-full">
          <div
            class="h-8 w-2/3 bg-(--surface) rounded animate-pulse mb-2"
          ></div>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3">
            <div class="h-4 w-16 bg-(--surface) rounded animate-pulse"></div>
            <div class="h-4 w-12 bg-(--surface) rounded animate-pulse"></div>
            <div class="h-4 w-20 bg-(--surface) rounded animate-pulse"></div>
            <div class="h-4 w-24 bg-(--surface) rounded animate-pulse"></div>
            <div class="h-4 w-16 bg-(--surface) rounded animate-pulse"></div>
          </div>
          <div class="flex gap-2">
            <Badge loading variant="genre" />
            <Badge loading variant="genre" />
            <Badge loading variant="genre" />
          </div>
        </div>
      </div>
      <div class="flex gap-1 mb-6 pb-1 border-b border-(--c0)">
        {#each tabs as tab}
          <div
            class="flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap opacity-30"
          >
            <i class="fa-solid {tab.icon} text-xs"></i>
            {tab.label}
          </div>
        {/each}
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
                {#if companies.studios.length > 0}
                  <span class="text-(--c5)">{companies.studios.map(s => s.name).join(", ")}</span>
                {/if}
              </div>
              <div class="flex flex-wrap gap-2">
                {#each media.genres as genre}
                  <Badge label={genre} variant="genre" />
                {/each}
              </div>
            </div>
            <div class="flex flex-col items-end shrink-0 ml-4">
              <div class="flex items-center gap-6">
                <div class="text-center">
                  <div class="text-2xl font-black text-(--c5)">8.5</div>
                  <div
                    class="text-[10px] text-(--c8) uppercase tracking-widest font-bold"
                  >
                    Mean
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
                    Favorites
                  </div>
                </div>
              </div>
              {#if media.externalLinks.length > 0}
                <div class="flex flex-wrap gap-2 mt-4 justify-end">
                  {#each media.externalLinks as link}
                    {@const cfg = getSiteConfig(link.site)}
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={link.site}
                      class="inline-flex items-center justify-center w-9 h-9 rounded-full transition-transform hover:scale-110"
                      style="background-color: {cfg.color}"
                    >
                      {#if cfg.icon === 'svg-youtube'}
                        <svg class="w-[18px] h-[18px] text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                      {:else if cfg.icon === 'svg-crunchyroll'}
                        <svg class="w-[18px] h-[18px] text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M2.909 13.436C2.914 7.61 7.642 2.893 13.468 2.898c5.576.005 10.137 4.339 10.51 9.819q.021-.351.022-.706C24.007 5.385 18.64.006 12.012 0S.007 5.36 0 11.988 5.36 23.994 11.988 24q.412 0 .815-.027c-5.526-.338-9.9-4.928-9.894-10.538Zm16.284.155a4.1 4.1 0 0 1-4.095-4.103 4.1 4.1 0 0 1 2.712-3.855 8.95 8.95 0 0 0-4.187-1.037 9.007 9.007 0 1 0 8.997 9.016q-.001-.847-.15-1.651a4.1 4.1 0 0 1-3.278 1.63Z"/>
                        </svg>
                      {:else}
                        <i class="{cfg.icon} text-sm text-white"></i>
                      {/if}
                    </a>
                  {/each}
                </div>
              {/if}
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
                  {#each showAllRelations ? relations : relations.slice(0, 8) as relation}
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
                      {#if char.va}
                        <div class="flex gap-2 text-right min-w-0 items-end">
                          <div class="flex flex-col min-w-0 text-right">
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <span
                              class="text-sm text-(--hako-fg) font-bold truncate cursor-pointer"
                              onclick={(e) => {
                                e.stopPropagation();
                                goto(`/staff/${char.va.id}`);
                              }}>{char.va.name}</span
                            >
                            <span class="text-xs text-slate-500">Japanese</span>
                          </div>
                          <InitialAvatar
                            src={char.va.image}
                            name={char.va.name}
                            class="w-10 h-14 object-cover rounded shadow-md shrink-0 cursor-pointer"
                            onclick={(e) => {
                              e.stopPropagation();
                              goto(`/staff/${char.va.id}`);
                            }}
                          />
                        </div>
                      {/if}
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
              <MediaRecommendations
                bind:recommendations
                {mediaType}
                {currentUser}
                mediaId={Number(id)}
              />
            </div>

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
                  {#if char.va}
                    <div class="flex gap-3 text-right min-w-0 items-end">
                      <div class="flex flex-col min-w-0 text-right">
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <span
                          class="text-sm text-(--hako-fg) font-bold truncate cursor-pointer"
                          onclick={(e) => {
                            e.stopPropagation();
                            goto(`/staff/${char.va.id}`);
                          }}>{char.va.name}</span
                        >
                        <span class="text-xs text-slate-500">Japanese</span>
                      </div>
                      <InitialAvatar
                        src={char.va.image}
                        name={char.va.name}
                        class="w-12 h-16 object-cover rounded shadow-md shrink-0 cursor-pointer"
                        onclick={(e) => {
                          e.stopPropagation();
                          goto(`/staff/${char.va.id}`);
                        }}
                      />
                    </div>
                  {/if}
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
          <MediaSidebar
            {media}
            {type}
            {companies}
            {vibes}
            {categorizedTags}
            {effectiveSource}
          />
        </aside>
      </div>
    </div>
  </div>
{/if}
