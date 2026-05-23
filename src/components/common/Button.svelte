<script>
  let {
    children,
    variant = "primary",
    align = "center",
    class: className = "",
    ...rest
  } = $props();

  const baseClass =
    "px-6 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center";

  const alignments = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
  };

  const variants = {
    primary:
      "bg-[var(--hako-accent)] text-[var(--hako-bg)] hover:opacity-90 shadow-lg shadow-[var(--hako-accent)/20]",
    secondary:
      "bg-white/5 backdrop-blur-xl text-white border border-white/10 hover:bg-white/10",
    danger:
      "bg-[var(--c1)] text-white hover:opacity-90 shadow-lg shadow-[var(--c1)/20]",
  };
</script>

<button
  {...rest}
  class="{baseClass} {alignments[align]} {variants[variant]} {className}"
>
  {@render children()}
</button>
