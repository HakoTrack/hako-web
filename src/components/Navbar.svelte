<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { AuthService } from "../core/auth";
  import { HakoImage } from "../shared/utils/images";
  import { openModal } from "../core/ui.svelte";
  import Dropdown from "../shared/components/Dropdown.svelte";
  import SearchInput from "../shared/components/SearchInput.svelte";
  import { MediaService } from "../features/media/services/mediaService";
  import type { Media } from "../shared/types/index";
  import { ui } from "../core/ui.svelte";

  let { user = null, profile = null } = $props();

  let username = $derived(profile?.username ?? null);
  let searchInputRef = $state<HTMLInputElement | null>(null);

  let searchTimeout: ReturnType<typeof setTimeout>;

  $effect(() => {
    clearTimeout(searchTimeout);
    if (ui.searchQuery.length < 2) {
      ui.searchResults = [];
      ui.isSearching = false;
      return;
    }
    ui.isSearching = true;
    searchTimeout = setTimeout(async () => {
      const result = await MediaService.searchMedia(ui.searchQuery);
      if (result.success) {
        ui.searchResults = result.data;
      }
      ui.isSearching = false;
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
      ui.isSearchOpen = true;
    }
    if (e.key === "Escape") {
      if (ui.activeModal) return;
      ui.isSearchOpen = false;
      ui.isQuickUpdateOpen = false;
      searchInputRef?.blur();
    }
  }

  function handleResultClick(mediaId: number, mediaType: string) {
    ui.searchQuery = "";
    ui.searchResults = [];
    ui.isSearchOpen = false;
    navigate(`/${mediaType}/${mediaId}`);
  }

  let dropdownItems = $derived.by(() => {
    const items = [];
    if (username) {
      items.push({
        label: "Profile",
        action: () => navigate(`/user/${username}`, true),
        icon: "fa-user",
      });
    }
    items.push(
      { label: "Theme", action: () => openModal("theme"), icon: "fa-palette" },
      { label: "Settings", action: () => openModal("settings", { profile }), icon: "fa-cog" },
      { label: "Logout", action: handleLogout, icon: "fa-right-from-bracket" },
    );
    return items;
  });

  let listDropdownItems = $derived.by(() => {
    if (!username) return [];
    return [
      { label: "Anime List", action: () => navigate(`/user/${username}/anime`, true), icon: "fa-tv" },
      { label: "Manga List", action: () => navigate(`/user/${username}/manga`, true), icon: "fa-book fa-flip-horizontal" },
      { label: "Light Novel List", action: () => navigate(`/user/${username}/lightnovel`, true), icon: "fa-book-open" },
    ];
  });

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
            behavior: "instant",
          });
        }
      });
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<nav class="navbar bg-nav text-(--hako-fg) px-4 py-3 shadow-lg">
  <div class="max-w-375 mx-auto lg:px-8 flex items-center justify-between">
    <div class="flex items-center space-x-8">
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        id="nav-branding"
        class="text-2xl font-bold tracking-tighter flex items-center cursor-pointer select-none group"
        onclick={() => navigate(user ? "/feed" : "/")}
      >
        <span class="font-bold text-accent mr-2 text-[2rem] leading-8">箱</span
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
          {#if username}
            <a
              href="/user/{username}"
              class="nav-link ring-0 outline-none"
              onclick={(e) => {
                e.preventDefault();
                navigate(`/user/${username}`, true);
              }}>Profile</a
            >
          {/if}
          <Dropdown items={listDropdownItems}>
            <span class="nav-link cursor-pointer">Lists</span>
          </Dropdown>
          <Dropdown items={browseDropdownItems}>
            <span class="nav-link cursor-pointer">Browse</span>
          </Dropdown>
          <a
            href="/forum"
            class="nav-link ring-0 outline-none"
            onclick={(e) => {
              e.preventDefault();
              navigate("/forum");
            }}>Forum</a
          >
        {:else}
          <button
            id="nav-login"
            class="nav-link ring-0 outline-none"
            onclick={() => window.dispatchEvent(new CustomEvent("show-login"))}
            >Login</button
          >
        {/if}
      </div>
    </div>
    <div class="flex items-center space-x-4">
      <div class="relative hidden sm:block w-64">
        <SearchInput
          placeholder="Search media..."
          bind:inputRef={searchInputRef}
          bind:value={ui.searchQuery}
          onfocus={() => {
            ui.isSearchOpen = true;
            ui.isQuickUpdateOpen = false;
          }}
          oninput={() => {
            ui.isSearchOpen = true;
            ui.isQuickUpdateOpen = false;
          }}
        />
      </div>
      <div class="flex items-center space-x-3">
        {#if user}
          <button
            class="w-8 h-8 flex items-center justify-center text-(--hako-fg) hover:text-white transition-colors cursor-pointer {ui.isQuickUpdateOpen
              ? 'text-accent'
              : 'text-slate-400'}"
            onclick={() => {
              ui.isQuickUpdateOpen = !ui.isQuickUpdateOpen;
              if (ui.isQuickUpdateOpen) {
                ui.isSearchOpen = false;
                ui.loadQuickUpdateItems();
              }
            }}
            title="Quick Update"
          >
            <i class="fa-solid fa-list text-lg"></i>
          </button>
        {/if}
        <i class="fa-solid fa-bell cursor-pointer hover:text-accent"></i>
        {#if user}
          <Dropdown items={dropdownItems}>
            {#if profile?.avatar_url}
              <img
                src={HakoImage.get(profile.avatar_url)}
                class="w-8 h-8 rounded-full object-cover border border-slate-700 cursor-pointer"
                alt={username ? `${username}'s avatar` : "Avatar"}
              />
            {:else}
              <div
                class="w-8 h-8 rounded-full bg-accent flex items-center justify-center font-bold text-xs cursor-pointer"
              >
                {username ? username.charAt(0).toUpperCase() : "?"}
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
