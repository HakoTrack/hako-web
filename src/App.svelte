<script>
  import { onMount, onDestroy, untrack } from "svelte";
  import Navbar from "./components/Navbar.svelte";
  import Footer from "./components/Footer.svelte";
  import Landing from "./features/landing/Landing.svelte";
  import Forum from "./features/forum/Forum.svelte";
  import ModalWrapper from "./components/modals/ModalWrapper.svelte";
  import { AuthService } from "./core/auth";
  import { ProfileService } from "./features/profile/services/profileService";
  import { supabase } from "./core/supabase.js";
  import { openModal } from "./core/ui.svelte.ts";
  import { routes } from "./routes";
  import { Toasts } from "./shared/components";
  import SearchOverlay from "./components/SearchOverlay.svelte";
  import QuickUpdateOverlay from "./components/QuickUpdateOverlay.svelte";
  import init from "$wasm/hako_wasm";
  import { wasmInitialized } from "./core/wasm-init";
  import { ui } from "./core/ui.svelte";
  import { initShortcuts, registerShortcut } from "./core/keys.svelte";

  initShortcuts();

  // Register default shortcuts
  registerShortcut("/", (e) => {
    e.preventDefault();
    ui.isSearchOpen = true;
  });

  registerShortcut("Escape", () => {
    if (ui.activeModal) return;
    ui.isSearchOpen = false;
    ui.isQuickUpdateOpen = false;
  });

  let user = $state(null);
  let profile = $state(null);
  let targetProfileData = $state(null);
  let currentPath = $state(window.location.pathname);
  let activeTab = $state("overview");
  let mediaType = $state("anime");
  let authInitialized = $state(false);
  let authSubscription = null;

  let isLanding = $derived(authInitialized && currentPath === "/" && !user);
  let isSignup = $derived(currentPath === "/signup");

  $effect(() => {
    // Auth Guard: Redirect to landing if not logged in and not already on landing
    if (
      authInitialized &&
      user === null &&
      currentPath !== "/" &&
      currentPath !== "/signup"
    ) {
      window.history.pushState({}, "", "/");
      handleRouting();
    }
  });

  $effect(() => {
    const currentUser = user;
    if (currentUser) {
      ProfileService.getProfileById(currentUser.id).then((result) => {
        if (result.success && result.data) {
          untrack(() => {
            // Preserve mediaLists if we already have them for this user
            const updatedProfile = {
              ...result.data,
              mediaLists:
                profile?.id === result.data.id ? profile.mediaLists || {} : {},
            };
            profile = updatedProfile;

            // Eagerly set targetProfileData if on own profile
            const pathParts = currentPath.split("/").filter((p) => p);
            if (
              pathParts[0] === "user" &&
              pathParts[1] === result.data.username
            ) {
              targetProfileData = {
                ...result.data,
                mediaLists:
                  targetProfileData?.id === result.data.id
                    ? targetProfileData.mediaLists || {}
                    : {},
              };
            }
          });
        } else {
          console.error(
            "DEBUG: Failed to load profile for navbar:",
            result.error,
          );
        }
      });
    } else {
      untrack(() => {
        profile = null;
      });
    }
  });

  // Updated routing logic to handle /user/ paths
  function handleRouting() {
    ui.isSearchOpen = false;
    ui.isQuickUpdateOpen = false;
    const lastPath = currentPath;
    currentPath = window.location.pathname;
    const pathParts = currentPath.split("/").filter((p) => p);
    const lastPathParts = lastPath.split("/").filter((p) => p);

    if (pathParts[0] === "user") {
      const targetUsername = pathParts[1];
      const lastUsername =
        lastPathParts[0] === "user" ? lastPathParts[1] : null;

      // Re-fetch if switched users or if we don't have data yet (e.g. initial load)
      if (targetUsername !== lastUsername || !targetProfileData) {
        if (profile && profile.username === targetUsername) {
          targetProfileData = profile;
        } else {
          // ONLY clear if it's a DIFFERENT user to avoid unmounting components during refresh
          if (targetProfileData?.username !== targetUsername) {
            targetProfileData = null;
          } else {
          }

          ProfileService.getProfileByUsername(targetUsername).then((res) => {
            if (res.success) {
              // Merge to avoid losing mediaLists if we already have them
              targetProfileData = {
                ...res.data,
                mediaLists:
                  targetProfileData?.id === res.data.id
                    ? targetProfileData.mediaLists || {}
                    : {},
              };
            } else {
              console.error("Failed to fetch target profile:", res.error);
            }
          });
        }
      }

      activeTab = pathParts[2] || "overview";
      mediaType = pathParts[2] || "anime";
    }
  }

  onMount(async () => {
    try {
      await init();
      wasmInitialized.set(true);
    } catch (e) {
      console.error("Failed to init WASM:", e);
    }
    user = await AuthService.getCurrentUser();
    authInitialized = true;

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      user = session?.user ?? null;
      if (window.location.pathname !== currentPath) {
        handleRouting();
      }
    });
    authSubscription = data.subscription;

    window.addEventListener("popstate", () => {
      handleRouting();
    });
    handleRouting();
  });

  onDestroy(() => {
    window.removeEventListener("popstate", handleRouting);
    authSubscription?.unsubscribe();
  });

  let activeRoute = $derived(
    routes.find((r) => currentPath.startsWith(r.path)),
  );
  let RouteComponent = $derived(activeRoute?.component);

  function handleSearchSelect(media) {
    const fmt = media.format?.toLowerCase();
    const type =
      fmt === "manga" || fmt === "one_shot"
        ? "manga"
        : fmt === "novel"
          ? "lightnovel"
          : "anime";
    ui.searchQuery = "";
    ui.searchResults = [];
    ui.isSearchOpen = false;
    window.history.pushState({}, "", `/${type}/${media.media_id}`);
    handleRouting();
  }
</script>

<svelte:window on:show-login={() => openModal("login")} />

<div class="min-h-screen flex flex-col">
  <SearchOverlay
    isOpen={ui.isSearchOpen}
    isSearching={ui.isSearching}
    query={ui.searchQuery}
    results={ui.searchResults}
    onClose={() => (ui.isSearchOpen = false)}
    onSelect={handleSearchSelect}
  />
  <QuickUpdateOverlay
    isOpen={ui.isQuickUpdateOpen}
    isLoading={ui.isQuickUpdateLoading}
    items={ui.quickUpdateItems}
    onClose={() => (ui.isQuickUpdateOpen = false)}
  />
  <Toasts />
  <ModalWrapper />
  {#if !isSignup}
    <div class="h-15 w-full sticky top-0 z-50">
      <!-- Reserved space and sticky -->
      {#if user}
        <Navbar {user} {profile} />
      {/if}
    </div>
  {/if}

  <main
    id="app-view"
    class="grow flex flex-col relative z-10 bg-(--hako-bg) {!isLanding && !isSignup ? 'pb-40' : ''}"
  >
    <div class="grow">
      {#if currentPath === "/"}
        <Landing />
      {:else if currentPath === "/forum"}
        <Forum />
      {:else if activeRoute}
        <RouteComponent
          {...activeRoute.props(
            currentPath,
            user,
            targetProfileData,
            activeTab,
            mediaType,
          )}
        />
      {:else}
        <div class="text-(--hako-fg) p-10">404 - Not Found</div>
      {/if}
    </div>
  </main>

  {#if !isLanding && !isSignup}
    <div class="fixed bottom-0 left-0 w-full z-0">
      <Footer />
    </div>
  {/if}
</div>
