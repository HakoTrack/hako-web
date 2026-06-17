<script lang="ts">
  import PostRenderer from "../../../shared/components/PostRenderer.svelte";

  let {
    onSubmit,
    placeholder = "Write your post...",
    submitLabel = "Post Reply",
    maxLength = 10000,
    isSubmitting = false,
  } = $props<{
    onSubmit: (content: string) => void;
    placeholder?: string;
    submitLabel?: string;
    maxLength?: number;
    isSubmitting?: boolean;
  }>();

  let content = $state("");
  let showPreview = $state(false);
  let charCount = $derived(content.length);

  function handleSubmit() {
    const trimmed = content.trim();
    if (!trimmed || charCount > maxLength || isSubmitting) return;
    onSubmit(trimmed);
    content = "";
  }
</script>

<div class="bg-card p-4 shadow-md">
  <div class="flex items-center justify-between mb-3">
    <h3 class="text-sm font-bold text-(--hako-fg)">
      {submitLabel}
    </h3>
    <div class="flex items-center gap-3">
      <button
        type="button"
        onclick={() => (showPreview = !showPreview)}
        class="text-xs text-slate-400 hover:text-(--hako-accent) transition-colors"
      >
        <i class="fa-solid fa-eye mr-1"></i>
        {showPreview ? "Edit" : "Preview"}
      </button>
      <span
        class="text-xs {charCount > maxLength
          ? 'text-red-500'
          : 'text-slate-500'}"
      >
        {charCount}/{maxLength}
      </span>
    </div>
  </div>

  {#if showPreview}
    <div
      class="bg-(--hako-bg) rounded-lg p-4 min-h-30 border border-(--surface-elevated)"
    >
      {#if content.trim()}
        <PostRenderer {content} />
      {:else}
        <p class="text-slate-500 text-sm italic">Nothing to preview yet.</p>
      {/if}
    </div>
  {:else}
    <textarea
      bind:value={content}
      {placeholder}
      class="w-full bg-(--hako-bg) border border-(--surface-elevated) rounded-lg p-3 text-sm text-(--hako-fg) focus:ring-1 focus:ring-(--hako-accent) outline-none min-h-30 resize-y"
    ></textarea>
  {/if}

  <div class="flex justify-end mt-3">
    <button
      type="button"
      onclick={handleSubmit}
      disabled={!content.trim() || charCount > maxLength || isSubmitting}
      class="px-5 py-2 rounded-lg font-bold text-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed bg-(--hako-accent) text-(--hako-bg) hover:opacity-90"
    >
      {#if isSubmitting}
        <i class="fa-solid fa-circle-notch fa-spin mr-2"></i>
      {/if}
      {submitLabel}
    </button>
  </div>
</div>
