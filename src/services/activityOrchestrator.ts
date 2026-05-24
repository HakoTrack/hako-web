import { ActivityService } from './activityService';
import { FeedService } from './feedService';
import { getDisplayTitle, settings } from '../core/settings.svelte';

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
    entry: any, // Changed to any to support merged metadata
    oldEntry: any | null,
    mediaType: string
  ) {
    // 1. Always log heatmap activity
    await ActivityService.trackActivity(userId);

    // 2. Centralized feed post logic
    if (this.shouldCreateFeedPost(entry, oldEntry)) {
      await FeedService.createListUpdatePost(
        userId,
        userId,
        entry.media_id,
        getDisplayTitle(entry.rawMetadata?.title || { romaji: entry.title }, settings.titlePreference),
        entry.progress || 0,
        entry.total || "?",
        mediaType,
        entry.status || "updated"
      );
    }
  },

  /**
   * Logic to determine if a list update warrants a feed post.
   */
  shouldCreateFeedPost(newEntry: any, oldEntry: any | null): boolean {
    if (!oldEntry) return true; // New list entry, always post

    // Status changes that warrant a post:
    // planning, current (watching/reading), paused, dropped
    const statusChanged = newEntry.status !== oldEntry.status;
    const progressChanged = newEntry.progress !== oldEntry.progress;

    // We want to post for:
    // 1. Status changes (including planning, watching, paused, dropped)
    // 2. Progress updates
    if (statusChanged || progressChanged) return true;

    return false;
  }
};
