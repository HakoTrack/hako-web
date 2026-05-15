async function populateActivityFeed(username) {

  if (!username) {
    console.error("No username provided to populateActivityFeed");
    return;
  }

  const feedContainer = document.getElementById('activity-feed-container');
  if (!feedContainer) {
    console.error("Activity feed container not found in DOM");
    return;
  }

  try {
    // Fetch activities and global media database to calculate progress
    const [actRes, mediaRes] = await Promise.all([
      fetch(`/data/users/${username}/activities.json`),
      fetch(`/data/media/anime.json`)
    ]);

    if (!actRes.ok || !mediaRes.ok) throw new Error(`Failed to fetch data sources`);

    const data = await actRes.json();
    const animeDb = await mediaRes.json();

    if (!data.activities || data.activities.length === 0) {
      feedContainer.innerHTML = '<p class="text-slate-500 text-sm p-4 text-center">No recent activity.</p>';
      return;
    }

    feedContainer.innerHTML = data.activities.map(activity => {
      if (activity.type === 'thought') {
        return renderThought(activity, username);
      } else if (activity.type === 'list_update') {
        return renderListUpdate(activity, username, animeDb);
      }
      return '';
    }).join('');

  } catch (error) {
    console.error("Error loading activity feed:", error);
    feedContainer.innerHTML = '<div class="bg-card p-4 rounded-xl text-red-400 text-sm">Error loading activities. Please check the data source path.</div>';
  }
}

function renderThought(activity, username) {
  return `
    <div class="bg-card rounded-xl overflow-hidden shadow-md">
      <div class="p-4 border-b border-slate-800 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <img src="/assets/profile/${username}/avatar.jpg" class="object-cover w-8 h-8 rounded-lg bg-slate-700" onerror="this.src='https://via.placeholder.com/32'">
          <div>
            <p class="text-sm font-semibold text-white">${username} <span class="text-slate-500 font-normal">posted a thought</span></p>
            <p class="text-[10px] text-slate-500 uppercase">${activity.time_relative || 'Recently'}</p>
          </div>
        </div>
      </div>
      <div class="p-6">
        <p class="text-slate-200 leading-relaxed">${activity.content}</p>
      </div>
      <div class="px-6 pb-4 flex items-center space-x-6 text-sm text-slate-500">
        <span class="cursor-pointer hover:text-pink-500 transition-colors"><i class="fa-solid fa-heart mr-2"></i> ${activity.stats?.likes || 0}</span>
        <span class="cursor-pointer hover:text-accent transition-colors"><i class="fa-solid fa-comment mr-2"></i> ${activity.stats?.comments || 0}</span>
        <span class="cursor-pointer hover:text-green-500 transition-colors"><i class="fa-solid fa-share mr-2"></i> ${activity.stats?.shares || 0}</span>
      </div>
    </div>`;
}

function renderListUpdate(activity, username, animeDb) {
  const mediaId = activity.media.id;
  const localCover = `/assets/covers/anime/${mediaId}_medium.jpg`;

  // Calculate progress percent from DB
  const mediaMeta = animeDb[mediaId.toString()] || {};
  const totalEpisodes = mediaMeta.episodes;
  const currentProgress = activity.media.progress || 0;

  let percent = 0;
  let displayTotal = '??';

  if (typeof totalEpisodes === 'number' && totalEpisodes > 0) {
    percent = Math.round((currentProgress / totalEpisodes) * 100);
    displayTotal = totalEpisodes;
  } else {
    // If no episode total is found, set progress to 50%
    percent = 50;
  }

  return `
    <div class="bg-card rounded-xl overflow-hidden shadow-md">
      <div class="p-4 border-b border-slate-800 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <img src="/assets/profile/${username}/avatar.jpg" class="object-cover w-8 h-8 rounded-lg bg-slate-700" onerror="this.src='https://via.placeholder.com/32'">
          <div>
            <p class="text-sm font-semibold text-white">${username} <span class="text-slate-500 font-normal">${activity.action}</span></p>
            <p class="text-[10px] text-slate-500 uppercase">${activity.time_relative || 'Recently'}</p>
          </div>
        </div>
      </div>
      <div class="flex items-center p-4">
        <img src="${localCover}"
             data-media-id="${mediaId}"
             onclick="if(window.openQuickEditor) window.openQuickEditor(${mediaId})"
             class="media-cover w-16 h-24 rounded shadow-lg object-cover cursor-pointer hover:scale-105 transition-transform bg-[#151f2e]"
             onerror="this.onerror=null; this.src='/assets/covers/placeholder_medium.jpg';">
        <div class="ml-4 flex-1">
          <h4 class="text-white font-bold leading-tight cursor-pointer hover:text-accent transition-colors"
              onclick="if(window.openQuickEditor) window.openQuickEditor(${mediaId})">
            ${activity.media.title}
          </h4>
          <p class="text-sm text-slate-400 mt-1">Watched Episode <span class="text-accent font-bold">${currentProgress}/${displayTotal}</span></p>
          <div class="w-full bg-slate-800 h-1 rounded-full mt-3 overflow-hidden">
            <div class="bg-accent h-full transition-all duration-500" style="width: ${percent}%"></div>
          </div>
        </div>
      </div>
    </div>`;
}

// Export to window so profile.html can call it
window.populateActivityFeed = populateActivityFeed;
