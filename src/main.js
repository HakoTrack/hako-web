import './styles/global.css';
import { handleRouting } from './core/router.js';
import { initAuth } from './core/auth.js';

// 1. Initialize global systems
initAuth();

// 2. Start the router
window.addEventListener('popstate', handleRouting);
handleRouting();
