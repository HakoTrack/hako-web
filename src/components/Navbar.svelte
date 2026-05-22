<script lang="ts">
  import { AuthService } from "../core/auth";
  import { HakoImage } from "../utils/images";
  import { ui } from "../core/ui.svelte";
  import Dropdown from "./common/Dropdown.svelte";

  let { user = null, profile = null } = $props();

  let username = $derived(profile?.username || "user");

  let dropdownItems = $derived([
    {
      label: "Profile",
      action: () => navigate(`/user/${username}`, true),
      icon: "fa-user",
    },
    {
      label: "Theme",
      action: () => ui.openModal("theme"),
      icon: "fa-palette",
    },
    {
      label: "Settings",
      action: () => ui.openModal("settings"),
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
          <a
            href="/browse"
            class="nav-link ring-0 outline-none"
            onclick={(e) => {
              e.preventDefault();
              navigate(`/browse`);
            }}>Browse</a
          >
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
      <div class="relative hidden sm:block">
        <input
          type="text"
          placeholder="Search..."
          class="bg-card text-sm rounded-full py-2 px-4 w-64 focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <i class="fa-solid fa-search absolute right-4 top-2.5 text-slate-500"
        ></i>
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
