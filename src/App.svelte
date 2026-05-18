<script>
  import { onMount } from "svelte";
  import Navbar from "./components/Navbar.svelte";
  import Footer from "./components/Footer.svelte";
  import Landing from "./views/Landing.svelte";
  import Feed from "./views/Feed.svelte";
  import Profile from "./views/Profile.svelte";
  import ModalWrapper from "./components/modals/ModalWrapper.svelte";
  import { AuthService } from "./core/auth.js";
  import { ProfileService } from "./services/profileService.js";
  import { ui } from "./core/ui.svelte.js";

  let user = $state(null);
  let profile = $state(null);
  let currentPath = $state(window.location.pathname);
  let activeTab = $state("overview");
  let mediaType = $state("anime");

  let isLanding = $derived(currentPath === "/" && !user);

  $effect(() => {
    if (user) {
      ProfileService.getProfileById(user.id).then((p) => {
        profile = p;
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
      // pathParts[2] is the mediaType (e.g., 'anime')
      activeTab = pathParts[2] || "overview";
      mediaType = pathParts[2] || "anime";
    }
  }

  onMount(() => {
    AuthService.getCurrentUser().then((u) => {
      user = u;
    });

    window.addEventListener("popstate", handleRouting);
    handleRouting();
  });
</script>

<svelte:window
  on:show-login={() => ui.openModal("login")}
  on:show-signup={() => ui.openModal("signup")}
/>

<ModalWrapper />

{#if !isLanding}
  <Navbar {user} {profile} />
{/if}

<main id="app-view">
  {#if currentPath === "/"}
    <Landing />
  {:else if currentPath.startsWith("/user")}
    <!-- Profile view handles its own internal routing -->
    <Profile {currentPath} {activeTab} {mediaType} />
  {:else if currentPath === "/feed"}
    <Feed {user} />
  {:else}
    <div class="text-white p-10">404 - Not Found</div>
  {/if}
</main>

{#if !isLanding}
  <Footer />
{/if}
