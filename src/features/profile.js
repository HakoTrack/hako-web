import { loadComponent } from '../utils/loadComponent.js';
import { initializeTasteChart } from './taste.js';
import { populateActivityFeed } from './populateFeed.js';
import { supabase } from '../utils/supabase.js';
import { HakoImage } from '../utils/images.js';

export const initProfile = async (username) => {
  const profileContainer = document.getElementById('profile-container');

  if (!profileContainer) return;

  try {
    // Fetch profile from Supabase by username
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', username)
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

    if (avatarEl) avatarEl.src = HakoImage ? HakoImage.get(avatarPath.replace(/^\//, ''), { w: 200, f: 'webp' }) : avatarPath;
    if (bannerEl) bannerEl.src = HakoImage ? HakoImage.get(bannerPath.replace(/^\//, ''), { w: 1200, f: 'webp', q: 80 }) : bannerPath;

    const roleBadge = document.getElementById('role-badge');
    const ROLES = {
      owner: { label: '総帥', romaji: 'Sousui', color: 'bg-red-500', title: 'Owner' },
      admin: { label: '師匠', romaji: 'Shishou', color: 'bg-indigo-500', title: 'Admin' },
      moderator: { label: '先生', romaji: 'Sensei', color: 'bg-emerald-500', title: 'Moderator' },
      contributor: { label: '先輩', romaji: 'Senpai', color: 'bg-blue-500', title: 'Contributor' },
    };

    if (roleBadge) {
      const role = profile.role?.toLowerCase();
      if (role && ROLES[role]) {
        const config = ROLES[role];
        roleBadge.innerText = config.label;
        roleBadge.title = `${config.romaji} (${config.title})`;
        // Remove default accent color and add the role-specific color
        roleBadge.classList.remove('hidden', 'bg-accent');
        roleBadge.classList.add(config.color);
      } else {
        roleBadge.classList.add('hidden');
      }
    }

    document.title = `${username}'s Profile | Hako`;
    profileContainer.classList.remove('invisible');

    await loadComponent('profile-content-placeholder', '/components/profile/overview.html');

    // Inject about_me after loading overview
    const aboutMeEl = document.querySelector('#profile-content-placeholder p.text-slate-400');
    if (aboutMeEl && profile.about_me) {
      aboutMeEl.innerText = profile.about_me;
    }

    initializeTasteChart(username);
    await populateActivityFeed(username);

    return profile;
  } catch (e) {
    console.error("Profile Init Error:", e);
    await loadComponent('app-view', '/views/404.html');
    document.title = 'User Not Found | Hako';
  }
};

// Global attachment for mockup compatibility
window.initProfile = initProfile;
