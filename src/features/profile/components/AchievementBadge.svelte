<script lang="ts">
  let {
    tier,
    mediaType,
    class: className = "w-8 h-8",
  }: {
    tier: number;
    mediaType: string;
    class?: string;
  } = $props();

  let shapePath = $derived(
    {
      1: /* Circle */ `<circle cx="24" cy="24" r="20"/>`,
      2: /* Rounded square */ `<rect x="5" y="5" width="38" height="38" rx="9"/>`,
      3: /* Hexagon */ `<path d="M24 5l16.5 9.5v19L24 43 7.5 33.5v-19z"/>`,
      4: /* Star 5-point */ `<path d="M24 4l5.3 10.8 11.9 1.7-8.6 8.4 2 11.7L24 31.4 13.4 36.6l2-11.7-8.6-8.4 11.9-1.7z"/>`,
      5: /* Diamond */ `<polygon points="24,4 44,24 24,44 4,24"/>`,
      6: /* Octagon */ `<path d="M17 6h14l11 11v14l-11 11H17L6 31V17z"/>`,
      7: /* Shield */ `<path d="M9 8h30v14q0 13-15 23Q9 35 9 22z"/>`,
      8: /* Crown */ `<path d="M9 34V16l5 6 10-14 10 14 5-6v18z"/>`,
    }[tier] ?? `<circle cx="24" cy="24" r="20"/>`,
  );

  let symbolPath = $derived(
    {
      anime: /* Play triangle */ `<polygon points="20,16 33,24 20,32" fill="white"/>`,
      manga: /* Open book */ `<path d="M16 14v20l8-4 8 4V14l-8 4z" fill="none" stroke="white" stroke-width="2.5" stroke-linejoin="round"/>`,
      light_novel: /* Quill */ `<path d="M18 34l4-12 10-10c1.5-1.5 3.5-1.5 5 0s1.5 3.5 0 5L27 27l-12 4z" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
      visual_novels: /* Chat bubble */ `<path d="M14 16a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-8l-6 5v-5H16a2 2 0 01-2-2z" fill="none" stroke="white" stroke-width="2.2" stroke-linejoin="round"/>`,
    }[mediaType] ?? ``,
  );
</script>

<svg viewBox="0 0 48 48" class={className} xmlns="http://www.w3.org/2000/svg">
  <g fill="currentColor">{@html shapePath}</g>
  {@html symbolPath}
</svg>
