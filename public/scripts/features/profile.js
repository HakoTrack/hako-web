window.initProfile = async (username) => {
  const profileContainer = document.getElementById('profile-container');

  if (!profileContainer) return;

  try {
    const response = await fetch(`/data/users/${username}/profile.json`);
    if (!response.ok) throw new Error('User not found');
    const data = await response.json();

    document.getElementById('profile-display-name').innerText = data.display_name;
    document.getElementById('profile-bio').innerText = data.bio || "";
    document.getElementById('profile-avatar').src = `/assets/profile/${username}/avatar.jpg`;
    document.getElementById('profile-banner').src = `/assets/profile/${username}/banner.jpg`;

    if (username === 'shaetsu') document.getElementById('role-badge').classList.remove('hidden');
    document.title = `${username}'s Profile | Hako`;
    profileContainer.classList.remove('invisible');

    await loadComponent('profile-content-placeholder', '/components/profile/overview.html');

    if (window.initializeFavorites) window.initializeFavorites(username);
    if (window.initializeTasteChart) window.initializeTasteChart(username);
    if (window.populateActivityFeed) await window.populateActivityFeed(username);
    if (window.setupProfileTabs) window.setupProfileTabs(username);

  } catch (e) {
    console.error("Profile Init Error:", e);
    await loadComponent('app-view', '/views/404.html');
    document.title = 'User Not Found | Hako';
  }
};

window.setupProfileTabs = function (username) {
  const tabs = document.querySelectorAll('.tab-btn');
  const placeholder = 'profile-content-placeholder';

  tabs.forEach(tab => {
    tab.addEventListener('click', async () => {
      tabs.forEach(t => {
        t.classList.remove('tab-active', 'text-white');
        t.classList.add('text-slate-400');
      });
      tab.classList.add('tab-active', 'text-white');
      tab.classList.remove('text-slate-400');

      const tabName = tab.innerText.toLowerCase();

      if (tabName === 'overview') {
        await loadComponent(placeholder, '/components/profile/overview.html');
        // Re-pass username here
        if (window.initializeFavorites) window.initializeFavorites(username);
        if (window.initializeTasteChart) window.initializeTasteChart(username);
        if (window.populateActivityFeed) await window.populateActivityFeed(username);
      }
      else if (tabName === 'anime' || tabName === 'manga') {
        await loadComponent(placeholder, '/components/profile/media-list.html');
        initMediaList(tabName);
      }
    });
  });
};

function initMediaList(type) {
  const wrapper = document.getElementById('media-list-wrapper');
  if (!wrapper) return;

  // Set context for the generic component
  wrapper.dataset.type = type;

  // Update sidebar labels/IDs to match what renderMediaList expects
  const sidebar = document.getElementById('media-categories-sidebar');
  sidebar.id = `${type}-categories-sidebar`;

  const allLabel = sidebar.querySelector('.all-label');
  if (allLabel) {
    allLabel.innerText = `All ${type.charAt(0).toUpperCase() + type.slice(1)}`;
  }

  const activeLabel = sidebar.querySelector('.active-label');
  if (activeLabel) activeLabel.innerText = type === 'anime' ? 'Watching' : 'Reading';

  const icon = sidebar.querySelector('i');
  if (icon) {
    icon.className = 'fa-solid fa-layer-group text-accent mr-2';
  }

  // Bind category buttons
  sidebar.querySelectorAll('.category-btn').forEach(btn => {
    btn.onclick = () => {
      const sort = document.getElementById('sort-select').value;
      window.renderMediaList(type, 'media-list-container', sort, btn.dataset.status);
    };
  });

  // Initial render
  window.renderMediaList(type, 'media-list-container', 'Title', 'all');
}
