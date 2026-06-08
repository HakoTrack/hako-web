<script>
  import { onMount, onDestroy, untrack } from "svelte";
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
    console.log("[App] User state changed:", user?.id);
    const currentUser = user;
    if (currentUser) {
      ProfileService.getProfileById(currentUser.id).then((result) => {
        if (result.success && result.data) {
          console.log("[App] Fetched own profile:", result.data.username);

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
              console.log(
                "[App] Setting targetProfileData to own profile (merging lists)",
              );
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
    const lastPath = currentPath;
    currentPath = window.location.pathname;
    const pathParts = currentPath.split("/").filter((p) => p);
    const lastPathParts = lastPath.split("/").filter((p) => p);

    console.log("[App] handleRouting:", currentPath, "lastPath:", lastPath);

    if (pathParts[0] === "user") {
      const targetUsername = pathParts[1];
      const lastUsername =
        lastPathParts[0] === "user" ? lastPathParts[1] : null;

      console.log(
        "[App] Profile route detected. Target:",
        targetUsername,
        "Last:",
        lastUsername,
      );

      // Re-fetch if switched users or if we don't have data yet (e.g. initial load)
      if (targetUsername !== lastUsername || !targetProfileData) {
        console.log(
          "[App] Syncing targetProfileData. missing:",
          !targetProfileData,
        );

        if (profile && profile.username === targetUsername) {
          console.log("[App] Using own profile as target");
          targetProfileData = profile;
        } else {
          // ONLY clear if it's a DIFFERENT user to avoid unmounting components during refresh
          if (targetProfileData?.username !== targetUsername) {
            console.log("[App] Clearing targetProfileData (User changed)");
            targetProfileData = null;
          } else {
            console.log(
              "[App] Keeping current targetProfileData while refreshing same user",
            );
          }

          ProfileService.getProfileByUsername(targetUsername).then((res) => {
            if (res.success) {
              console.log(
                "[App] Successfully fetched target profile:",
                res.data.username,
              );
              // Merge to avoid losing mediaLists if we already have them
              targetProfileData = {
                ...res.data,
                mediaLists:
                  targetProfileData?.id === res.data.id
                    ? targetProfileData.mediaLists || {}
                    : {},
              };
            } else {
              console.error("[App] Failed to fetch target profile:", res.error);
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
    console.log("[App] Initial user load:", user?.id);
    authInitialized = true;
    window.addEventListener("scroll", handleScroll);

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[App] onAuthStateChange:", event, session?.user?.id);
      user = session?.user ?? null;
      handleRouting();
    });
    authSubscription = data.subscription;

    window.addEventListener("popstate", () => {
      console.log("[App] popstate event");
      handleRouting();
    });
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
