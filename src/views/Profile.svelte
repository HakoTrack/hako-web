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
  let profileData = $derived(propProfileData);
  let metadata: Record<string, any> = $state({});
  let currentActiveTab = $derived(activeTab);

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

  $effect(() => {
    if (username && username !== "user") {
      loadProfileData(username);
    }
  });

  // Reactively fetch metadata when media lists are populated in the background
  $effect(() => {
    if (profileData?.mediaLists) {
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

  async function loadProfileData(uname: string) {
    try {
      const result = await ProfileService.getProfileByUsername(uname);
      if (result.success) {
        profileData = result.data;

        // Fetch full media lists in background and update reactively
        ProfileService.getMediaLists(profileData.id).then((lists) => {
          if (profileData) {
            profileData = { ...profileData, mediaLists: lists };
          }
        });
      } else {
        console.error("DEBUG: Profile fetch error:", result.error);
      }
    } catch (e) {
      console.error("DEBUG: Profile fetch exception:", e);
    }
  }
</script>

<div id="profile-container">
  <!-- Banner -->
  <div
    class="fixed top-0 left-0 mt-15 w-full h-75 md:h-100 -z-10 overflow-hidden"
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
    <div
      class="absolute bottom-0 left-0 w-full h-60 bg-linear-to-t from-(--hako-bg) via(--hako-bg)/50 to-transparent"
    ></div>
  </div>

  <div
    class="relative z-10 bg-transparent max-w-375 mx-auto px-4 sm:px-6 lg:px-8"
  >
    <div class="h-50 md:h-75"></div>

    <div class="relative pb-8">
      <div
        class="flex flex-col md:flex-row items-end md:items-center space-y-4 md:space-y-0 md:space-x-6"
      >
        <div class="relative group">
          <img
            src={HakoImage.get(
              profileData?.avatar_url || `covers/${username}.jpg`,
              { w: 200, f: "webp" },
            )}
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

    <!-- Tabs -->
    <div
      class="profile-tabs flex space-x-8 border-b border-(--surface-elevated) mb-8 overflow-x-auto whitespace-nowrap scrollbar-hide"
    >
      {#each tabs as tab}
        <button
          onclick={() => switchTab(tab.id, tab.path)}
          class="tab-btn pb-4 font-semibold {currentActiveTab === tab.id
            ? 'tab-active text-white'
            : 'text-slate-400'}"
        >
          {tab.label}
        </button>
      {/each}
    </div>

    <!-- Content -->
    <div class="py-8 min-h-100">
      <div class:hidden={currentActiveTab !== "overview"}>
        <Overview {profileData} {metadata} />
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
