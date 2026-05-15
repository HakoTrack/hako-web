window.initializeFavorites = async function (username) {
  if (!username) {
    const pathParts = window.location.pathname.split('/').filter(p => p);
    username = pathParts[pathParts.length - 1] || 'shaetsu';
  }

  const favoritesPath = `/data/users/${username}/favorites.json`;

  try {
    const response = await fetch(favoritesPath);
    if (!response.ok) {
      console.warn(`Favorites load skipped: ${favoritesPath} returned ${response.status}`);
      return;
    }

    const favorites = await response.json();

    const renderFavorites = (category, containerId, subfolder) => {
      const container = document.getElementById(containerId);
      const section = document.getElementById(`fav-${category}-section`);

      // If the component hasn't loaded into the DOM yet, we skip
      if (!container) return;

      const ids = favorites[category] || [];

      if (ids.length === 0) {
        if (section) section.classList.add('hidden');
        return;
      }

      if (section) section.classList.remove('hidden');

      container.innerHTML = ids.map(id => `
        <img src="/assets/covers/${subfolder}/${id}_medium.jpg"
             class="media-cover rounded w-full aspect-[85/115] object-cover cursor-pointer hover:scale-105 transition-transform bg-[#151f2e]"
             data-media-id="${id}"
             alt="${category} ${id}"
             onerror="this.onerror=null; this.src='/assets/covers/placeholder_medium.jpg';">
      `).join('');
    };

    renderFavorites('anime', 'fav-anime-grid', 'anime');
    renderFavorites('manga', 'fav-manga-grid', 'manga');
    renderFavorites('characters', 'fav-characters-grid', 'characters');
    renderFavorites('staff', 'fav-staff-grid', 'staff');

  } catch (e) {
    console.error("Error loading favorites:", e);
  }
};
