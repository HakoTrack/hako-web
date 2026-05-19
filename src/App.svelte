<script>
  import { onMount } from "svelte";
  import Navbar from "./components/Navbar.svelte";
  import Footer from "./components/Footer.svelte";
  import Landing from "./views/Landing.svelte";
  import Feed from "./views/Feed.svelte";
  import Profile from "./views/Profile.svelte";
  import MediaDetail from "./views/MediaDetail.svelte";
  import ModalWrapper from "./components/modals/ModalWrapper.svelte";
  import { AuthService } from "./core/auth";
  import { ProfileService } from "./services/profileService.ts";
  import { supabase } from "./utils/supabase.js";
  import { openModal } from "./core/ui.svelte.ts";

  let user = $state(null);
  let profile = $state(null);
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
      activeTab = pathParts[2] || "overview";
      mediaType = pathParts[2] || "anime";
    }
  }

  onMount(async () => {
    user = await AuthService.getCurrentUser();
    authInitialized = true;

    supabase.auth.onAuthStateChange((event, session) => {
      user = session?.user ?? null;
      handleRouting();
    });

    window.addEventListener("popstate", handleRouting);
    handleRouting();
  });
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
  {:else if currentPath.startsWith("/user")}
    {#key currentPath}
      <Profile {currentPath} {activeTab} {mediaType} />
    {/key}
  {:else if currentPath.startsWith("/anime/")}
    {#key currentPath}
      <MediaDetail mediaId={currentPath.split("/")[2]} type="anime" />
    {/key}
  {:else if currentPath === "/feed"}
    <Feed {user} />
  {:else}
    <div class="text-white p-10">404 - Not Found</div>
  {/if}
</main>

{#if !isLanding}
  <Footer />
{/if}
