<script lang="ts">
  import { CommentService } from "../../services/commentService";
  import { AuthService } from "../../core/auth";
  import { getVisibleCharacterCount } from "../../utils/markdown";
  import CommentItem from "./CommentItem.svelte";
  import type { Comment } from "../../types/index";

  let {
    postId,
    onCommentCountChange,
  }: { postId: string; onCommentCountChange: (newCount: number) => void } =
    $props();

  let comments = $state<Comment[]>([]);
  let newComment = $state("");
  let charCount = $derived(getVisibleCharacterCount(newComment));
  let isLoading = $state(true);
  let isSubmitting = $state(false);

  $effect(() => {
    loadComments();
  });

  async function loadComments() {
    isLoading = true;
    const result = await CommentService.getComments(postId);
    if (result.success) {
      comments = result.data;
    }
    isLoading = false;
  }

  async function handleSubmit() {
    const user = await AuthService.getCurrentUser();
    if (!user || !newComment.trim() || charCount > 450) return;

    isSubmitting = true;
    const result = await CommentService.createComment(
      postId,
      user.id,
      newComment.trim(),
    );
    if (result.success) {
      newComment = "";
      await loadComments();
      onCommentCountChange(comments.length);
    } else {
      alert("Failed to post comment.");
    }
    isSubmitting = false;
  }
</script>

<div
  class="space-y-4 pt-4 border-t border-slate-800/50 mt-4 bg-(--surface-dim)/30 p-4 rounded-b-xl"
>
  <!-- Comment Input -->
  <div class="flex gap-3">
    <textarea
      bind:value={newComment}
      placeholder="Write a comment..."
      class="flex-1 bg-(--hako-bg) border border-(--surface-elevated) rounded-lg p-3 text-sm text-(--hako-fg) focus:ring-1 focus:ring-(--hako-accent) outline-none min-h-[60px]"
    ></textarea>
    <div class="flex flex-col gap-2">
      <span
        class="text-xs text-center {charCount > 450
          ? 'text-red-500'
          : 'text-slate-500'}"
      >
        {charCount}/450
      </span>
      <button
        onclick={handleSubmit}
        disabled={isSubmitting || !newComment.trim() || charCount > 450}
        class="bg-accent hover:bg-opacity-90 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all"
      >
        {isSubmitting ? "..." : "Send"}
      </button>
    </div>
  </div>

  <!-- Comment List -->
  {#if isLoading}
    <div class="flex items-center justify-center py-4">
      <i class="fa-solid fa-circle-notch fa-spin text-accent text-lg"></i>
    </div>
  {:else}
    <div class="space-y-4">
      {#each comments as comment (comment.id)}
        <CommentItem {comment} />
      {:else}
        <p class="text-slate-500 text-xs text-center py-2">No comments yet.</p>
      {/each}
    </div>
  {/if}
</div>
