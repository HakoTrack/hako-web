import { AuthService } from './auth.js';
import { loadComponent } from '../utils/loadComponent.js';

export const handleRouting = async () => {
  const user = await AuthService.getCurrentUser();
  const path = window.location.pathname;
  const pathParts = path.split('/').filter(p => p && !p.endsWith('.html'));

  // Shared layout components
  await Promise.all([
    loadComponent('navbar-placeholder', '/components/common/navbar.html'),
    loadComponent('footer-placeholder', '/components/common/footer.html')
  ]);
  updateNavbar(user);

  const appView = document.getElementById('app-view');
  if (!appView) return;

  // Auth Guard: If not logged in and not on login/signup, redirect or show login
  if (!user && path !== '/login' && path !== '/signup' && path !== '/') {
    window.location.href = '/login';
    return;
  }

  // Routing Logic
  if (path === '/') {
    await renderModule('landing');
  } else if (path === '/login') {
    const { renderLoginPage } = await import('../modules/auth/login.js');
    appView.innerHTML = renderLoginPage();
    initLoginForm();
  } else if (path === '/signup') {
    const { renderSignupPage } = await import('../modules/auth/signup.js');
    appView.innerHTML = renderSignupPage();
    initSignupForm();
  } else if (pathParts.includes('profile')) {
    const username = pathParts[pathParts.indexOf('profile') + 1] || user?.email?.split('@')[0] || 'shaetsu';
    await loadComponent('app-view', '/profile/profile.html');
    const { initProfile } = await import('../features/profile.js');
    await initProfile(username);
  } else if (pathParts.length === 0 || pathParts[0] === 'feed') {
    await loadComponent('app-view', '/views/feed.html');
    const { populateActivityFeed } = await import('../features/populateFeed.js');
    const username = user?.email?.split('@')[0] || 'shaetsu';
    await populateActivityFeed(username);
  } else {
    await loadComponent('app-view', '/views/404.html');
    document.title = '404 - Page Not Found | Hako';
  }
};

async function renderModule(moduleName) {
  const appView = document.getElementById('app-view');
  if (moduleName === 'landing') {
    appView.innerHTML = `
            <div class="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <h1 class="text-5xl font-bold text-white mb-4">Welcome to Hako</h1>
                <p class="text-xl text-slate-400 mb-8">Track your anime and manga progress with ease.</p>
                <div class="space-x-4">
                    <a href="/login" class="bg-accent text-white px-8 py-3 rounded-lg font-bold hover:opacity-90 transition-opacity">Login</a>
                    <a href="/signup" class="bg-slate-700 text-white px-8 py-3 rounded-lg font-bold hover:opacity-90 transition-opacity">Sign Up</a>
                </div>
            </div>
        `;
  }
}

function initLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      const { supabase } = await import('../utils/supabase.js');
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.history.pushState({}, '', '/feed');
      handleRouting();
    } catch (error) {
      alert(error.message);
    }
  });
}

function updateNavbar(user) {
  const navLinks = document.querySelector('.hidden.md\\:flex.space-x-6');
  if (!navLinks) return;

  const username = user?.email?.split('@')[0] || 'shaetsu';

  if (user) {
    navLinks.innerHTML = `
            <a href="/feed" class="nav-link">Feed</a>
            <a href="/profile/${username}" class="nav-link">Profile</a>
            <a href="#" class="nav-link">Lists</a>
            <a href="#" class="nav-link">Browse</a>
            <button id="logout-btn" class="nav-link text-red-400">Logout</button>
        `;

    document.getElementById('logout-btn')?.addEventListener('click', async () => {
      await AuthService.logout();
    });
  } else {
    navLinks.innerHTML = `
            <a href="/login" class="nav-link">Login</a>
            <a href="/signup" class="nav-link">Sign Up</a>
        `;
  }

  document.getElementById('nav-branding')?.addEventListener('click', () => {
    window.history.pushState({}, '', user ? '/feed' : '/');
    handleRouting();
  });
}

function initSignupForm() {
  const form = document.getElementById('signup-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      const { supabase } = await import('../utils/supabase.js');
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      alert("Signup successful! Please check your email for verification.");
      window.history.pushState({}, '', '/login');
      handleRouting();
    } catch (error) {
      alert(error.message);
    }
  });
}
