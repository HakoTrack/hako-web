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
