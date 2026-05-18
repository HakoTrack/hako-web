<script>
  import { onMount } from "svelte";
  import { ProfileService } from "../services/profileService.js";
  import { HakoImage } from "../utils/images.js";
  import MediaList from "../components/profile/MediaList.svelte";
  import Stats from "../components/profile/Stats.svelte";
  import Overview from "../components/profile/Overview.svelte";

  let { currentPath, activeTab = "overview", mediaType = "anime" } = $props();

  let username = $derived(
    currentPath.split("/").filter((p) => p && p !== "user")[0],
  );
  let profileData = $state(null);
  // this works, putting this here to shut up IDE
  // svelte-ignore state_referenced_locally
  let currentActiveTab = $state(activeTab);

  // Sync internal state directly with props
  $effect(() => {
    currentActiveTab = activeTab;
  });

  const ROLES = {
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
    profileData?.role ? ROLES[profileData.role.toLowerCase()] : null,
  );

  onMount(async () => {
    try {
      profileData = await ProfileService.getProfileByUsername(username);
    } catch (e) {
      console.error("DEBUG: Profile fetch error:", e);
    }
  });
</script>

<div id="profile-container" class={!profileData ? "invisible" : ""}>
  <!-- Parallax Banner Container -->
  <div
    class="fixed top-0 left-0 mt-15 w-full h-75 md:h-100 -z-10 overflow-hidden"
  >
    <img
      src={profileData
        ? HakoImage.get(
            profileData.banner_url || `/profile/${username}/banner.jpg`,
            { w: 1200, f: "webp", q: 80 },
          )
        : ""}
      alt="Banner"
      class="object-top w-full h-full object-cover bg-[#151f2e]"
    />
    <div
      class="absolute bottom-0 left-0 w-full h-60 bg-linear-to-t from-[#0b1622] via-[#0b1622]/50 to-transparent"
    ></div>
  </div>

  <div
    class="relative z-10 bg-transparent max-w-375 mx-auto px-4 sm:px-6 lg:px-8"
  >
    <!-- Spacer to reveal the fixed banner initially -->
    <div class="h-50 md:h-75"></div>

    <div class="relative pb-8">
      <div
        class="flex flex-col md:flex-row items-end md:items-center space-y-4 md:space-y-0 md:space-x-6"
      >
        <div class="relative group">
          <img
            src={profileData
              ? HakoImage.get(
                  profileData.avatar_url || `/profile/${username}/avatar.jpg`,
                  { w: 200, f: "webp" },
                )
              : ""}
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

    <div
      class="profile-tabs flex space-x-8 border-b border-slate-800 mb-8 overflow-x-auto whitespace-nowrap scrollbar-hide"
    >
      <button
        onclick={() => {
          currentActiveTab = "overview";
          window.history.pushState({}, "", `/user/${username}`);
        }}
        class="tab-btn pb-4 font-semibold {currentActiveTab === 'overview'
          ? 'tab-active text-white'
          : 'text-slate-400'}">Overview</button
      >
      <button
        onclick={() => {
          currentActiveTab = "anime";
          window.history.pushState({}, "", `/user/${username}/anime`);
        }}
        class="tab-btn pb-4 font-semibold {currentActiveTab === 'anime'
          ? 'tab-active text-white'
          : 'text-slate-400'}">Anime</button
      >
      <button
        onclick={() => {
          currentActiveTab = "manga";
          window.history.pushState({}, "", `/user/${username}/manga`);
        }}
        class="tab-btn pb-4 font-semibold {currentActiveTab === 'manga'
          ? 'tab-active text-white'
          : 'text-slate-400'}">Manga</button
      >
      <button
        onclick={() => {
          currentActiveTab = "light-novels";
          window.history.pushState({}, "", `/user/${username}/light_novels`);
        }}
        class="tab-btn pb-4 font-semibold {currentActiveTab === 'light-novels'
          ? 'tab-active text-white'
          : 'text-slate-400'}">Light Novels</button
      >
      <button
        onclick={() => {
          currentActiveTab = "stats";
          window.history.pushState({}, "", `/user/${username}/stats`);
        }}
        class="tab-btn pb-4 font-semibold {currentActiveTab === 'stats'
          ? 'tab-active text-white'
          : 'text-slate-400'}">Stats</button
      >
    </div>

    <div class="py-8 min-h-100">
      {#if profileData}
        <div class:hidden={currentActiveTab !== "overview"}>
          <Overview {profileData} />
        </div>
        <div class:hidden={currentActiveTab !== "anime"}>
          <MediaList type="anime" profileId={profileData.id} />
        </div>
        <div class:hidden={currentActiveTab !== "manga"}>
          <MediaList type="manga" profileId={profileData.id} />
        </div>
        <div class:hidden={currentActiveTab !== "light-novels"}>
          <MediaList type="light_novels" profileId={profileData.id} />
        </div>
        <div class:hidden={currentActiveTab !== "stats"}>
          <Stats {profileData} />
        </div>
      {/if}
    </div>
  </div>
</div>
