export const STATUS_COLORS: Record<string, string> = {
  current: "var(--c2)",
  completed: "var(--c12)",
  paused: "var(--c3)",
  dropped: "var(--c1)",
  planning: "var(--c8)",
};

export const ROLES: Record<
  string,
  { label: string; romaji: string; color: string; title: string }
> = {
  owner: {
    label: "総帥",
    romaji: "Sousui",
    color: "bg-red-500",
    title: "Owner",
  },
  admin: {
    label: "師匠",
    romaji: "Shishou",
    color: "bg-indigo-500",
    title: "Admin",
  },
  moderator: {
    label: "先生",
    romaji: "Sensei",
    color: "bg-emerald-500",
    title: "Moderator",
  },
  contributor: {
    label: "先輩",
    romaji: "Senpai",
    color: "bg-blue-500",
    title: "Contributor",
  },
};

export const VIBE_ICONS: Record<string, string> = {
  Speculative: "fa-ghost",
  Visceral: "fa-bolt",
  Cerebral: "fa-brain",
  Emotive: "fa-heart-pulse",
  Interpersonal: "fa-users",
  Lighthearted: "fa-face-smile",
};

export const VIBE_LABELS: Record<string, string> = {
  Speculative: "\uf6e2",
  Visceral: "\uf0e7",
  Cerebral: "\uf5dc",
  Emotive: "\uf21e",
  Interpersonal: "\uf0c0",
  Lighthearted: "\uf118",
};

export const VIBE_LABELS_TO_ICONS: Record<string, string> = {
  "\uf6e2": "fa-ghost",
  "\uf0e7": "fa-bolt",
  "\uf5dc": "fa-brain",
  "\uf21e": "fa-heart-pulse",
  "\uf0c0": "fa-users",
  "\uf118": "fa-face-smile",
};

export const VIBE_LABELS_TO_NAMES: Record<string, string> = {
  "\uf6e2": "Speculative",
  "\uf0e7": "Visceral",
  "\uf5dc": "Cerebral",
  "\uf21e": "Emotive",
  "\uf0c0": "Interpersonal",
  "\uf118": "Lighthearted",
};

export const FORUM_CATEGORIES = [
  { id: 8, name: 'General', slug: 'general', description: 'General discussion about anime, manga, and everything in between.', sortOrder: 1 },
  { id: 9, name: 'Anime', slug: 'anime', description: 'Talk about anime series, movies, and OVAs.', sortOrder: 2 },
  { id: 10, name: 'Manga', slug: 'manga', description: 'Discuss manga, manhwa, and manhua.', sortOrder: 3 },
  { id: 11, name: 'Light Novels', slug: 'light-novels', description: 'Discuss light novels and novel series.', sortOrder: 4 },
  { id: 12, name: 'Visual Novels', slug: 'visual-novels', description: 'Discuss visual novels and eroge.', sortOrder: 5 },
  { id: 13, name: 'Recommendations', slug: 'recommendations', description: 'Ask for and share recommendations.', sortOrder: 6 },
  { id: 14, name: 'Site Feedback', slug: 'site-feedback', description: 'Feedback, bug reports, and suggestions for hako.', sortOrder: 7 },
];

export const FORUM_CATEGORY_COLORS: Record<string, string> = {
  general: 'var(--c7)',
  anime: 'var(--c4)',
  manga: 'var(--c1)',
  'light-novels': 'var(--c10)',
  'visual-novels': 'var(--c5)',
  recommendations: 'var(--c3)',
  'site-feedback': 'var(--c6)',
};

export const getStatusGroups = (type: string) => [
  { id: "current", label: type === "anime" ? "Watching" : "Reading", color: STATUS_COLORS.current },
  { id: "completed", label: "Completed", color: STATUS_COLORS.completed },
  { id: "paused", label: "Paused", color: STATUS_COLORS.paused },
  { id: "dropped", label: "Dropped", color: STATUS_COLORS.dropped },
  { id: "planning", label: "Planning", color: STATUS_COLORS.planning },
];
