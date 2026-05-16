import { fetchAnimeByIds, fetchUserAnimeList } from './animeData.js';
import { HakoImage } from './images.js';

const getScoreColor = (score) => {
  if (!score) return 'text-slate-500';
  if (score >= 9) return 'text-green-400';
  if (score >= 8) return 'text-blue-400';
  if (score >= 7) return 'text-slate-400';
  if (score >= 5) return 'text-yellow-400';
  return 'text-red-400';
};

export const renderMediaList = async function (type = 'anime', containerId = 'anime-list-container', sortBy = 'Title', filterStatus = 'all', profileId = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const config = {
    anime: {
      activeLabel: 'Watching',
      sidebarId: 'anime-categories-sidebar'
    },
    manga: {
      activeLabel: 'Reading',
      sidebarId: 'manga-categories-sidebar'
    }
  }[type];

  try {
    let listDataEntries = [];
    let metadata;

    if (type === 'anime') {
      if (!profileId) throw new Error("No profileId provided for anime list fetch.");
      listDataEntries = await fetchUserAnimeList(profileId);
      const ids = listDataEntries.map(item => item.id);
      metadata = await fetchAnimeByIds(ids);
    } else {
      const listResponse = await fetch(config.dataPath);
      if (!listResponse.ok) throw new Error(`Failed to fetch user list`);
      const listJson = await listResponse.json();
      listDataEntries = listJson.data || listJson;

      const metaResponse = await fetch(config.metaPath);
      if (!metaResponse.ok) throw new Error(`Failed to fetch metadata`);
      metadata = await metaResponse.json();
    }

    const statusGroups = [
      { id: 'current', label: config.activeLabel, color: 'bg-green-500' },
      { id: 'completed', label: 'Completed', color: 'bg-sky-500' },
      { id: 'paused', label: 'Paused', color: 'bg-orange-500' },
      { id: 'dropped', label: 'Dropped', color: 'bg-red-500' },
      { id: 'planning', label: 'Planning', color: 'bg-slate-500' }
    ];

    // Update Sidebar UI & Counters
    const sidebar = document.getElementById(config.sidebarId) || document.getElementById('media-categories-sidebar');
    if (sidebar) {
      const allBtnCount = sidebar.querySelector('button[data-status="all"] .count');
      if (allBtnCount) allBtnCount.innerText = listDataEntries.length;

      statusGroups.forEach(g => {
        const count = listDataEntries.filter(item => item.status.toLowerCase() === g.id).length;
        const countEl = sidebar.querySelector(`button[data-status="${g.id}"] .count`);
        if (countEl) countEl.innerText = count;
      });

      sidebar.querySelectorAll('button[data-status]').forEach(btn => {
        const isActive = btn.getAttribute('data-status') === filterStatus;
        if (isActive) {
          btn.className = "category-btn flex items-center justify-between px-4 py-3 text-sm font-medium text-white bg-slate-800/50 border-l-4 border-accent transition-all w-full";
        } else {
          btn.className = "category-btn flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/30 border-l-4 border-transparent transition-all w-full";
        }
      });
    }

    container.innerHTML = '';

    statusGroups.forEach(group => {
      if (filterStatus !== 'all' && filterStatus !== group.id) return;

      let items = listDataEntries.filter(item => item.status.toLowerCase() === group.id);
      if (items.length === 0) return;

      items.sort((a, b) => {
        const metaA = metadata[a.id.toString()] || {};
        const metaB = metadata[b.id.toString()] || {};
        const titleA = (metaA.title?.romaji || a.title || '').toLowerCase();
        const titleB = (metaB.title?.romaji || b.title || '').toLowerCase();

        switch (sortBy) {
          case 'Title': return titleA.localeCompare(titleB);
          case 'Score': return (b.score || 0) - (a.score || 0);
          case 'Progress': return (b.progress || 0) - (a.progress || 0);
          default: return new Date(b.updatedAt) - new Date(a.updatedAt);
        }
      });

      const section = document.createElement('section');
      section.className = 'space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300';
      section.innerHTML = `
        <div class="flex items-center space-x-3 mb-6">
          <div class="w-1.5 h-6 ${group.color} rounded-full"></div>
          <h2 class="text-lg font-bold text-white uppercase tracking-wider">${group.label}</h2>
        </div>
        <div class="bg-card rounded-xl overflow-hidden shadow-sm">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-800">
                <th class="px-4 py-3 font-bold w-16 text-center"></th>
                <th class="px-4 py-3 font-bold">Title</th>
                <th class="px-4 py-3 font-bold text-center">Score</th>
                <th class="px-4 py-3 font-bold text-center">Progress</th>
                <th class="px-4 py-3 font-bold text-center">Format</th>
              </tr>
            </thead>
            <tbody id="group-${group.id}"></tbody>
          </table>
        </div>
      `;

      const tbody = section.querySelector(`#group-${group.id}`);
      items.forEach(item => {
        const meta = metadata[item.id.toString()] || {};
        const total = type === 'manga' ? (meta.chapters || item.total || '?') : (meta.episodes || item.total || '?');
        const displayTitle = meta.title?.romaji || item.title;
        const localImagePath = HakoImage.getCover(type, item.id, 'small');

        const row = document.createElement('tr');
        row.className = 'group hover:bg-slate-800/30 transition-colors border-b border-slate-800/50 last:border-0';
        row.innerHTML = `
          <td class="p-2 text-center">
            <img loading=lazy src="${localImagePath}" onerror="this.onerror=null; this.src='${item.image}';"
                 data-media-id="${item.id}"
                 onclick="if(window.openQuickEditor) window.openQuickEditor(${item.id})"
                 onmouseover="window.HakoImage.prefetchBanner('${type}', ${item.id})"
                 class="media-cover w-12 h-16 object-cover rounded shadow-md group-hover:scale-105 transition-transform inline-block cursor-pointer">
          </td>
          <td class="px-4 py-3">
            <div class="text-sm font-bold text-slate-200 group-hover:text-accent transition-colors cursor-pointer"
                 onclick="if(window.openQuickEditor) window.openQuickEditor(${item.id})">${displayTitle}</div>
            <div class="text-[10px] text-slate-500 mt-1 uppercase">${meta.genres?.slice(0, 3).join(' • ') || ''}</div>
          </td>
          <td class="px-4 py-3 text-center">
           <span class="text-sm font-mono ${getScoreColor(item.score)}">${item.score?.toFixed(1) || '—'}</span>
          </td>
          <td class="px-4 py-3 text-center font-mono text-sm">
            <span class="text-white">${item.progress}</span><span class="text-slate-600 mx-1">/</span><span class="text-slate-500 text-xs">${total}</span>
          </td>
          <td class="px-4 py-3 text-center">
            <span class="text-[10px] font-bold bg-[#0b1622] px-2 py-1 rounded text-slate-400 border border-slate-800">${meta.format || item.type || 'TV'}</span>
          </td>
        `;
        tbody.appendChild(row);
      });
      container.appendChild(section);
    });

    if (container.innerHTML === '') {
      container.innerHTML = `< div class="p-10 text-center font-['Arial',sans-serif] text-[20px] text-slate-500" > This list is empty... (≖､≖╬)</div > `;
    }

  } catch (err) {
    console.error(err);
    container.innerHTML = `< div class="p-10 text-center font-['Arial',sans-serif] text-[20px] text-slate-500" > This list is empty... (≖､≖╬)</div > `;
  }
};
