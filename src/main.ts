import './shared/styles/global.css';
import { mount } from 'svelte';
import App from './App.svelte';
import './shared/utils/images';

// 4. Mount the Svelte app
const app = mount(App, {
  target: document.getElementById('app')!,
});

export default app;
