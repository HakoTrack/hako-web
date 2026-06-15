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
