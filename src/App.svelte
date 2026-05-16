<script>
  import { onMount } from "svelte";
  import Navbar from "./components/Navbar.svelte";
  import Footer from "./components/Footer.svelte";
  import Landing from "./views/Landing.svelte";
  import Feed from "./views/Feed.svelte";
  import Profile from "./views/Profile.svelte";
  import LoginModal from "./components/LoginModal.svelte";
  import SignupModal from "./components/SignupModal.svelte";
  import QuickEditorModal from "./components/QuickEditorModal.svelte";
  import { AuthService } from "./core/auth.js";
  import { supabase } from "./utils/supabase.js";
  import { ui } from "./core/ui.svelte.js";

  let user = $state(null);
  let currentPath = $state(window.location.pathname);
  let isLanding = $derived(currentPath === "/" && !user);

  onMount(async () => {
    user = await AuthService.getCurrentUser();

    supabase.auth.onAuthStateChange((event, session) => {
      user = session?.user ?? null;
      handleRouting();
    });

    window.addEventListener("popstate", () => {
      handleRouting();
    });

    handleRouting();
  });

  function handleRouting() {
    currentPath = window.location.pathname;

    // Auth Guard
    if (!user && currentPath !== "/") {
      navigate("/");
      return;
    }

    if (user && currentPath === "/") {
      navigate("/feed");
      return;
    }
  }

  function navigate(path) {
    window.history.pushState({}, "", path);
    handleRouting();
  }
</script>

<svelte:window
  on:show-login={() => ui.openModal("login")}
  on:show-signup={() => ui.openModal("signup")}
/>

{#if ui.activeModal === "login"}
  <LoginModal />
{:else if ui.activeModal === "signup"}
  <SignupModal />
{:else if ui.activeModal === "quick-editor"}
  <QuickEditorModal />
{/if}

{#if !isLanding}
  <Navbar {user} />
{/if}

<main id="app-view">
  {#if currentPath === "/"}
    <Landing />
  {:else if currentPath.startsWith("/profile")}
    <Profile {currentPath} />
  {:else if currentPath === "/feed"}
    <Feed {user} />
  {:else}
    <div class="text-white p-10">404 - Not Found</div>
  {/if}
</main>

{#if !isLanding}
  <Footer />
{/if}
