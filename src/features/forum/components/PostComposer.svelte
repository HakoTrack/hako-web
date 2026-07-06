<script lang="ts">
  import PostRenderer from "../../../shared/components/PostRenderer.svelte";
  import type { ForumPost } from "../../../shared/types";

  let {
    onSubmit,
    placeholder = "Write your post...",
    submitLabel = "Post Reply",
    maxLength = 10000,
    isSubmitting = false,
    replyToPosts = [],
    initialContent = "",
    onCancelReply,
    avatars = {} as Record<string, string>,
  } = $props<{
    onSubmit: (content: string) => void;
    placeholder?: string;
    submitLabel?: string;
    maxLength?: number;
    isSubmitting?: boolean;
    replyToPosts?: ForumPost[];
    initialContent?: string;
    onCancelReply?: () => void;
    avatars?: Record<string, string>;
  }>();

  let content = $state(initialContent);
  let showPreview = $state(false);
  let charCount = $derived(content.length);
  let textareaRef: HTMLTextAreaElement | undefined = $state();

  $effect(() => {
    if (initialContent) content = initialContent;
  });

  function handleSubmit() {
    const trimmed = content.trim();
    if (!trimmed || charCount > maxLength || isSubmitting) return;
    onSubmit(trimmed);
    content = "";
  }

  function wrap(before: string, after: string, placeholderText = "") {
    const ta = textareaRef;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = content.slice(start, end) || placeholderText;
    const replacement = before + selected + after;
    content = content.slice(0, start) + replacement + content.slice(end);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = start + before.length;
      ta.selectionEnd = start + before.length + selected.length;
    });
  }

  function insertAtCursor(text: string) {
    const ta = textareaRef;
    if (!ta) return;
    const pos = ta.selectionStart;
    content = content.slice(0, pos) + text + content.slice(ta.selectionEnd);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = pos + text.length;
      ta.selectionEnd = pos + text.length;
    });
  }

  function handleBold() {
    wrap("**", "**", "bold text");
  }

  function handleItalic() {
    wrap("*", "*", "italic text");
  }

  function handleStrikethrough() {
    wrap("~~", "~~", "strikethrough");
  }

  function handleUnderline() {
    wrap("<u>", "</u>", "underlined text");
  }

  function handleInlineCode() {
    wrap("`", "`", "code");
  }

  function handleCodeBlock() {
    insertAtCursor("```\n\n```");
  }

  function handleLink() {
    const ta = textareaRef;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = content.slice(start, end) || "link text";
    const url = prompt("URL:");
    if (url === null) return;
    if (!url.trim()) return;
    const replacement = `[${selected}](${url})`;
    content = content.slice(0, start) + replacement + content.slice(end);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = start + replacement.length;
      ta.selectionEnd = start + replacement.length;
    });
  }

  function handleImage() {
    const ta = textareaRef;
    if (!ta) return;
    const pos = ta.selectionStart;
    const url = prompt("Image URL:");
    if (url === null) return;
    if (!url.trim()) return;
    const alt = prompt("Alt text:") || "image";
    const replacement = `![${alt}](${url})`;
    content =
      content.slice(0, pos) + replacement + content.slice(ta.selectionEnd);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = pos + replacement.length;
      ta.selectionEnd = pos + replacement.length;
    });
  }
</script>

<div class="bg-card p-4 shadow-md">
  {#if replyToPosts.length > 0}
    <div
      class="flex items-center gap-2 mb-3 px-3 py-2 bg-(--hako-accent)/5 rounded-lg border border-(--hako-accent)/10"
    >
      <i class="fa-solid fa-reply-all text-[10px] text-(--hako-accent)"></i>
      <span class="text-xs text-slate-400">
        Replying to
        {replyToPosts
          .map((p: ForumPost) => p.author?.username)
          .filter(Boolean)
          .join(", ")}
      </span>
      {#if onCancelReply}
        <button
          type="button"
          onclick={onCancelReply}
          class="ml-auto text-xs text-slate-500 hover:text-(--hako-fg) transition-colors cursor-pointer"
        >
          <i class="fa-solid fa-times"></i>
        </button>
      {/if}
    </div>
  {/if}

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
        <PostRenderer {content} {avatars} />
      {:else}
        <p class="text-slate-500 text-sm italic">Nothing to preview yet.</p>
      {/if}
    </div>
  {:else}
    <div
      class="flex items-center gap-0.5 px-2 py-1.5 bg-(--hako-bg) border border-(--surface-elevated) border-b-0 rounded-t-lg"
    >
      <button type="button" onclick={handleBold} title="Bold (Ctrl+B)"
        class="w-7 h-7 flex items-center justify-center rounded text-xs text-slate-400 hover:text-(--hako-fg) hover:bg-white/5 transition-colors cursor-pointer">
        <span class="font-bold text-sm">B</span>
      </button>
      <button type="button" onclick={handleItalic} title="Italic (Ctrl+I)"
        class="w-7 h-7 flex items-center justify-center rounded text-xs text-slate-400 hover:text-(--hako-fg) hover:bg-white/5 transition-colors cursor-pointer">
        <span class="italic text-sm">I</span>
      </button>
      <button type="button" onclick={handleStrikethrough} title="Strikethrough"
        class="w-7 h-7 flex items-center justify-center rounded text-xs text-slate-400 hover:text-(--hako-fg) hover:bg-white/5 transition-colors cursor-pointer">
        <span class="line-through text-sm">S</span>
      </button>
      <button type="button" onclick={handleUnderline} title="Underline"
        class="w-7 h-7 flex items-center justify-center rounded text-xs text-slate-400 hover:text-(--hako-fg) hover:bg-white/5 transition-colors cursor-pointer">
        <span class="underline text-sm">U</span>
      </button>

      <div class="w-px h-4 bg-(--surface-elevated) mx-1"></div>

      <button type="button" onclick={handleLink} title="Link"
        class="w-7 h-7 flex items-center justify-center rounded text-xs text-slate-400 hover:text-(--hako-fg) hover:bg-white/5 transition-colors cursor-pointer">
        <i class="fa-solid fa-link text-xs"></i>
      </button>
      <button type="button" onclick={handleImage} title="Image"
        class="w-7 h-7 flex items-center justify-center rounded text-xs text-slate-400 hover:text-(--hako-fg) hover:bg-white/5 transition-colors cursor-pointer">
        <i class="fa-solid fa-image text-xs"></i>
      </button>

      <div class="w-px h-4 bg-(--surface-elevated) mx-1"></div>

      <button type="button" onclick={handleInlineCode} title="Inline code"
        class="w-7 h-7 flex items-center justify-center rounded text-xs text-slate-400 hover:text-(--hako-fg) hover:bg-white/5 transition-colors cursor-pointer">
        <code class="text-xs">`</code>
      </button>
      <button type="button" onclick={handleCodeBlock} title="Code block"
        class="w-7 h-7 flex items-center justify-center rounded text-xs text-slate-400 hover:text-(--hako-fg) hover:bg-white/5 transition-colors cursor-pointer">
        <code class="text-xs font-bold">&#60;&#47;&#62;</code>
      </button>
    </div>
    <textarea
      bind:this={textareaRef}
      bind:value={content}
      {placeholder}
      class="w-full bg-(--hako-bg) border border-(--surface-elevated) rounded-bl-lg rounded-br-lg p-3 text-sm text-(--hako-fg) focus:ring-1 focus:ring-(--hako-accent) outline-none min-h-30 resize-y"
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
