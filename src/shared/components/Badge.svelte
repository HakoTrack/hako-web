<script lang="ts">
  interface Props {
    label: string;
    variant?: "genre" | "vibe";
  }

  let { label, variant = "genre" }: Props = $props();
</script>

<span
  class="text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider
    {variant === 'genre'
    ? 'bg-[var(--c12)]/15 text-[var(--c12)]'
    : 'bg-[var(--c13)]/10 text-[var(--c13)] border border-[var(--c13)]/20'}"
>
  {label}
</span>
