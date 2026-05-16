import { supabase } from '../utils/supabase.js';
import { HakoImage } from '../utils/images.js';
import { ui } from '../core/ui.svelte.js';

export async function initializeFavorites(profileId) {
  if (!profileId) {
    console.warn("No profileId provided to initializeFavorites");
    return;
  }

  try {
    // Fetch anime favorites from Supabase
    const { data: favData, error } = await supabase
      .from('profile_favorites')
      .select('anime_id')
      .eq('profile_id', profileId);

    if (error) throw error;

    const animeIds = favData.map(f => f.anime_id);
    ui.setFavorites(animeIds);

    const renderFavorites = (category, containerId, subfolder, ids) => {
      const container = document.getElementById(containerId);
      const section = document.getElementById(`fav-${category}-section`);

      // prefetch assets
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = `${HakoImage.getCover(subfolder, ids[0], 'medium')}`;
      link.href = `${HakoImage.getBanner(subfolder, ids[0])}`;
      document.head.appendChild(link);

      // If the component hasn't loaded into the DOM yet, we skip
      if (!container) return;

      if (!ids || ids.length === 0) {
        if (section) section.classList.add('hidden');
        return;
      }

      if (section) section.classList.remove('hidden');

      container.innerHTML = ids.map(id => `
        <img src="${HakoImage.getCover(subfolder, id, 'medium')}"
             class="media-cover rounded w-full aspect-85/115 object-cover cursor-pointer hover:scale-105 transition-transform bg-[#151f2e]"
             data-media-id="${id}"
             onclick="if(window.openQuickEditor) window.openQuickEditor(${id})"
             alt="${category} ${id}"
             onerror="this.onerror=null; this.src='/assets/covers/placeholder_medium.jpg';">
      `).join('');
    };

    renderFavorites('anime', 'fav-anime-grid', 'anime', animeIds);

    // For now, other categories remain empty or hidden as they aren't in the DB schema yet
    renderFavorites('manga', 'fav-manga-grid', 'manga', []);
    renderFavorites('light-novels', 'fav-light-novels-grid', 'light-novels', []);
    renderFavorites('visual-novels', 'fav-visual-novels-grid', 'visual-novels', []);
    renderFavorites('characters', 'fav-characters-grid', 'characters', []);
    renderFavorites('staff', 'fav-staff-grid', 'staff', []);

  } catch (e) {
    console.error("Error loading favorites from Supabase:", e);
  }
}
