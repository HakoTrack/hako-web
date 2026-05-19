<script>
  import { supabase } from "../../utils/supabase.js";
  import { AuthService } from "../../core/auth.js";
  import { FeedService } from "../../services/feedService.ts";

  let { targetProfileId, onPostCreated } = $props();
  let content = $state("");
  let isPosting = $state(false);

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
    bind:value={content}
    placeholder="What memory are you storing in the box? (o˘◡˘o)"
    class="w-full bg-[#0b1622] border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-1 focus:ring-accent outline-none min-h-20"
  ></textarea>
  <div class="flex justify-end mt-3">
    <button
      onclick={handlePost}
      disabled={isPosting || !content.trim()}
      class="bg-accent hover:bg-opacity-90 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer"
    >
      {isPosting ? "Posting..." : "Post Thought"}
    </button>
  </div>
</div>
