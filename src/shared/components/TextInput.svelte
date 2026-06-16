<script lang="ts">
  let {
    value = $bindable(""),
    placeholder = "",
    label = "",
    type = "text",
    name = "",
    autocomplete = "",
    maxlength,
    class: className = "",
  } = $props<{
    value?: string;
    placeholder?: string;
    label?: string;
    type?: string;
    name?: string;
    autocomplete?: string;
    maxlength?: string | number;
    class?: string;
  }>();
</script>

<div class="w-full {className}">
  {#if label}
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <label
      class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block"
    >
      {label}
    </label>
  {/if}
  <input
    {type}
    {placeholder}
    {name}
    {autocomplete}
    {maxlength}
    bind:value
    class="w-full h-10 bg-(--surface-dim) border border-(--c8) rounded-xl px-3 text-sm text-(--hako-fg) placeholder:text-(--c8) focus:border-(--hako-accent) outline-none transition-colors"
  />
</div>
