<script lang="ts">
  let {
    src,
    name,
    class: className = "",
    onclick,
  } = $props<{
    src?: string | null;
    name: string;
    class?: string;
    onclick?: (e: MouseEvent) => void;
  }>();

  let imgFailed = $state(false);

  function getInitials(n: string): string {
    return n
      .split(/[\s_]+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  const colors = [
    "var(--c1)",
    "var(--c2)",
    "var(--c3)",
    "var(--c4)",
    "var(--c5)",
    "var(--c6)",
    "var(--c7)",
    "var(--c9)",
    "var(--c10)",
    "var(--c11)",
    "var(--c12)",
    "var(--c13)",
    "var(--c14)",
    "var(--c15)",
  ];

  function pickColor(n: string): string {
    let hash = 0;
    for (let i = 0; i < n.length; i++) {
      hash = n.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }
</script>

{#if src && !imgFailed}
  <img
    {src}
    alt={name}
    class={className}
    loading="lazy"
    {onclick}
    onerror={() => (imgFailed = true)}
  />
{:else}
  <div
    class="inline-flex items-center justify-center rounded-full font-bold select-none overflow-hidden {className}"
    style="background: {pickColor(name)}; color: var(--hako-bg);"
    {onclick}
  >
    {getInitials(name)}
  </div>
{/if}
