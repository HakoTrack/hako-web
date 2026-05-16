<script>
  import { onMount } from 'svelte';
  import { AuthService } from '../core/auth.js';

  export let user = null;

  $: username = user?.email?.split('@')[0] || 'shaetsu';

  async function handleLogout() {
    await AuthService.logout();
  }

  function navigate(path) {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
</script>

<nav class="navbar bg-nav text-white px-4 py-3 sticky top-0 z-50 shadow-lg">
  <div class="max-w-375 mx-auto lg:px-8 flex items-center justify-between">
    <div class="flex items-center space-x-8">
      <div id="nav-branding"
        class="text-2xl font-bold tracking-tighter flex items-center cursor-pointer select-none group"
        on:click={() => navigate(user ? '/feed' : '/')}>
        <span class="font-['Zen_Antique_Soft'] font-bold text-accent mr-2 text-[2rem] leading-8">箱</span>Hako
      </div>
      <div class="hidden md:flex space-x-6 text-sm font-medium">
        {#if user}
          <a href="/feed" class="nav-link" on:click|preventDefault={() => navigate('/feed')}>Feed</a>
          <a href="/profile/{username}" class="nav-link" on:click|preventDefault={() => navigate(`/profile/${username}`)}>Profile</a>
          <a href="#" class="nav-link">Lists</a>
          <a href="#" class="nav-link">Browse</a>
          <a href="#" id="logout-btn" class="nav-link" on:click|preventDefault={handleLogout}>Logout</a>
        {:else}
          <button id="nav-login" class="nav-link" on:click={() => window.dispatchEvent(new CustomEvent('show-login'))}>Login</button>
          <button id="nav-signup" class="nav-link" on:click={() => window.dispatchEvent(new CustomEvent('show-signup'))}>Sign Up</button>
        {/if}
      </div>
    </div>
    <div class="flex items-center space-x-4">
      <div class="relative hidden sm:block">
        <input type="text" placeholder="Search..."
          class="bg-card text-sm rounded-full py-2 px-4 w-64 focus:outline-none focus:ring-1 focus:ring-accent">
        <i class="fa-solid fa-search absolute right-4 top-2.5 text-slate-500"></i>
      </div>
      <div class="flex items-center space-x-3">
        <i class="fa-solid fa-bell cursor-pointer hover:text-accent"></i>
        <div class="w-8 h-8 rounded-full bg-accent flex items-center justify-center font-bold text-xs">
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
