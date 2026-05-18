<script>
  import { AuthService } from "../core/auth.js";

  let { user = null } = $props();

  let username = $derived(user?.email?.split("@")[0]);

  async function handleLogout() {
    await AuthService.logout();
  }

  function navigate(path) {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
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
            class="nav-link"
            onclick={(e) => {
              e.preventDefault();
              navigate("/feed");
            }}>Feed</a
          >
          <a
            href="/profile/{username}"
            class="nav-link"
            onclick={(e) => {
              e.preventDefault();
              navigate(`/profile/${username}`);
            }}>Profile</a
          >
          <!-- svelte-ignore a11y_invalid_attribute -->
          <a href="#" class="nav-link">Lists</a>
          <!-- svelte-ignore a11y_invalid_attribute -->
          <a href="#" class="nav-link">Browse</a>
          <!-- svelte-ignore a11y_invalid_attribute -->
          <a
            href="#"
            id="logout-btn"
            class="nav-link"
            onclick={(e) => {
              e.preventDefault();
              handleLogout();
            }}>Logout</a
          >
        {:else}
          <button
            id="nav-login"
            class="nav-link"
            onclick={() => window.dispatchEvent(new CustomEvent("show-login"))}
            >Login</button
          >
          <button
            id="nav-signup"
            class="nav-link"
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
        <div
          class="w-8 h-8 rounded-full bg-accent flex items-center justify-center font-bold text-xs"
        >
          {username.charAt(0).toUpperCase()}
        </div>
      </div>
    </div>
  </div>
</nav>

<style>
  .nav-link:hover {
    color: #edf1f5;
  }
</style>
