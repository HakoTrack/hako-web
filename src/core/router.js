import { AuthService } from './auth.js';
import { loadComponent } from '../utils/loadComponent.js';
import { ui } from './ui.svelte.js';
import { HakoImage } from '../utils/images.js';

export const handleRouting = async () => {
  const user = await AuthService.getCurrentUser();
  const path = window.location.pathname;
  const pathParts = path.split('/').filter(p => p && !p.endsWith('.html'));

  const appView = document.getElementById('app-view');
  if (!appView) return;

  // 1. Auth Guard: Redirect to landing if unauthenticated and not on landing
  if (!user && path !== '/') {
    window.history.pushState({}, '', '/');
    handleRouting();
    return;
  }

  // 2. Determine if we should show the navbar/footer
  const isLanding = path === '/' && !user;
  const navbarPlaceholder = document.getElementById('navbar-placeholder');
  const footerPlaceholder = document.getElementById('footer-placeholder');

  if (isLanding) {
    if (navbarPlaceholder) navbarPlaceholder.style.display = 'none';
    if (footerPlaceholder) footerPlaceholder.style.display = 'none';
  } else {
    if (navbarPlaceholder) navbarPlaceholder.style.display = 'block';
    if (footerPlaceholder) footerPlaceholder.style.display = 'block';

    await Promise.all([
      loadComponent('navbar-placeholder', '/components/common/navbar.html'),
      loadComponent('footer-placeholder', '/components/common/footer.html')
    ]);
    updateNavbar(user);
  }

  // 2. Routing Logic
  if (path === '/') {
    if (user) {
      window.history.pushState({}, '', '/feed');
      handleRouting();
    } else {
      await loadComponent('app-view', '/views/landing.html');

      // Load hero background
      const heroUrl = HakoImage.get('landing.jpg', { f: 'avif' });
      const view = document.getElementById('landing-view');

      if (view) {
        const img = new Image();
        img.src = heroUrl;

        img.onload = () => {
          view.style.setProperty('--hero-bg', `url('${heroUrl}')`);
          view.classList.add('loaded');
        };
      }

      document.getElementById('landing-login')?.addEventListener('click', showLoginModal);
      document.getElementById('landing-signup')?.addEventListener('click', showSignupModal);
    }
  } else if (pathParts.includes('profile')) {
    const username = pathParts[pathParts.indexOf('profile') + 1] || user?.email?.split('@')[0] || 'shaetsu';
    await loadComponent('app-view', '/profile/profile.html');
    const { initProfile } = await import('../features/profile.js');
    await initProfile(username);
  } else {
    await loadComponent('app-view', '/views/404.html');
    document.title = '404 - Page Not Found | Hako';
  }
};

export function showLoginModal() {
  ui.openModal('login');
}

export function showSignupModal() {
  ui.openModal('signup');
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
        `;

    document.getElementById('logout-btn')?.addEventListener('click', async () => {
      await AuthService.logout();
    });
  } else {
    navLinks.innerHTML = `
            <button id="nav-login" class="nav-link">Login</button>
            <button id="nav-signup" class="nav-link">Sign Up</button>
        `;
    document.getElementById('nav-login').addEventListener('click', showLoginModal);
    document.getElementById('nav-signup').addEventListener('click', showSignupModal);
  }

  document.getElementById('nav-branding')?.addEventListener('click', () => {
    window.history.pushState({}, '', user ? '/feed' : '/');
    handleRouting();
  });
}
