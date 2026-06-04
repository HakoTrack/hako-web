<script lang="ts">
  import { ProfileService } from "./services/profileService";
  import { MetadataService } from "../media/services/metadataService";
  import type { Profile } from "../../shared/types";
  import { HakoImage } from "../../shared/utils/images";
  import MediaList from "./components/MediaList.svelte";
  import FavoritesFullGrid from "./components/FavoritesFullGrid.svelte";
  import Stats from "./components/Stats.svelte";
  import Overview from "./components/Overview.svelte";
  import { ROLES } from "../../shared/utils/constants";

  let {
    currentPath,
    activeTab = "overview",
    profileData: propProfileData,
  } = $props();

  let username = $derived(currentPath.split("/")[2]);
  let profileData: Profile | null = $state(propProfileData);
  let metadataCache: Record<string, Record<string, any>> = $state({});
  let currentActiveTab = $state(activeTab);
  let isFetchingLists = $state(false);

  $effect(() => {
    currentActiveTab = activeTab;
  });

  let listType = $derived(
    currentActiveTab === "lightnovel" ? "light_novel" : currentActiveTab,
  );

  $effect(() => {
    if (propProfileData) {
      profileData = propProfileData;
    }
  });

  $effect(() => {
    if (profileData?.id && !isFetchingLists) {
      const hasLists =
        profileData.mediaLists &&
        Object.keys(profileData.mediaLists).length > 0;
      if (!hasLists) {
        isFetchingLists = true;
        ProfileService.getMediaLists(profileData.id).then((lists) => {
          if (profileData) {
            profileData = { ...profileData, mediaLists: lists };

            Object.entries(lists).forEach(([type, items]) => {
              const ids = items.map((i: any) => i.media_id);
              if (ids.length > 0) {
                MetadataService.getMetadata(ids, type).then((m) => {
                  metadataCache[type] = m;
                });
              }
            });
          }
          isFetchingLists = false;
        });
      }
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
</script>

<div id="profile-container" class="relative">
  <div class="fixed top-0 left-0 w-full h-100 -z-20 mt-15 overflow-hidden">
    <img
      src={HakoImage.get(profileData?.banner_url, {
        w: 1200,
        f: "webp",
        q: 80,
      })}
      alt="Banner"
      class="object-top w-full h-full object-cover bg-[#151f2e]"
    />
  </div>

  <div
    class="absolute top-0 -z-10 w-screen left-[50%] translate-x-[-50%] h-full"
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
            src={HakoImage.get(profileData?.avatar_url, { w: 200, f: "webp" })}
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
          <Overview {profileData} />
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
          isActive={["anime", "manga", "lightnovel"].includes(currentActiveTab)}
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
          <Stats {profileData} />
        {/if}
      </div>
    </div>
  </div>
</div>
