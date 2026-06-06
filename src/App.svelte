<script>
  import { onMount, onDestroy } from "svelte";
  import Navbar from "./components/Navbar.svelte";
  import Footer from "./components/Footer.svelte";
  import Landing from "./features/landing/Landing.svelte";
  import ModalWrapper from "./components/modals/ModalWrapper.svelte";
  import { AuthService } from "./core/auth";
  import { ProfileService } from "./features/profile/services/profileService";
  import { supabase } from "./core/supabase.js";
  import { openModal } from "./core/ui.svelte.ts";
  import { routes } from "./routes";
  import { Toasts } from "./shared/components";
  import init from "$wasm/hako_wasm";

  let user = $state(null);
  let profile = $state(null);
  let targetProfileData = $state(null);
  let currentPath = $state(window.location.pathname);
  let activeTab = $state("overview");
  let mediaType = $state("anime");
  let authInitialized = $state(false);
  let authSubscription = null;
  let scrollY = $state(0);

  let isLanding = $derived(authInitialized && currentPath === "/" && !user);
  let isSignup = $derived(currentPath === "/signup");

  function handleScroll() {
    scrollY = window.scrollY;
  }

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
    if (user) {
      ProfileService.getProfileById(user.id).then((result) => {
        if (result.success) {
          profile = result.data;
          // Eagerly set targetProfileData if on own profile
          const pathParts = currentPath.split("/").filter((p) => p);
          if (pathParts[0] === "user" && pathParts[1] === profile.username) {
            targetProfileData = profile;
          }
        } else {
          console.error(
            "DEBUG: Failed to load profile for navbar:",
            result.error,
          );
        }
      });
    } else {
      profile = null;
    }
  });

  // Updated routing logic to handle /user/ paths
  async function handleRouting() {
    const lastPath = currentPath;
    currentPath = window.location.pathname;

    // We don't need to await here, let the UI handle the loading state
    const pathParts = currentPath.split("/").filter((p) => p);
    const lastPathParts = lastPath.split("/").filter((p) => p);

    if (pathParts[0] === "user") {
      const targetUsername = pathParts[1];
      const lastUsername =
        lastPathParts[0] === "user" ? lastPathParts[1] : null;

      // Only re-fetch if we've switched users
      if (targetUsername !== lastUsername) {
        // Optimistic check: is this the current logged in user?
        if (profile && profile.username === targetUsername) {
          targetProfileData = profile;
        } else {
          // Fetch, but ensure we aren't creating race conditions by tracking the active request
          targetProfileData = null; // Indicate loading
          ProfileService.getProfileByUsername(targetUsername).then((res) => {
            if (res.success && currentPath.includes(targetUsername)) {
              targetProfileData = res.data;
            }
          });
        }
      }

      activeTab = pathParts[2] || "overview";
      mediaType = pathParts[2] || "anime";
    }
  }

  onMount(async () => {
    init().catch(console.error);
    user = await AuthService.getCurrentUser();
    authInitialized = true;
    window.addEventListener("scroll", handleScroll);

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      user = session?.user ?? null;
      handleRouting();
    });
    authSubscription = data.subscription;

    window.addEventListener("popstate", handleRouting);
    handleRouting();
  });

  onDestroy(() => {
    window.removeEventListener("popstate", handleRouting);
    window.removeEventListener("scroll", handleScroll);
    authSubscription?.unsubscribe();
  });

  let activeRoute = $derived(
    routes.find((r) => currentPath.startsWith(r.path)),
  );

  // Use a state to store the lazily-loaded component
  let Component = $state(null);

  $effect(() => {
    if (activeRoute) {
      // Defer loading to prevent blocking the UI
      Component = null;
      setTimeout(() => {
        Component = activeRoute.component;
      }, 50);
    } else {
      Component = null;
    }
  });
</script>

<svelte:window on:show-login={() => openModal("login")} />

<div class="min-h-screen flex flex-col">
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
    class="grow flex flex-col relative z-10 bg-(--hako-bg)"
    style="margin-bottom: {scrollY > 0
      ? '160px'
      : '0px'}; transition: margin-bottom 0.1s ease-out;"
  >
    <div class="grow">
      {#if currentPath === "/"}
        <Landing />
      {:else if Component}
        <Component
          {...activeRoute.props(
            currentPath,
            user,
            targetProfileData,
            activeTab,
            mediaType,
          )}
        />
      {:else if activeRoute}
        <!-- Loading state -->
        <div class="p-10 text-(--hako-fg)">Loading...</div>
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
