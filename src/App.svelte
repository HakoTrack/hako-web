<script>
  import { onMount } from 'svelte';
  import Navbar from './components/Navbar.svelte';
  import Footer from './components/Footer.svelte';
  import Landing from './views/Landing.svelte';
  import Feed from './views/Feed.svelte';
  import Profile from './views/Profile.svelte';
  import LoginModal from './components/LoginModal.svelte';
  import SignupModal from './components/SignupModal.svelte';
  import { AuthService } from './core/auth.js';
  import { supabase } from './utils/supabase.js';

  let user = null;
  let currentPath = window.location.pathname;
  let isLanding = true;
  let activeModal = null; // 'login' or 'signup' or null

  onMount(async () => {
    user = await AuthService.getCurrentUser();

    supabase.auth.onAuthStateChange((event, session) => {
      user = session?.user ?? null;
      handleRouting();
    });

    window.addEventListener('popstate', () => {
      currentPath = window.location.pathname;
      handleRouting();
    });

    handleRouting();
  });

  function handleRouting() {
    currentPath = window.location.pathname;

    // Auth Guard
    if (!user && currentPath !== '/') {
      navigate('/');
      return;
    }

    if (user && currentPath === '/') {
      navigate('/feed');
      return;
    }

    isLanding = (currentPath === '/' && !user);
  }

  function navigate(path) {
    window.history.pushState({}, '', path);
    currentPath = path;
    handleRouting();
  }

  // Handle custom events for login/signup modals (placeholder for now)
  function showLogin() {
    activeModal = 'login';
  }

  function showSignup() {
    activeModal = 'signup';
  }

  function closeModal() {
    activeModal = null;
  }
</script>

<svelte:window on:show-login={showLogin} on:show-signup={showSignup} />

{#if activeModal}
  <div class="fixed inset-0 z-[100] flex items-center justify-center bg-[#0b1622]/80 backdrop-blur-sm p-4" on:click|self={closeModal}>
    {#if activeModal === 'login'}
      <LoginModal close={closeModal} />
    {:else if activeModal === 'signup'}
      <SignupModal close={closeModal} />
    {/if}
  </div>
{/if}

{#if !isLanding}
  <Navbar {user} />
{/if}

<main id="app-view">
  <!-- Views will be rendered here -->
  {#if currentPath === '/'}
    <Landing />
  {:else if currentPath.startsWith('/profile')}
    <Profile {currentPath} />
  {:else if currentPath === '/feed'}
    <Feed {user} />
  {:else}
    <div class="text-white p-10">404 - Not Found</div>
  {/if}
</main>

{#if !isLanding}
  <Footer />
{/if}
