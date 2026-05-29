<script lang="ts">
  let {
    label,
    value,
    icon,
    color = "var(--hako-accent)",
  } = $props<{
    label: string;
    value: string | number;
    icon: string;
    color?: string;
  }>();
</script>

<div
  class="bg-card p-4 rounded-xl border border-(--surface-elevated) flex items-center gap-4"
>
  <div style="color: {color}">
    <i class="fa-solid {icon} text-xl"></i>
  </div>
  <div>
    <div class="text-slate-400 text-xs font-bold uppercase tracking-wider">
      {label}
    </div>
    <div class="text-xl font-bold text(--hako-fg)">{value}</div>
  </div>
</div>
