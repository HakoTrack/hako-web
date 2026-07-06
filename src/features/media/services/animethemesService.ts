export interface VideoResource {
  id: number;
  basename: string;
  filename: string;
  resolution: number;
  nc: boolean;
  subbed: boolean;
  lyrics: boolean;
  uncen: boolean;
  source: string;
  overlap: string;
  tags: string;
  link: string;
}

export interface ThemeEntry {
  id: number;
  version: number;
  episodes: string;
  notes: string | null;
  nsfw: boolean;
  spoiler: boolean;
  videos: VideoResource[];
}

export interface Artist {
  id: number;
  name: string;
  slug: string;
}

export interface Song {
  id: number;
  title: string;
  artists?: Artist[];
}

export interface AnimeTheme {
  id: number;
  type: "OP" | "ED";
  sequence: number | null;
  slug: string;
  song?: Song;
  animethemeentries: ThemeEntry[];
}

export interface AnimeThemesResponse {
  anime: {
    id: number;
    name: string;
    animethemes: AnimeTheme[];
  }[];
}

const themeCache = new Map<number, { data: AnimeTheme[]; ts: number }>();
const CACHE_TTL = 3600_000;

export async function getAnimeThemes(anilistId: number): Promise<AnimeTheme[]> {
  const cached = themeCache.get(anilistId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const params = new URLSearchParams({
    "filter[has]": "resources",
    "filter[site]": "AniList",
    "filter[external_id]": String(anilistId),
    include: "animethemes.song.artists,animethemes.animethemeentries.videos",
    "fields[anime]": "id,name",
    "fields[animetheme]": "id,type,sequence,slug",
    "fields[animethemeentry]": "id,version,episodes,notes,nsfw,spoiler",
    "fields[video]": "id,basename,filename,resolution,nc,subbed,lyrics,uncen,source,overlap,tags,link",
    "fields[song]": "id,title",
    "fields[artist]": "id,name,slug",
  });

  try {
    const res = await fetch(`https://api.animethemes.moe/anime?${params}`);
    if (!res.ok) return [];
    const data: AnimeThemesResponse = await res.json();
    const anime = data.anime?.[0];
    if (!anime) return [];

    const themes = anime.animethemes ?? [];
    themes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "OP" ? -1 : 1;
      return (a.sequence ?? 0) - (b.sequence ?? 0);
    });

    themeCache.set(anilistId, { data: themes, ts: Date.now() });
    return themes;
  } catch {
    return [];
  }
}
