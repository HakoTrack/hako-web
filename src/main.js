import './styles/global.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { initQuickEditor } from './utils/quickEditor.js';
import './utils/images.js';
import { inject } from '@vercel/analytics';

// Initialize Vercel Analytics
inject({
  mode: import.meta.env.MODE === 'production' ? 'production' : 'development',
});

// 1. Initialize global systems that aren't yet in Svelte
initQuickEditor();

// 2. Mount the Svelte app
const app = mount(App, {
  target: document.getElementById('app'),
});

export default app;
