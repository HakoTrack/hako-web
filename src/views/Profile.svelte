<script>
  import { onMount } from 'svelte';
  import { initProfile } from '../features/profile.js';

  export let currentPath = '';

  $: username = currentPath.split('/').filter(p => p && p !== 'profile')[0] || 'shaetsu';

  onMount(async () => {
    await initProfile(username);
  });
</script>

<div id="profile-container" class="invisible">
  <!-- Parallax Banner Container -->
  <div class="fixed top-0 left-0 mt-[60px] w-full h-[300px] md:h-[400px] -z-10 overflow-hidden">
    <img id="profile-banner" src="" alt="" class="object-top w-full h-full object-cover bg-[#151f2e]">
    <div class="absolute inset-0 bg-gradient-to-t from-[#0b1622] to-transparent"></div>
  </div>

  <div class="relative z-10 bg-transparent max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
    <!-- Spacer to reveal the fixed banner initially -->
    <div class="h-[200px] md:h-[300px]"></div>

    <div class="relative pb-8">
      <div class="flex flex-col md:flex-row items-end md:items-center space-y-4 md:space-y-0 md:space-x-6">
        <div class="relative group">
          <img id="profile-avatar" src="" alt=""
            class="w-32 h-32 md:w-40 md:h-40 rounded-xl border-4 border-[#0b1622] shadow-2xl object-cover bg-[#151f2e]">
          <div id="role-badge"
            class="hidden absolute -bottom-2 -right-2 bg-accent text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg uppercase tracking-tighter">
            Developer</div>
        </div>
        <div class="flex-1 text-center md:text-left">
          <h1 id="profile-display-name" class="text-3xl md:text-4xl font-bold text-white mb-1"></h1>
          <p id="profile-bio" class="text-slate-400 text-sm max-w-xl"></p>
        </div>
        <div class="flex space-x-3">
          <button
            class="bg-accent hover:bg-opacity-90 text-white px-6 py-2 rounded-lg font-bold text-sm transition-all shadow-lg shadow-blue-500/10">Follow</button>
          <button class="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-lg transition-all"><i
              class="fa-solid fa-ellipsis"></i></button>
        </div>
      </div>
    </div>

    <div
      class="profile-tabs flex space-x-8 border-b border-slate-800 mb-8 overflow-x-auto whitespace-nowrap scrollbar-hide">
      <button class="tab-btn pb-4 font-semibold text-white tab-active">Overview</button>
      <button class="tab-btn pb-4 font-semibold hover:text-white transition-colors">Anime</button>
      <button class="tab-btn pb-4 font-semibold hover:text-white transition-colors">Manga</button>
      <button class="tab-btn pb-4 font-semibold hover:text-white transition-colors">Light Novels</button>
      <button class="tab-btn pb-4 font-semibold hover:text-white transition-colors">Visual Novels</button>
      <button class="tab-btn pb-4 font-semibold hover:text-white transition-colors">Favorites</button>
      <button class="tab-btn pb-4 font-semibold hover:text-white transition-colors">Stats</button>
      <button class="tab-btn pb-4 font-semibold hover:text-white transition-colors">Social</button>
    </div>

    <div id="profile-content-placeholder" class="py-8 min-h-[400px]"></div>
  </div>
</div>
