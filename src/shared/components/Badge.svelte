<script lang="ts">
  interface Props {
    label?: string;
    variant?: "genre" | "vibe";
    loading?: boolean;
  }

  let { label = "", variant = "genre", loading = false }: Props = $props();

  const baseClasses =
    "text-[10px] px-3 py-2 rounded-full font-bold uppercase tracking-wider inline-flex items-center leading-none";
  const variantClasses =
    variant === "genre"
      ? "bg-[var(--c12)]/15 text-[var(--c12)]"
      : "bg-[var(--c13)]/10 text-[var(--c13)] border border-[var(--c13)]/20";

  const skeletonClasses =
    "bg-(--surface-elevated) animate-pulse text-transparent";
  const skeletonBorder = variant === "vibe" ? "border border-transparent" : "";
</script>

{#if loading}
  <span class="{baseClasses} {skeletonClasses} {skeletonBorder} select-none">
    {label || "Loading"}
  </span>
{:else}
  <span class="{baseClasses} {variantClasses}">
    {label}
  </span>
{/if}
