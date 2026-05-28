<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { AuthService } from "../core/auth";
  import { HakoImage } from "../shared/utils/images";
  import { openModal } from "../core/ui.svelte";
  import Dropdown from "../shared/components/Dropdown.svelte";
  import SearchInput from "../shared/components/SearchInput.svelte";
  import { MediaService } from "../features/media/services/mediaService";
  import type { Media } from "../shared/types/index";

  let { user = null, profile = null } = $props();

  let username = $derived(profile?.username || "user");
  let searchInputRef = $state<HTMLInputElement | null>(null);
  let containerRef = $state<HTMLElement | null>(null);
  let searchQuery = $state("");
  let searchResults = $state<Media[]>([]);
  let isSearching = $state(false);

  function handleClickOutside(event: MouseEvent) {
    if (containerRef && !containerRef.contains(event.target as Node)) {
      searchResults = [];
    }
  }

  onMount(() => {
    window.addEventListener("click", handleClickOutside);
  });

  onDestroy(() => {
    window.removeEventListener("click", handleClickOutside);
  });

  let searchTimeout: ReturnType<typeof setTimeout>;

  $effect(() => {
    clearTimeout(searchTimeout);
    if (searchQuery.length < 2) {
      searchResults = [];
      return;
    }
    searchTimeout = setTimeout(async () => {
      isSearching = true;
      const result = await MediaService.searchMedia(searchQuery);
      if (result.success) {
        searchResults = result.data;
      }
      isSearching = false;
    }, 300);
  });

  function handleKeydown(e: KeyboardEvent) {
    if (
      e.key === "/" &&
      document.activeElement?.tagName !== "INPUT" &&
      document.activeElement?.tagName !== "TEXTAREA"
    ) {
      e.preventDefault();
      searchInputRef?.focus();
    }
  }

  function handleResultClick(mediaId: number, mediaType: string) {
    searchQuery = "";
    searchResults = [];
    navigate(`/${mediaType}/${mediaId}`);
  }

  let dropdownItems = $derived([
    {
      label: "Profile",
      action: () => navigate(`/user/${username}`, true),
      icon: "fa-user",
    },
    {
      label: "Theme",
      action: () => openModal("theme"),
      icon: "fa-palette",
    },
    {
      label: "Settings",
      action: () => openModal("settings", { profile }),
      icon: "fa-cog",
    },
    {
      label: "Logout",
      action: handleLogout,
      icon: "fa-right-from-bracket",
    },
  ]);

  let listDropdownItems = $derived([
    {
      label: "Anime List",
      action: () => navigate(`/user/${username}/anime`, true),
      icon: "fa-tv",
    },
    {
      label: "Manga List",
      action: () => navigate(`/user/${username}/manga`, true),
      icon: "fa-book fa-flip-horizontal",
    },
    {
      label: "Light Novel List",
      action: () => navigate(`/user/${username}/lightnovel`, true),
      icon: "fa-book-open",
    },
  ]);

  let browseDropdownItems = $derived([
    {
      label: "Anime",
      action: () => navigate("/browse/anime", true),
      icon: "fa-tv",
    },
    {
      label: "Manga",
      action: () => navigate("/browse/manga", true),
      icon: "fa-book",
    },
    {
      label: "Light Novels",
      action: () => navigate("/browse/lightnovel", true),
      icon: "fa-book-open",
    },
  ]);

  async function handleLogout() {
    await AuthService.logout();
  }

  function navigate(path: string, shouldSnap = false) {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));

    if (shouldSnap) {
      requestAnimationFrame(() => {
        const tabsWrapper = document.getElementById("tabs-wrapper");
        if (tabsWrapper) {
          const navbarHeight = 60;
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
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<nav class="navbar bg-nav text-white px-4 py-3 sticky top-0 z-50 shadow-lg">
  <div class="max-w-375 mx-auto lg:px-8 flex items-center justify-between">
    <div class="flex items-center space-x-8">
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        id="nav-branding"
        class="text-2xl font-bold tracking-tighter flex items-center cursor-pointer select-none group"
        onclick={() => navigate(user ? "/feed" : "/")}
      >
        <span
          class="font-['Zen_Antique_Soft'] font-bold text-accent mr-2 text-[2rem] leading-8"
          >箱</span
        >Hako
      </div>
      <div class="hidden md:flex space-x-6 text-sm font-medium">
        {#if user}
          <a
            href="/feed"
            class="nav-link ring-0 outline-none"
            onclick={(e) => {
              e.preventDefault();
              navigate("/feed");
            }}>Feed</a
          >
          <a
            href="/user/{username}"
            class="nav-link ring-0 outline-none"
            onclick={(e) => {
              e.preventDefault();
              navigate(`/user/${username}`, true);
            }}>Profile</a
          >
          <Dropdown items={listDropdownItems}>
            <span class="nav-link cursor-pointer">Lists</span>
          </Dropdown>
          <Dropdown items={browseDropdownItems}>
            <span class="nav-link cursor-pointer">Browse</span>
          </Dropdown>
        {:else}
          <button
            id="nav-login"
            class="nav-link ring-0 outline-none"
            onclick={() => window.dispatchEvent(new CustomEvent("show-login"))}
            >Login</button
          >
          <button
            id="nav-signup"
            class="nav-link ring-0 outline-none"
            onclick={() => window.dispatchEvent(new CustomEvent("show-signup"))}
            >Sign Up</button
          >
        {/if}
      </div>
    </div>
    <div class="flex items-center space-x-4">
      <div bind:this={containerRef} class="relative hidden sm:block w-64">
        <SearchInput
          placeholder="Search media..."
          bind:inputRef={searchInputRef}
          bind:value={searchQuery}
        />

        {#if searchResults.length > 0}
          <div
            class="absolute z-10 w-full mt-2 py-2 p-2 bg-(--surface) border border-(--c8) rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-100"
          >
            {#each searchResults as media}
              <button
                type="button"
                onclick={() => {
                  const fmt = media.format?.toLowerCase();
                  const type =
                    fmt === "manga" || fmt === "one_shot"
                      ? "manga"
                      : fmt === "novel"
                        ? "lightnovel"
                        : "anime";
                  handleResultClick(media.media_id, type);
                }}
                class="w-full text-left px-4 py-2.5 rounded-xl text-sm text-(--hako-fg) hover:bg-(--surface-elevated) transition-colors flex items-center gap-3"
              >
                <img
                  src={HakoImage.getCover(media.media_id, "small")}
                  alt={media.title.romaji}
                  class="w-6 h-9 object-cover rounded shadow-sm"
                />
                <span class="truncate">{media.title.romaji}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
      <div class="flex items-center space-x-3">
        <i class="fa-solid fa-bell cursor-pointer hover:text-accent"></i>
        {#if user}
          <Dropdown items={dropdownItems}>
            {#if profile?.avatar_url}
              <img
                src={HakoImage.get(profile.avatar_url, {
                  w: 32,
                  h: 32,
                  f: "webp",
                })}
                class="w-8 h-8 rounded-full object-cover border border-slate-700 cursor-pointer"
                alt="{username}'s avatar"
              />
            {:else}
              <div
                class="w-8 h-8 rounded-full bg-accent flex items-center justify-center font-bold text-xs cursor-pointer"
              >
                {username.charAt(0).toUpperCase()}
              </div>
            {/if}
          </Dropdown>
        {:else}
          <div
            class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center"
          >
            <i class="fa-solid fa-user text-slate-400"></i>
          </div>
        {/if}
      </div>
    </div>
  </div>
</nav>

<style>
  .nav-link:hover {
    color: #edf1f5;
  }
</style>
