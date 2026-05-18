import { AuthService } from './auth.js';
import { ProfileService } from '../services/profileService.js';
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
  } else if (path.startsWith('/profile/')) {
    const username = pathParts[1];
    const profileData = await ProfileService.getProfileByUsername(username);
    if (!profileData) {
      await loadComponent('app-view', '/views/404.html');
    } else {
      await loadComponent('app-view', '/views/profile.html', { profileData });
      document.title = `${username}'s Profile | Hako`;
    }
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
