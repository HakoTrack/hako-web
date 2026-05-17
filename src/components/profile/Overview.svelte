<script>
  import { onMount } from "svelte";
  import FavoritesGrid from "../FavoritesGrid.svelte";
  import FeedWrapper from "../feed/FeedWrapper.svelte";
  import { fetchMediaByIds } from "../../utils/mediaData.js";

  let { profileData } = $props();
  let metadata = $state({});

  const statusGroups = [
    { id: "current", label: "Watching", color: "bg-green-500" },
    { id: "completed", label: "Completed", color: "bg-sky-500" },
    { id: "paused", label: "Paused", color: "bg-orange-500" },
    { id: "dropped", label: "Dropped", color: "bg-red-500" },
    { id: "planning", label: "Planning", color: "bg-slate-500" },
  ];

  let statusDistribution = $derived.by(() => {
    const list = profileData?.animeList || [];
    const total = list.length;
    return statusGroups.map((group) => {
      const count = list.filter(
        (i) => (i.status || "").toLowerCase() === group.id,
      ).length;
      return {
        ...group,
        count,
        percent: total > 0 ? (count / total) * 100 : 0,
      };
    });
  });

  let stats = $derived.by(() => {
    const list = profileData?.animeList || [];
    const total = list.length;

    let totalMinutes = 0;
    let totalScore = 0;
    let scoredCount = 0;

    list.forEach((entry) => {
      const meta = metadata[entry.media_id.toString()] || {};
      const duration = Number(meta.duration || 0);
      const progress = Number(entry.progress || 0);

      if (duration > 0 && progress > 0) {
        totalMinutes += progress * duration;
      }
      if (entry.score && entry.score > 0) {
        totalScore += entry.score;
        scoredCount++;
      }
    });

    return {
      total,
      daysWatched: (totalMinutes / 1440).toFixed(1),
      meanScore:
        scoredCount > 0 ? (totalScore / scoredCount).toFixed(1) : "0.0",
    };
  });

  onMount(async () => {
    if (profileData?.animeList) {
      const ids = profileData.animeList.map((a) => a.media_id);
      metadata = await fetchMediaByIds(ids, "anime");
    }
  });
</script>

<div class="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
  <!-- LEFT COLUMN: Sidebar (About Me + Favorites) -->
  <div class="lg:col-span-4 space-y-8">
    <div class="bg-card p-6 rounded-xl shadow-md">
      <h3 class="text-white font-bold mb-4 flex items-center">
        <i class="fa-solid fa-user-tag text-accent mr-2"></i> About Me
      </h3>
      <p class="text-sm leading-relaxed text-slate-400 mb-4">
        {profileData?.about_me || "No description provided."}
      </p>
      <div
        class="space-y-3 pt-4 border-t border-slate-800 text-xs uppercase tracking-wider font-semibold text-slate-500"
      >
        <div class="flex justify-between">
          <span>Joined</span><span class="text-white">May 13th, 2026</span>
        </div>
        <div class="flex justify-between">
          <span>Location</span><span class="text-white">Tokyo, JP</span>
        </div>
        <div class="flex justify-between">
          <span>Favorite Studio</span><span class="text-white"
            >Kyoto Animation</span
          >
        </div>
      </div>
      <div
        class="mt-6 pt-6 border-t border-slate-800 flex justify-between items-center px-2"
      >
        <div class="text-center">
          <div class="text-lg font-bold text-white">142</div>
          <div
            class="text-[10px] uppercase text-slate-500 font-bold tracking-tighter"
          >
            Followers
          </div>
        </div>
        <div class="h-8 w-px bg-slate-800"></div>
        <div class="text-center">
          <div class="text-lg font-bold text-white">89</div>
          <div
            class="text-[10px] uppercase text-slate-500 font-bold tracking-tighter"
          >
            Following
          </div>
        </div>
        <div class="h-8 w-px bg-slate-800"></div>
        <div class="text-center">
          <div class="text-lg font-bold text-white">12</div>
          <div
            class="text-[10px] uppercase text-slate-500 font-bold tracking-tighter"
          >
            Reviews
          </div>
        </div>
        <div class="h-8 w-px bg-slate-800"></div>
        <div class="text-center">
          <div class="text-lg font-bold text-white">21</div>
          <div
            class="text-[10px] uppercase text-slate-500 font-bold tracking-tighter"
          >
            Collections
          </div>
        </div>
      </div>
    </div>

    <!-- Heatmap -->
    <div class="bg-card p-6 rounded-xl shadow-md">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-white font-bold">Activity Heatmap</h3>
        <span class="text-xs text-slate-500">1,245 updates in 2026</span>
      </div>
      <div class="overflow-x-auto scrollbar-hide">
        <div id="heatmap" class="flex gap-0.75 min-w-70 lg:min-w-0"></div>
      </div>
      <div
        class="flex items-center justify-end mt-4 space-x-2 text-[10px] text-slate-500"
      >
        <span>Less</span>
        <div class="heatmap-cell level-0 w-3 h-3 bg-slate-800"></div>
        <div class="heatmap-cell level-1 w-3 h-3 bg-green-900"></div>
        <div class="heatmap-cell level-2 w-3 h-3 bg-green-700"></div>
        <div class="heatmap-cell level-3 w-3 h-3 bg-green-500"></div>
        <div class="heatmap-cell level-4 w-3 h-3 bg-green-300"></div>
        <span>More</span>
      </div>
    </div>

    <FavoritesGrid profileId={profileData.id} />
  </div>

  <!-- RIGHT COLUMN: Content (Activity Feed) -->
  <div class="lg:col-span-5 space-y-8">
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h3 class="text-white font-bold text-lg">Activity Feed</h3>
        <div class="text-sm text-accent cursor-pointer hover:underline">
          View All
        </div>
      </div>
      <FeedWrapper profileId={profileData.id} />
    </div>
  </div>

  <!-- FAR RIGHT COLUMN: List Stats + Taste Profile -->
  <div class="lg:col-span-3 space-y-8">
    <div class="bg-card p-6 rounded-xl shadow-md">
      <h3 class="text-white font-bold mb-4 flex items-center">
        <i class="fa-solid fa-chart-simple text-accent mr-2"></i> List Stats
      </h3>
      <div class="space-y-6">
        <!-- Anime Stats -->
        <div class="border-b border-slate-800 pb-4">
          <h4
            class="text-[10px] uppercase text-accent font-bold mb-2 tracking-widest"
          >
            Anime
          </h4>

          <div class="flex justify-between text-xs mb-1">
            <span>Total</span><span class="text-white">{stats.total}</span>
          </div>
          <div class="flex justify-between text-xs mb-1">
            <span>Days Watched</span><span class="text-white"
              >{stats.daysWatched}</span
            >
          </div>
          <div class="flex justify-between text-xs mb-4">
            <span>Mean Score</span><span class="text-white font-bold"
              >{stats.meanScore}</span
            >
          </div>

          <!-- Bar Graph -->
          <div
            class="h-2 w-full bg-slate-800 rounded-full flex overflow-hidden"
          >
            {#each statusDistribution as group}
              {#if group.percent > 0}
                <div
                  class={group.color}
                  style="width: {group.percent}%"
                  title="{group.label}: {group.count}"
                ></div>
              {/if}
            {/each}
          </div>
        </div>
        <!-- Manga Stats (Placeholder) -->
        <div class="border-b border-slate-800 pb-4">
          <h4
            class="text-[10px] uppercase text-accent font-bold mb-2 tracking-widest"
          >
            Manga
          </h4>
          <div class="flex justify-between text-xs mb-1">
            <span>Total</span><span class="text-white">156</span>
          </div>
          <div class="flex justify-between text-xs mb-1">
            <span>Chapters</span><span class="text-white">4,280</span>
          </div>
          <div class="flex justify-between text-xs">
            <span>Mean Score</span><span class="text-white font-bold">7.9</span>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-card p-6 rounded-xl shadow-md">
      <h3 class="text-white font-bold mb-4 flex items-center">
        <i class="fa-solid fa-brain text-accent mr-2"></i> Taste Profile
      </h3>
      <div class="pt-2">
        <div class="h-50 w-full"><canvas id="genreChart"></canvas></div>
      </div>
      <div
        class="grid grid-cols-2 gap-2 mt-6 text-[9px] uppercase tracking-tighter text-slate-500 font-bold"
      >
        <div class="flex items-center">
          <i class="fa-solid fa-ghost mr-1 text-accent w-4 text-center"></i> Speculative
        </div>
        <div class="flex items-center">
          <i class="fa-solid fa-bolt mr-1 text-accent w-4 text-center"></i> Visceral
        </div>
        <div class="flex items-center">
          <i class="fa-solid fa-brain mr-1 text-accent w-4 text-center"></i> Cerebral
        </div>
        <div class="flex items-center">
          <i class="fa-solid fa-heart-pulse mr-1 text-accent w-4 text-center"
          ></i> Emotive
        </div>
        <div class="flex items-center">
          <i class="fa-solid fa-users mr-1 text-accent w-4 text-center"></i> Interpersonal
        </div>
        <div class="flex items-center">
          <i class="fa-solid fa-face-smile mr-1 text-accent w-4 text-center"
          ></i> Lighthearted
        </div>
      </div>
    </div>
  </div>
</div>
