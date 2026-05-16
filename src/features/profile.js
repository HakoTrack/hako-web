import { loadComponent } from '../utils/loadComponent.js';
import { initializeFavorites } from './favorites.js';
import { initializeTasteChart } from './taste.js';
import { populateActivityFeed } from './populateFeed.js';
import { renderMediaList } from '../utils/renderMediaList.js';
import { supabase } from '../utils/supabase.js';

export const initProfile = async (username) => {
  const profileContainer = document.getElementById('profile-container');

  if (!profileContainer) return;

  try {
    // Fetch profile from Supabase by username
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !profile) throw new Error('User not found');

    const displayNameEl = document.getElementById('profile-display-name');
    const bioEl = document.getElementById('profile-bio');
    const avatarEl = document.getElementById('profile-avatar');
    const bannerEl = document.getElementById('profile-banner');

    if (displayNameEl) displayNameEl.innerText = profile.display_name || profile.username;
    if (bioEl) bioEl.innerText = profile.bio || "";

    // Fallback paths for images, eventually these could move to Supabase too
    const avatarPath = profile.avatar_url || `/profile/${username}/avatar.jpg`;
    const bannerPath = profile.banner_url || `/profile/${username}/banner.jpg`;

    if (avatarEl) avatarEl.src = window.HakoImage ? window.HakoImage.get(avatarPath.replace(/^\//, ''), { w: 200, f: 'webp' }) : avatarPath;
    if (bannerEl) bannerEl.src = window.HakoImage ? window.HakoImage.get(bannerPath.replace(/^\//, ''), { w: 1200, f: 'webp', q: 80 }) : bannerPath;

    const roleBadge = document.getElementById('role-badge');
    if (profile.role === 'owner' && roleBadge) roleBadge.classList.remove('hidden');

    document.title = `${username}'s Profile | Hako`;
    profileContainer.classList.remove('invisible');

    await loadComponent('profile-content-placeholder', '/components/profile/overview.html');

    // Inject about_me after loading overview
    const aboutMeEl = document.querySelector('#profile-content-placeholder p.text-slate-400');
    if (aboutMeEl && profile.about_me) {
      aboutMeEl.innerText = profile.about_me;
    }

    initializeFavorites(username, profile.id);
    initializeTasteChart(username);
    await populateActivityFeed(username);
    setupProfileTabs(username, profile.id);

  } catch (e) {
    console.error("Profile Init Error:", e);
    await loadComponent('app-view', '/views/404.html');
    document.title = 'User Not Found | Hako';
  }
};

export function setupProfileTabs(username, profileId) {
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

        // Re-inject about_me when switching back to overview
        const { data: profile } = await supabase.from('profiles').select('about_me').eq('id', profileId).single();
        const aboutMeEl = document.querySelector('#profile-content-placeholder p.text-slate-400');
        if (aboutMeEl && profile?.about_me) {
          aboutMeEl.innerText = profile.about_me;
        }

        initializeFavorites(username, profileId);
        initializeTasteChart(username);
        await populateActivityFeed(username);
      }
      else if (tabName === 'anime' || tabName === 'manga') {
        await loadComponent(placeholder, '/components/profile/media-list.html');
        initMediaList(tabName, profileId);
      }
    });
  });
}

function initMediaList(type, profileId) {
  const wrapper = document.getElementById('media-list-wrapper');
  if (!wrapper) return;

  // Set context for the generic component
  wrapper.dataset.type = type;

  // Update sidebar labels/IDs to match what renderMediaList expects
  const sidebar = document.getElementById('media-categories-sidebar');
  if (sidebar) {
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
        renderMediaList(type, 'media-list-container', sort, btn.dataset.status, profileId);
      };
    });
  }

  // Initial render
  renderMediaList(type, 'media-list-container', 'Title', 'all', profileId);
}

// Global attachment for mockup compatibility
window.initProfile = initProfile;
window.setupProfileTabs = setupProfileTabs;
