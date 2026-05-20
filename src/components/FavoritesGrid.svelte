<script>
  import { openQuickEditor } from "../core/ui.svelte.ts";
  import { onMount } from "svelte";
  import { HakoImage } from "../utils/images";
  import { fetchMediaById } from "../utils/mediaData";
  import { FavoritesService } from "../services/favoritesService.ts";

  let { profileId } = $props();

  let animeIds = $state([]);
  let isLoading = $state(true);

  onMount(async () => {
    try {
      // Centralized fetch via FavoritesService
      const ids = await FavoritesService.syncFavorites(profileId);
      animeIds = ids;
    } catch (e) {
      console.error("Error loading favorites:", e);
    } finally {
      isLoading = false;
    }
  });

  async function handleOpenEditor(id) {
    const media = await fetchMediaById(id);
    if (media) openQuickEditor(media, "anime");
  }
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
          <!-- svelte-ignore a11y_mouse_events_have_key_events -->
          <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <img
            src={HakoImage.getCover(id, "medium")}
            class="media-cover rounded w-full aspect-85/115 object-cover cursor-pointer hover:scale-105 transition-transform bg-[#151f2e]"
            data-media-id={id}
            onmouseover={() => HakoImage.prefetchBanner(id)}
            onclick={() => handleOpenEditor(id)}
            alt="Anime {id}"
            onerror={(e) =>
              (e.target.src =
                "https://ik.imagekit.io/HakoImage/covers/placeholder.jpg?tr=w-240,f=webp")}
          />
        {/each}
      </div>
    </div>
  {/if}
</div>
