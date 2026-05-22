<script lang="ts">
  import { supabase } from "../../utils/supabase.js";
  import { AuthService } from "../../core/auth.js";
  import { FeedService } from "../../services/feedService.ts";

  let { targetProfileId, onPostCreated } = $props();
  let content = $state("");
  let isPosting = $state(false);
  let textareaRef = $state(null);

  function isImageUrl(url: string): boolean {
    return /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url.trim());
  }

  async function handlePaste(e: ClipboardEvent) {
    const text = e.clipboardData?.getData("text");
    if (text && isImageUrl(text)) {
      e.preventDefault();
      insertMarkdown("![](", text.trim() + ")");
    }
  }

  async function handleImageButtonClick() {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText && isImageUrl(clipboardText)) {
        insertMarkdown("![](", clipboardText.trim() + ")");
      } else {
        insertMarkdown("![](", ")");
      }
    } catch (err) {
      insertMarkdown("![](", ")");
    }
  }

  function insertMarkdown(prefix, suffix = "") {
    if (!textareaRef) return;
    const start = textareaRef.selectionStart;
    const end = textareaRef.selectionEnd;
    const text = content;
    const selected = text.substring(start, end);
    const before = text.substring(0, start);
    const after = text.substring(end);
    content = before + prefix + selected + suffix + after;
    textareaRef.focus();
    // Reset cursor position
    textareaRef.setSelectionRange(start + prefix.length, end + prefix.length);
  }

  async function handlePost() {
    if (!content.trim()) return;
    isPosting = true;

    try {
      const user = await AuthService.getCurrentUser();
      if (!user) throw new Error("Must be logged in to post.");

      await FeedService.createThoughtPost(user.id, targetProfileId, content);

      content = "";
      if (onPostCreated) onPostCreated();
    } catch (err) {
      console.error("Error posting thought:", err);
    } finally {
      isPosting = false;
    }
  }
</script>

<div class="bg-card p-4 rounded-xl shadow-md mb-6">
  <textarea
    bind:this={textareaRef}
    bind:value={content}
    onpaste={handlePaste}
    placeholder="What memory are you storing in the box? (o˘◡˘o)"
    class="w-full bg-(--hako-bg) border border-(--c0) rounded-lg p-3 text-sm text-(--hako-fg) focus:ring-1 focus:ring-(--surface-elevated) outline-none min-h-20"
  ></textarea>
  <div class="flex justify-between items-center mt-3">
    <div class="flex gap-2">
      <button
        type="button"
        onclick={() => insertMarkdown("**", "**")}
        class="p-2 text-slate-500 hover:text-white transition-colors"
        title="Bold"
      >
        <i class="fa-solid fa-bold text-xs"></i>
      </button>
      <button
        type="button"
        onclick={() => insertMarkdown("*", "*")}
        class="p-2 text-slate-500 hover:text-white transition-colors"
        title="Italic"
      >
        <i class="fa-solid fa-italic text-xs"></i>
      </button>
      <button
        type="button"
        onclick={() => insertMarkdown("[", "](url)")}
        class="p-2 text-slate-500 hover:text-white transition-colors"
        title="Link"
      >
        <i class="fa-solid fa-link text-xs"></i>
      </button>
      <button
        type="button"
        onclick={handleImageButtonClick}
        class="p-2 text-slate-500 hover:text-white transition-colors"
        title="Image"
      >
        <i class="fa-solid fa-image text-xs"></i>
      </button>
    </div>
    <button
      onclick={handlePost}
      disabled={isPosting || !content.trim()}
      class="bg-accent hover:bg-opacity-90 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer"
    >
      {isPosting ? "Posting..." : "Post Thought"}
    </button>
  </div>
</div>
