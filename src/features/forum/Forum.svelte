<script lang="ts">
  import { onMount } from "svelte";
  import { AuthService } from "../../core/auth";
  import { ForumCategoryService } from "./services/forumCategoryService";
  import { ForumThreadService } from "./services/forumThreadService";
  import ThreadRow from "./components/ThreadRow.svelte";
  import ForumSidebar from "./components/ForumSidebar.svelte";
  import NewThreadForm from "./components/NewThreadForm.svelte";
  import type { ForumCategory, ForumThread } from "../../shared/types";

  let categories = $state<ForumCategory[]>([]);
  let threads = $state<ForumThread[]>([]);
  let recentThreads = $state<ForumThread[]>([]);
  let user = $state<{ id: string } | null>(null);
  let isLoading = $state(true);
  let showNewThread = $state(false);
  let activeCategory = $state<number | null>(null);

  async function loadThreads(catId: number | null) {
    isLoading = true;

    if (catId === null) {
      const allThreads: ForumThread[] = [];
      for (const cat of categories) {
        const res = await ForumThreadService.getThreadsByCategory(
          cat.slug,
          0,
          5,
        );
        if (res.success) allThreads.push(...res.data);
      }
      allThreads.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const aTime = a.lastPostAt || a.createdAt;
        const bTime = b.lastPostAt || b.createdAt;
        return bTime.localeCompare(aTime);
      });
      threads = allThreads;
    } else {
      const cat = categories.find((c) => c.id === catId);
      if (!cat) return;
      const res = await ForumThreadService.getThreadsByCategory(
        cat.slug,
        0,
        20,
      );
      if (res.success) threads = res.data;
    }

    isLoading = false;
  }

  async function handleCategorySelect(catId: number | null) {
    activeCategory = catId;
    await loadThreads(catId);
  }

  onMount(async () => {
    const u = await AuthService.getCurrentUser();
    user = u;

    const [catResult, recentResult] = await Promise.all([
      ForumCategoryService.getCategories(),
      ForumThreadService.getRecentThreads(5),
    ]);

    if (catResult.success) categories = catResult.data;
    if (recentResult.success) recentThreads = recentResult.data;

    await loadThreads(null);
  });

  async function handleCreateThread(
    categoryId: number,
    title: string,
    content: string,
    mediaId?: number | null,
  ) {
    if (!user) return;

    const result = await ForumThreadService.createThread(
      user.id,
      categoryId,
      title,
      content,
      mediaId,
    );
    if (result.success) {
      showNewThread = false;
      await handleCategorySelect(categoryId);
    }
  }
</script>

<div class="max-w-280 mx-auto py-10 px-4">
  <div class="flex items-center justify-between mb-8">
    <div>
      <h1 class="text-3xl font-bold text-(--hako-fg)">Forum</h1>
      <p class="text-sm text-slate-500 mt-1">Discuss anime, manga, and more.</p>
    </div>
    {#if user}
      <button
        type="button"
        onclick={() => (showNewThread = !showNewThread)}
        class="px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 bg-(--hako-accent) text-(--hako-bg) hover:opacity-90 flex items-center gap-2"
      >
        <i class="fa-solid fa-plus"></i>
        New Thread
      </button>
    {/if}
  </div>

  <div class="grid grid-cols-[240px_1fr] gap-8">
    <aside class="hidden md:block">
      <ForumSidebar
        {categories}
        {recentThreads}
        activeCategoryId={activeCategory}
        onCategorySelect={handleCategorySelect}
      />
    </aside>

    <div>
      {#if showNewThread}
        <div class="mb-8">
          <NewThreadForm
            {categories}
            onCreateThread={handleCreateThread}
            onCancel={() => (showNewThread = false)}
          />
        </div>
      {/if}

      <!-- Header row -->
      <div
        class="flex items-center px-5 py-2 text-xs text-slate-500 font-bold uppercase tracking-wider border-b border-(--surface-elevated)/20"
      >
        <div class="flex-1">Thread</div>
        <div class="shrink-0 text-right min-w-30 hidden sm:block">
          Latest Reply
        </div>
      </div>

      {#if isLoading}
        <div class="flex items-center justify-center p-20">
          <i class="fa-solid fa-circle-notch fa-spin text-accent text-2xl"></i>
        </div>
      {:else if threads.length === 0}
        <div class="text-center p-10 text-slate-500">
          <i class="fa-solid fa-comments text-3xl mb-3"></i>
          <p>No threads yet in this category.</p>
          {#if user}
            <p class="text-sm mt-1">Be the first to start a discussion!</p>
          {:else}
            <p class="text-sm mt-1">Sign in to start a discussion.</p>
          {/if}
        </div>
      {:else}
        <div class="divide-y divide-(--surface-elevated)/20">
          {#each threads as thread (thread.id)}
            <ThreadRow {thread} />
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
