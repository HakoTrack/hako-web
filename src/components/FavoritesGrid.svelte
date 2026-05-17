<script>
  import { onMount } from "svelte";
  import { supabase } from "../utils/supabase.js";
  import { HakoImage } from "../utils/images.js";
  import { ui } from "../core/ui.svelte.js";

  let { profileId } = $props();

  let animeIds = $state([]);
  let isLoading = $state(true);

  onMount(async () => {
    try {
      const { data, error } = await supabase
        .from("profile_favorites")
        .select("anime_id")
        .eq("profile_id", profileId)
        .order("id", { ascending: true });

      if (error) throw error;

      animeIds = data.map((f) => f.anime_id);
      ui.setFavorites(animeIds);
    } catch (e) {
      console.error("Error loading favorites:", e);
    } finally {
      isLoading = false;
    }
  });
</script>

<div class="bg-card p-6 rounded-xl shadow-md space-y-6">
  <h3 class="text-white font-bold flex items-center mb-4">
    <i class="fa-solid fa-heart text-accent mr-2"></i> Favorites
  </h3>

  {#if !isLoading && animeIds.length > 0}
    <div id="fav-anime-section">
      <h4
        class="text-[10px] uppercase text-slate-500 font-bold mb-3 tracking-widest"
      >
        Anime
      </h4>
      <div id="fav-anime-grid" class="grid grid-cols-5 gap-2">
        {#each animeIds as id}
          <img
            src={HakoImage.getCover("anime", id, "medium")}
            class="media-cover rounded w-full aspect-85/115 object-cover cursor-pointer hover:scale-105 transition-transform bg-[#151f2e]"
            data-media-id={id}
            onmouseover={() => HakoImage.prefetchBanner("anime", id)}
            onclick={() => window.openQuickEditor(id)}
            alt="Anime {id}"
            onerror={(e) =>
              (e.target.src = "/assets/covers/placeholder_medium.jpg")}
          />
        {/each}
      </div>
    </div>
  {/if}
</div>
