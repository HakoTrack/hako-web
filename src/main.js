import './styles/global.css';
import { handleRouting } from './core/router.js';
import { initAuth } from './core/auth.js';

// 1. Initialize global systems
initAuth();

// 2. Start the router
window.addEventListener('popstate', handleRouting);
window.addEventListener('DOMContentLoaded', handleRouting);

// 3. Intercept clicks on links for SPA routing
document.addEventListener('click', (e) => {
  const target = e.target.closest('a');
  if (target && target.href && target.href.startsWith(window.location.origin)) {
    // Check if it's a real link and not a # or something that should be handled differently
    const url = new URL(target.href);
    if (url.pathname !== window.location.pathname || url.search !== window.location.search) {
      e.preventDefault();
      window.history.pushState({}, '', target.getAttribute('href'));
      handleRouting();
    }
  }
});
