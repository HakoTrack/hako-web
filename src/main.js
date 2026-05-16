import './styles/global.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { initQuickEditor } from './utils/quickEditor.js';
import './utils/images.js';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { inject } from '@vercel/analytics';

// 1. Initialize global systems that aren't yet in Svelte
initQuickEditor();

// 2. Initialize Vercel Speed Insights
injectSpeedInsights();

// 3. Initialize Vercel Web Analytics
inject();

// 4. Mount the Svelte app
const app = mount(App, {
  target: document.getElementById('app'),
});

export default app;
