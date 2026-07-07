import { z } from 'zod';

// --- Profile Interface ---
export interface Profile {
  id: string;
  username: string;
  about_me?: string;
  avatar_url?: string;
  banner_url?: string;
  join_date?: string;
  display_name?: string;
  quote?: string;
  role?: string;
  mediaLists: Record<string, any[]>;
}

// --- Vibe Interfaces ---
export interface VibeScore {
  speculative: number;
  visceral: number;
  cerebral: number;
  emotive: number;
  interpersonal: number;
  lighthearted: number;
}

export interface VibePillar {
  name: string;
  score: number;
}

export interface VibeResult {
  scores: VibeScore;
  sorted: VibePillar[];
}

export interface VibeAffinity {
  name: string;
  value: number;
}

// --- Character Interfaces ---
export interface CharacterMediaAppearance {
  mediaId: number;
  title: {
    romaji: string;
    english: string | null;
    native: string | null;
  };
  format: string;
  mediaType: string;
  role: string;
  seasonYear: number | null;
  cover: string;
  voiceActor?: {
    id: number;
    name: string;
    image: string;
  };
}

export interface StaffMediaAppearance {
  mediaId: number;
  title: {
    romaji: string;
    english: string | null;
    native: string | null;
  };
  format: string;
  mediaType: string;
  role: string;
  seasonYear: number | null;
  cover: string;
  character: {
    id: number;
    name: string;
    image: string;
  };
}

export interface StaffDetail {
  id: number;
  name: string;
  nameFirst: string;
  nameMiddle: string;
  nameLast: string;
  nameNative: string | null;
  biography: string | null;
  image: string;
  media: StaffMediaAppearance[];
}

export interface CharacterDetail {
  id: number;
  name: string;
  nameFirst: string;
  nameMiddle: string;
  nameLast: string;
  nameNative: string | null;
  biography: string | null;
  aliases: string[];
  aliasesSpoiler: string[];
  image: string;
  media: CharacterMediaAppearance[];
}

// --- Media & List Interfaces ---
export interface Media {
  media_id: number;
  media_type: 'anime' | 'manga' | 'light_novel';
  title: {
    romaji: string;
    english: string | null;
    native: string | null;
  };
  description: string;
  format: string;
  source: string | null;
  status: string;
  episodes: number | null;
  chapters: number | null;
  volumes: number | null;
  duration: number | null;
  season: string | null;
  seasonYear: number | null;
  genres: string[];
  tags: Array<{ name: string; rank: number }>;
  tags_v2: Array<{ id: number; spoiler: boolean }>;
  vibe_vector?: Record<string, number>;
  externalLinks: Array<{ url: string; site: string }>;
  startDate: { year: number | null; month: number | null; day: number | null };
  endDate: { year: number | null; month: number | null; day: number | null };
}

export interface ListEntry {
  media_id: number;
  media_type?: string;
  score: number | null;
  progress: number | null;
  progress_volumes?: number | null;
  status: string;
  updatedAt: string;
  advancedScores: Record<string, any>;
  startedAt: { year: number | null; month: number | null; day: number | null };
  completedAt: { year: number | null; month: number | null; day: number | null };
  profileId: string;
}

export type QuickUpdateItem = ListEntry & {
  metadata: Media;
  media_type: 'anime' | 'manga' | 'light_novel';
  updated_at: string;
};

// --- Zod Schemas & Inferred Types ---
export const PostMetadataSchema = z.object({
  media_id: z.number().optional(),
  media_type: z.string().optional(),
  title: z.string().optional(),
  status: z.string().optional(),
  action: z.string().optional(),
  progress: z.number().optional(),
  total: z.union([z.number(), z.string()]).nullable().optional(),
});
export type PostMetadata = z.infer<typeof PostMetadataSchema>;

export const AuthorSchema = z.object({
  username: z.string(),
  avatar_url: z.string().nullable(),
  join_date: z.string().nullable().optional(),
  quote: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
});
export type Author = z.infer<typeof AuthorSchema>;

export const PostSchema = z.object({
  id: z.string(),
  author_id: z.string(),
  target_profile_id: z.string(),
  post_type: z.enum(['thought', 'list_update', 'share']),
  metadata: PostMetadataSchema.nullable(),
  content: z.string().nullable(),
  created_at: z.string(),
  author: AuthorSchema,
  stats: z.object({
    likes: z.number(),
    comments: z.number(),
    shares: z.number(),
  }).optional(),
  // Interaction state (populated by query)
  likes: z.array(z.object({ user_id: z.string() })).default([]),
  likes_count: z.number().default(0),
  comments_count: z.number().default(0),
  shares_count: z.number().default(0),
});
export type Post = z.infer<typeof PostSchema>;

export const CommentSchema = z.object({
  id: z.string(),
  post_id: z.string(),
  author_id: z.string(),
  content: z.string(),
  created_at: z.string(),
  author: AuthorSchema.optional(),
});
export type Comment = z.infer<typeof CommentSchema>;

// --- Forum Interfaces ---
export interface ForumCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  threadCount?: number;
  lastThread?: {
    id: number;
    title: string;
    lastPostAt: string | null;
    lastPostAuthor: Author | null;
  } | null;
}

export interface ForumThread {
  id: number;
  title: string;
  categoryId: number;
  category?: ForumCategory;
  authorId: string;
  author: Author;
  subjectMediaId?: number | null;
  subjectMedia?: Media | null;
  isPinned: boolean;
  isLocked: boolean;
  postCount: number;
  viewCount: number;
  lastPostAt: string | null;
  lastPostAuthor: Author | null;
  createdAt: string;
  updatedAt: string;
}

export interface ForumPost {
  id: number;
  threadId: number;
  authorId: string;
  author: Author;
  content: string;
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  isLiked: boolean;
  replyToIds: number[];
}

export interface Company {
  id: number;
  name: string;
}

export interface MediaCompanies {
  studios: Company[];
  producers: Company[];
}

export interface AchievementTier {
  name: string;
  color: string;
}

export interface Achievement {
  id: number;
  code: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  max_tier: number;
  media_type: string | null;
  user_tier: number | null;
  earned_at: string | null;
  tier_labels: Record<string, AchievementTier> | null;
}

export interface AchievementAwardResult {
  success: boolean;
  error?: string;
  code?: string;
  title?: string;
  tier?: number;
  max_tier?: number;
  icon?: string;
}

// --- Collection Interfaces ---

export type CollectionType = 'anime' | 'manga' | 'light_novel' | 'visual_novel' | 'mixed';
export type CollectionSort = 'newest' | 'popular';

export interface ViewerBreakdown {
  total: number;
  current: number;
  completed: number;
  paused: number;
  dropped: number;
  planning: number;
  unlisted: number;
}

export interface CollectionSummary {
  id: string;
  title: string;
  description: string | null;
  collection_type: CollectionType;
  author_id: string;
  author_username: string;
  entry_count: number;
  subscriber_count: number;
  is_added: boolean;
  viewer_breakdown: ViewerBreakdown | null;
  preview_media_ids: number[];
  has_hentai: boolean;
  created_at: string;
  updated_at: string;
}

export interface CollectionEntrySummary {
  id: string;
  media_id: number;
  media_type: string;
  position: number;
  notes: string | null;
  title_romaji: string;
  title_english: string | null;
  title_native: string | null;
  format: string;
  episodes: number | null;
  chapters: number | null;
  volumes: number | null;
  genre_ids: number[];
  vibe_vector: Record<string, number> | null;
  author_score: number | null;
  author_status: string | null;
  viewer_score: number | null;
  viewer_status: string | null;
  viewer_progress: number | null;
}

export interface CollectionDetail {
  id: string;
  title: string;
  description: string | null;
  collection_type: CollectionType;
  author_id: string;
  author_username: string;
  created_at: string;
  updated_at: string;
  entry_count: number;
  subscriber_count: number;
  is_added: boolean;
  viewer_breakdown: ViewerBreakdown | null;
  entries: CollectionEntrySummary[];
}

export interface UserCollection {
  collection_id: string;
  added_at: string;
  collection: {
    id: string;
    title: string;
    collection_type: CollectionType;
    author_id: string;
    author_username: string;
    entry_count: number;
  };
}

export interface CollectionsResult {
  data: CollectionSummary[];
  total: number;
  page: number;
  per_page: number;
}
