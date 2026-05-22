<script lang="ts">
  import { ProfileService, type Profile } from "../services/profileService";
  import type { ListEntry } from "../types";
  import { HakoImage } from "../utils/images";
  import MediaList from "../components/profile/MediaList.svelte";
  import Stats from "../components/profile/Stats.svelte";
  import Overview from "../components/profile/Overview.svelte";
  import { fetchMediaByIds } from "../utils/mediaData";

  let {
    currentPath,
    activeTab = "overview",
    profileData: propProfileData,
  } = $props();

  let username = $derived(currentPath.split("/")[2]);
  let profileData: Profile | null = $state(propProfileData);
  let metadata: Record<string, any> = $state({});
  let currentActiveTab = $derived(activeTab);
  let isFetchingLists = $state(false);

  // Sync state if propProfileData changes, but ignore nulls if we already have data
  $effect(() => {
    if (propProfileData) {
      profileData = propProfileData;
    }
  });

  // Fetch full media lists in background when profile changes
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
          }
          isFetchingLists = false;
        });
      }
    }
  });

  function switchTab(tab: string, path: string) {
    currentActiveTab = tab;
    window.history.pushState({}, "", path);

    // Defer scroll to ensure layout has settled
    requestAnimationFrame(() => {
      const tabsWrapper = document.getElementById("tabs-wrapper");
      if (tabsWrapper) {
        const navbarHeight = 60; // Adjust as needed
        const elementPosition = tabsWrapper.getBoundingClientRect().top;
        const offsetPosition =
          elementPosition + window.scrollY - navbarHeight - 20;

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        });
      }
    });
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
    { id: "stats", label: "Stats", path: `/user/${username}/stats` },
  ]);

  const ROLES: Record<
    string,
    { label: string; romaji: string; color: string; title: string }
  > = {
    owner: {
      label: "総帥",
      romaji: "Sousui",
      color: "bg-red-500",
      title: "Owner",
    },
    admin: {
      label: "師匠",
      romaji: "Shishou",
      color: "bg-indigo-500",
      title: "Admin",
    },
    moderator: {
      label: "先生",
      romaji: "Sensei",
      color: "bg-emerald-500",
      title: "Moderator",
    },
    contributor: {
      label: "先輩",
      romaji: "Senpai",
      color: "bg-blue-500",
      title: "Contributor",
    },
  };

  let roleConfig = $derived(
    (profileData as any)?.role
      ? ROLES[(profileData as any).role.toLowerCase()]
      : null,
  );

  // Reactively fetch metadata when media lists are populated in the background
  $effect(() => {
    if (profileData?.mediaLists && Object.keys(metadata).length === 0) {
      const allLists = Object.values(
        profileData.mediaLists,
      ).flat() as ListEntry[];
      if (allLists.length > 0) {
        const ids = [...new Set(allLists.map((a) => a.media_id))];
        fetchMediaByIds(ids).then((data) => {
          metadata = data;
        });
      }
    }
  });
</script>

<div id="profile-container" class="relative">
  <!-- Layer 1: Fixed Banner -->
  <div
    class="fixed top-0 left-0 w-full h-100 md:h-100 -z-20 mt-15 overflow-hidden"
  >
    <img
      src={HakoImage.get(profileData?.banner_url || `banners/${username}.jpg`, {
        w: 1200,
        f: "webp",
        q: 80,
      })}
      alt="Banner"
      class="object-top w-full h-full object-cover bg-[#151f2e]"
    />
  </div>

  <!-- Layer 2: Scrolling Gradient Background -->
  <div
    class="absolute top-0 -z-10 w-screen left-[50%] -translate-x-[50%] h-full"
    style="background: linear-gradient(to bottom, transparent 350px, var(--hako-bg) 400px);"
  ></div>

  <!-- Layer 3: Content Container -->
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
              class="absolute -bottom-2 -right-2 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg uppercase tracking-tighter {roleConfig.color}"
              title="{roleConfig.romaji} ({roleConfig.title})"
            >
              {roleConfig.label}
            </div>
          {/if}
        </div>
        <div class="flex-1 text-center md:text-left">
          <h1 class="text-3xl md:text-4xl font-bold text-white mb-1">
            {profileData?.display_name || profileData?.username || ""}
          </h1>
          <p class="text-slate-400 text-sm max-w-xl">
            {profileData?.bio || ""}
          </p>
        </div>
        <div class="flex space-x-3">
          <button
            class="bg-accent hover:bg-opacity-90 text-white px-6 py-2 rounded-lg font-bold text-sm transition-all shadow-lg shadow-blue-500/10"
            >Follow</button
          >
          <!-- svelte-ignore a11y_consider_explicit_label -->
          <button
            class="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-lg transition-all"
            ><i class="fa-solid fa-ellipsis"></i></button
          >
        </div>
      </div>
    </div>

    <!-- Tabs Wrapper -->
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

    <!-- Content -->
    <div class="py-8 min-h-screen">
      <div class:hidden={currentActiveTab !== "overview"}>
        {#if profileData}
          <Overview {profileData} {metadata} />
        {/if}
      </div>

      <div
        class:hidden={!["anime", "manga", "lightnovel"].includes(
          currentActiveTab,
        )}
      >
        <MediaList
          type={currentActiveTab === "lightnovel"
            ? "light_novel"
            : currentActiveTab}
          profileId={profileData?.id || ""}
        />
      </div>

      <div class:hidden={currentActiveTab !== "stats"}>
        <Stats {profileData} />
      </div>
    </div>
  </div>
</div>
