<script>
  import { onMount } from "svelte";
  import Navbar from "./components/Navbar.svelte";
  import Footer from "./components/Footer.svelte";
  import Landing from "./views/Landing.svelte";
  import ModalWrapper from "./components/modals/ModalWrapper.svelte";
  import { AuthService } from "./core/auth";
  import { ProfileService } from "./services/profileService.ts";
  import { supabase } from "./utils/supabase.js";
  import { openModal } from "./core/ui.svelte.ts";
  import { routes } from "./routes";

  let user = $state(null);
  let profile = $state(null);
  let targetProfileData = $state(null);
  let currentPath = $state(window.location.pathname);
  let activeTab = $state("overview");
  let mediaType = $state("anime");
  let authInitialized = $state(false);

  let isLanding = $derived(authInitialized && currentPath === "/" && !user);

  $effect(() => {
    // Auth Guard: Redirect to landing if not logged in and not already on landing
    if (authInitialized && user === null && currentPath !== "/") {
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
  function handleRouting() {
    currentPath = window.location.pathname;
    const pathParts = currentPath.split("/").filter((p) => p);

    if (pathParts[0] === "user") {
      const targetUsername = pathParts[1];

      // Clear data to prevent stale content while fetching
      targetProfileData = null;

      // Eager fetch / cached return
      if (profile && profile.username === targetUsername) {
        targetProfileData = profile;
      } else {
        ProfileService.getProfileByUsername(targetUsername).then((res) => {
          if (res.success) targetProfileData = res.data;
        });
      }

      activeTab = pathParts[2] || "overview";
      mediaType = pathParts[2] || "anime";
    }
  }

  onMount(async () => {
    user = await AuthService.getCurrentUser();
    authInitialized = true;

    supabase.auth.onAuthStateChange((_event, session) => {
      user = session?.user ?? null;
      handleRouting();
    });

    window.addEventListener("popstate", handleRouting);
    handleRouting();
  });

  let activeRoute = $derived(
    routes.find((r) => currentPath.startsWith(r.path)),
  );
</script>

<svelte:window
  on:show-login={() => openModal("login")}
  on:show-signup={() => openModal("signup")}
/>

<ModalWrapper />

{#if !isLanding}
  <Navbar {user} {profile} />
{/if}

<main id="app-view">
  {#if currentPath === "/"}
    <Landing />
  {:else if activeRoute}
    {@const Component = activeRoute.component}
    <Component
      {...activeRoute.props(
        currentPath,
        user,
        targetProfileData,
        activeTab,
        mediaType,
      )}
    />
  {:else}
    <div class="text-white p-10">404 - Not Found</div>
  {/if}
</main>

{#if !isLanding}
  <Footer />
{/if}
