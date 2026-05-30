<script lang="ts">
  import type { Toast } from "$utils/toast";
  import { toasts } from "$utils/toast";

  export let toast: Toast;

  const baseClasses =
    "px-5 py-3 rounded-xl shadow-xl pointer-events-auto transition-all duration-300 transform translate-y-0 opacity-100 flex items-center justify-between min-w-xs bg-card border";

  // Use site variables for colors where possible
  const typeClasses: Record<string, string> = {
    success: "border-(--c10)/50 text-(--c10)",
    error: "border-(--c9)/50 text-(--c9)",
    info: "border-(--hako-fg)/50 text-(--hako-fg)",
    warning: "border-(--c11)/50 text-(--c11)",
  };
</script>

<div class="{baseClasses} {typeClasses[toast.type]} border">
  <span class="text-sm font-medium">{toast.message}</span>
  <button
    on:click={() => toasts.remove(toast.id)}
    class="ml-4 opacity-50 hover:opacity-100 transition-opacity hidden"
  >
    &times;
  </button>
</div>
