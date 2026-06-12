<script lang="ts">
  import { ProfileService } from "./services/profileService";
  import { fetchMediaSummaryWithGenres } from "../../shared/utils/mediaData";
  import type { Profile } from "../../shared/types";
  import { HakoImage } from "../../shared/utils/images";
  import MediaList from "./components/MediaList.svelte";
  import FavoritesFullGrid from "./components/FavoritesFullGrid.svelte";
  import Stats from "./components/Stats.svelte";
  import Overview from "./components/Overview.svelte";
  import { ROLES } from "../../shared/utils/constants";
  import { untrack } from "svelte";

  let {
    currentPath,
    activeTab = "overview",
    profileData: propProfileData,
  } = $props<{
    currentPath: string;
    activeTab?: string;
    profileData: Profile | null;
  }>();

  let username = $derived(currentPath.split("/")[2]);
  let profileData: Profile | null = $state(null);
  // CRITICAL: Use $state.raw for metadata to avoid proxying thousands of objects
  let metadataCache: Record<string, Record<string, any>> = $state.raw({});
  let currentActiveTab = $derived(activeTab);

  // Sync state when props change, but MERGE to avoid losing data
  $effect(() => {
    const newData = propProfileData;

    untrack(() => {
      if (newData) {
        const hasNewLists =
          newData.mediaLists && Object.keys(newData.mediaLists).length > 0;

        profileData = {
          ...newData,
          // Keep current lists if the new ones are empty/missing
          mediaLists: hasNewLists
            ? newData.mediaLists
            : profileData?.mediaLists || {},
        };
      } else {
        profileData = null;
      }
    });
  });

  $effect(() => {
    currentActiveTab = activeTab;
  });

  let listType = $derived(
    currentActiveTab === "lightnovel" ? "light_novel" : currentActiveTab,
  );

  let isFetchingLists = $state(false);
  let isMetadataLoading = $state(false);
  let lastFetchedId = $state<string | null>(null);

  $effect(() => {
    const isFetching = isFetchingLists;

    if (
      propProfileData &&
      propProfileData.id !== lastFetchedId &&
      !isFetching
    ) {
      untrack(() => {
        profileData = propProfileData;

        const hasLists = Object.keys(profileData?.mediaLists || {}).length > 0;

        if (!hasLists && profileData) {
          isFetchingLists = true;
          isMetadataLoading = true;
          lastFetchedId = profileData.id;
          ProfileService.getMediaLists(profileData.id).then((lists) => {
            if (profileData) {
              profileData = { ...profileData, mediaLists: lists };

              const types = Object.keys(lists);
              const totalTypes = types.length;

              if (totalTypes === 0) {
                isMetadataLoading = false;
              }

              const pendingMetadata: Record<string, Record<string, any>> = {};

              const fetchPromises = Object.entries(lists).map(
                ([type, items]) => {
                  const ids = (items as any[]).map((i: any) => i.media_id);
                  if (ids.length > 0) {
                    return fetchMediaSummaryWithGenres(ids).then((m) => {
                      pendingMetadata[type] = m;
                    });
                  }
                  return Promise.resolve();
                },
              );

              Promise.all(fetchPromises).then(() => {
                untrack(() => {
                  // Use raw assignment to update metadataCache without tracking overhead
                  metadataCache = { ...metadataCache, ...pendingMetadata };
                  isMetadataLoading = false;
                });
              });
            }
            isFetchingLists = false;
          });
        }
      });
    }
  });

  function switchTab(tab: string, path: string) {
    currentActiveTab = tab;
    window.history.pushState({}, "", path);
  }

  const tabs = $derived([
    { id: "overview", label: "Overview", path: `/user/${username}` },
    { id: "anime", label: "Anime", path: `/user/${username}/anime` },
    { id: "manga", label: "Manga", path: `/user/${username}/manga` },
    {
      id: "lightnovel",
      label: "Light Novels",
      path: `/user/${username}/lightnovel`,
    },
    {
      id: "favorites",
      label: "Favorites",
      path: `/user/${username}/favorites`,
    },
    { id: "stats", label: "Stats", path: `/user/${username}/stats` },
  ]);

  let roleConfig = $derived(
    (profileData as any)?.role
      ? ROLES[(profileData as any).role.toLowerCase()]
      : null,
  );

  let flatMetadata = $derived.by(() => {
    const values = Object.values(metadataCache);
    if (values.length === 0) return {};
    if (values.length === 1) return values[0] || {};

    const target = {};
    for (const m of values) {
      if (m) Object.assign(target, m);
    }
    return target;
  });
</script>

<div id="profile-container" class="relative">
  <div class="fixed top-0 left-0 w-full h-100 -z-20 mt-15 overflow-hidden">
    <img
      src={HakoImage.get(profileData?.banner_url)}
      alt="Banner"
      class="object-top w-full h-full object-cover bg-[#151f2e]"
    />
  </div>

  <div
    class="absolute top-0 -z-10 w-full h-full"
    style="background: linear-gradient(to bottom, transparent 350px, var(--hako-bg) 400px);"
  ></div>

  <div class="relative z-10 max-w-375 mx-auto px-4 sm:px-6 lg:px-8">
    <div class="h-50 md:h-75"></div>

    <div class="relative pb-8">
      <div
        class="flex flex-col md:flex-row items-end md:items-center space-y-4 md:space-y-0 md:space-x-6"
      >
        <div class="relative group">
          <img
            src={HakoImage.get(profileData?.avatar_url)}
            alt="Avatar"
            class="w-32 h-32 md:w-40 md:h-40 rounded-xl border-4 border-[#0b1622] shadow-2xl object-cover bg-[#151f2e]"
          />
          {#if roleConfig}
            <div
              class="absolute -bottom-2 -right-2 text-(--hako-fg) text-[10px] font-bold px-2 py-1 rounded shadow-lg uppercase tracking-tighter {roleConfig.color}"
            >
              {roleConfig.label}
            </div>
          {/if}
        </div>
        <div class="flex-1 text-center md:text-left h-20">
          <h1 class="text-3xl md:text-4xl font-bold text-(--hako-fg) mb-1">
            {profileData?.display_name || profileData?.username || ""}
          </h1>
          <p class="text-slate-400 text-sm max-w-xl">
            {profileData?.quote || ""}
          </p>
        </div>
      </div>
    </div>

    <div class="relative" id="tabs-wrapper">
      <div
        class="profile-tabs flex space-x-8 border-b border-(--surface-elevated) mb-8 overflow-x-auto whitespace-nowrap scrollbar-hide focus:ring-0"
      >
        {#each tabs as tab}
          <button
            onclick={() => switchTab(tab.id, tab.path)}
            class="tab-btn pb-4 font-semibold focus:outline-none {currentActiveTab ===
            tab.id
              ? 'tab-active text-(--hako-fg)'
              : 'text-(--c8)'}"
          >
            {tab.label}
          </button>
        {/each}
      </div>
    </div>

    <!-- Content Container -->
    <div class="py-8 min-h-screen">
      <div class:hidden={currentActiveTab !== "overview"}>
        {#if profileData}
          <Overview {profileData} metadata={flatMetadata} {isMetadataLoading} />
        {/if}
      </div>

      <div
        class:hidden={!["anime", "manga", "lightnovel"].includes(
          currentActiveTab,
        )}
      >
        <MediaList
          type={listType}
          profileId={profileData?.id || ""}
          initialListData={profileData?.mediaLists?.[listType] || []}
          initialMetadata={metadataCache[listType] || {}}
        />
      </div>

      <div class:hidden={currentActiveTab !== "favorites"}>
        {#if profileData?.id}
          <FavoritesFullGrid profileId={profileData.id} />
        {/if}
      </div>

      <div class:hidden={currentActiveTab !== "stats"}>
        {#if profileData}
          <Stats
            {profileData}
            metadata={flatMetadata}
            mediaLists={profileData.mediaLists || {}}
            {isMetadataLoading}
          />
        {/if}
      </div>
    </div>
  </div>
</div>
