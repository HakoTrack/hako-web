import { ActivityService } from './activityService';
import { FeedService } from './feedService';
import { getDisplayTitle, settings } from "../../../core/settings.svelte";

// Debounce state to buffer feed posts
const pendingPosts = new Map<string, {
  userId: string;
  entry: any;
  mediaType: string;
  timer: any;
  oldEntry: any | null;
}>();

/**
 * Orchestrates side effects for user actions, such as logging heatmap activity
 * and conditionally creating feed posts.
 */
export const ActivityOrchestrator = {
  /**
   * Handles side effects for list updates.
   */
  async handleListUpdate(
    userId: string,
    entry: any,
    oldEntry: any | null,
    mediaType: string
  ) {
    console.log("DEBUG [ActivityOrchestrator]: handleListUpdate called", { userId, entry, oldEntry });

    // 1. Log heatmap activity for the number of episodes/chapters progressed
    const oldProgress = oldEntry?.progress || 0;
    const newProgress = entry.progress || 0;

    if (newProgress > oldProgress) {
      const progressDelta = newProgress - oldProgress;
      for (let i = 0; i < progressDelta; i++) {
        await ActivityService.trackActivity(userId);
      }
    }

    // 2. Debounce feed post creation to batch updates
    const key = `${userId}-${entry.media_id}`;

    if (pendingPosts.has(key)) {
      clearTimeout(pendingPosts.get(key)!.timer);
    }

    const timer = setTimeout(async () => {
      console.log("DEBUG [ActivityOrchestrator]: Debounce timer fired", key);
      const update = pendingPosts.get(key);
      if (!update) {
        console.log("DEBUG [ActivityOrchestrator]: No update found for key", key);
        return;
      }

      const { entry: finalEntry, mediaType: finalMediaType, oldEntry: originalOldEntry } = update;

      console.log("DEBUG [ActivityOrchestrator]: Attempting feed post creation", {
        media_id: finalEntry.media_id,
        shouldCreate: this.shouldCreateFeedPost(finalEntry, originalOldEntry)
      });

      // Finalize post
      if (this.shouldCreateFeedPost(finalEntry, originalOldEntry)) {
        await FeedService.createListUpdatePost(
          userId,
          userId,
          finalEntry.media_id,
          getDisplayTitle(finalEntry.metadata?.title || finalEntry.rawMetadata?.title || { romaji: finalEntry.title }, settings.titlePreference),
          finalEntry.progress || 0,
          finalEntry.total ?? null,
          finalMediaType,
          finalEntry.status || "updated"
        );
      }
      pendingPosts.delete(key);
    }, 3000);

    // Update pending post state
    pendingPosts.set(key, {
      userId,
      entry: JSON.parse(JSON.stringify(entry)),
      mediaType,
      timer,
      oldEntry: pendingPosts.has(key) ? pendingPosts.get(key)!.oldEntry : JSON.parse(JSON.stringify(oldEntry))
    });
  },

  /**
   * Logic to determine if a list update warrants a feed post.
   */
  shouldCreateFeedPost(newEntry: any, oldEntry: any | null): boolean {
    console.log("DEBUG [ActivityOrchestrator]: shouldCreateFeedPost", { newEntry, oldEntry });
    if (!oldEntry) return true; // New list entry, always post

    // Safely access and ensure progress is treated as a number
    const newProgress = Number(newEntry.progress || 0);
    const oldProgress = Number(oldEntry.progress || 0);

    // Status changes that warrant a post
    const statusChanged = newEntry.status !== oldEntry.status;
    const progressChanged = newProgress !== oldProgress;

    console.log("DEBUG [ActivityOrchestrator]: shouldCreateFeedPost evaluation", {
      statusChanged,
      progressChanged,
      newProgress,
      oldProgress
    });

    // We want to post for:
    // 1. Status changes
    // 2. Progress updates
    if (statusChanged || progressChanged) return true;

    return false;
  },

  /**
   * Forces the immediate creation of all pending feed posts.
   */
  async flushAll() {
    for (const [key, update] of pendingPosts.entries()) {
      clearTimeout(update.timer);
      const { userId, entry, mediaType, oldEntry } = update;

      if (this.shouldCreateFeedPost(entry, oldEntry)) {
        await FeedService.createListUpdatePost(
          userId,
          userId,
          entry.media_id,
          getDisplayTitle(entry.rawMetadata?.title || { romaji: entry.title }, settings.titlePreference),
          entry.progress || 0,
          entry.total ?? null,
          mediaType,
          entry.status || "updated"
        );
      }
      pendingPosts.delete(key);
    }
  }
};

// Register listener to flush on page exit
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    ActivityOrchestrator.flushAll();
  });
}
