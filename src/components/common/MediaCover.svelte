<script lang="ts">
  import { HakoImage } from "../../utils/images";
  import { fetchMediaById } from "../../utils/mediaData";
  import { openQuickEditor } from "../../core/ui.svelte";

  interface Props {
    mediaId: string | number;
    type: string;
    size?: "small" | "medium" | "large";
    class?: string;
    alt?: string;
    onmouseover?: () => void;
  }

  let {
    mediaId,
    type,
    size = "small",
    class: className = "",
    alt = "Cover",
    onmouseover,
  }: Props = $props();

  const sizeClasses = {
    small: "w-12 h-16",
    medium: "aspect-85/115",
    large: "w-40 h-56",
  };

  let loaded = $state(false);

  async function handleOpenEditor() {
    const media = await fetchMediaById(Number(mediaId));
    if (media) openQuickEditor(media, type);
  }
</script>

<div class="relative {sizeClasses[size]} {className}">
  {#if !loaded}
    <div
      class="absolute inset-0 bg-(--surface-elevated) animate-pulse rounded"
    ></div>
  {/if}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_mouse_events_have_key_events -->
  <img
    src={HakoImage.getCover(mediaId, size === "large" ? "large" : "medium")}
    class="w-full h-full object-cover rounded shadow-md cursor-pointer hover:scale-105 transition-transform {loaded
      ? 'opacity-100'
      : 'opacity-0'} transition-opacity"
    {alt}
    loading="lazy"
    onload={() => (loaded = true)}
    onerror={(e) => {
      const img = e.target as HTMLImageElement;
      img.src =
        "https://ik.imagekit.io/HakoImage/covers/placeholder.jpg?tr=w-240,f=webp";
    }}
    onclick={handleOpenEditor}
    {onmouseover}
  />
</div>
