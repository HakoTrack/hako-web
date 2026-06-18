import { supabase } from '../../../core/supabase';
import { HakoImage } from '../../../shared/utils/images';
import { formatName } from '../../../shared/utils/nameUtils';
import type { CharacterDetail, CharacterMediaAppearance } from '../../../shared/types/index';

interface Character {
  id: number;
  name_full: string;
  name_first: string | null;
  name_middle: string | null;
  name_last: string | null;
  name_order: string | null;
}

interface Staff {
  id: number;
  name_full: string;
  name_first: string | null;
  name_middle: string | null;
  name_last: string | null;
  name_order: string | null;
}

interface Relation {
  role: string;
  characters: Character;
}

interface StaffRole {
  character_id: number;
  staff: Staff;
}

export async function getMediaCharacters(mediaId: number) {
  // 1. Fetch character relations + characters
  const { data: relations, error: relError } = await supabase
    .from('character_relations')
    .select<string, Relation>(`
      role,
      characters (
        id,
        name_full,
        name_first,
        name_middle,
        name_last,
        name_order
      )
    `)
    .eq('media_id', mediaId);

  if (relError) {
    console.error('Error fetching character relations:', relError);
    return [];
  }

  // 2. Fetch staff roles + staff (VA roles)
  const { data: staffRoles, error: staffError } = await supabase
    .from('staff_roles')
    .select<string, StaffRole>(`
      character_id,
      staff (
        id,
        name_full,
        name_first,
        name_middle,
        name_last,
        name_order
      )
    `)
    .eq('media_id', mediaId)
    .not('character_id', 'is', null);

  if (staffError) {
    console.error('Error fetching staff roles:', staffError);
  }

  // 3. Merge data
  return (relations || []).map(relation => {
    const c = relation.characters;
    const va = staffRoles?.find(sr => sr.character_id === c.id)?.staff;
    return {
      name: formatName(c.name_first, c.name_last, c.name_order, c.name_middle),
      role: relation.role,
      image: HakoImage.getCharacter(c.id),
      id: c.id,
      va: va ? {
        name: formatName(va.name_first, va.name_last, va.name_order, va.name_middle),
        image: HakoImage.getStaff(va.id)
      } : null
    };
  });
}

export async function getCharacterById(id: number): Promise<CharacterDetail | null> {
  const { data: char, error } = await supabase
    .from('characters')
    .select('id, name_full, name_first, name_middle, name_last, name_order, name_native, biography, aliases, aliases_spoiler')
    .eq('id', id)
    .single();

  if (error || !char) {
    if (error) console.error('Error fetching character:', error);
    return null;
  }

  const { data: appearances } = await supabase
    .from('character_relations')
    .select(`
      role,
      media:media_id (
        id, title_romaji, title_english, title_native,
        format, media_type, season_year, episodes, chapters
      )
    `)
    .eq('character_id', id);

  const { data: staffRoles } = await supabase
    .from('staff_roles')
    .select(`
      media_id,
      staff (
        id,
        name_full,
        name_first,
        name_middle,
        name_last,
        name_order
      )
    `)
    .eq('character_id', id)
    .not('staff_id', 'is', null);

  const vaByMedia: Record<number, { id: number; name: string; image: string }> = {};
  for (const sr of (staffRoles as any[]) ?? []) {
    const staffMember: any = sr.staff;
    if (staffMember) {
      vaByMedia[sr.media_id] = {
        id: staffMember.id,
        name: formatName(staffMember.name_first, staffMember.name_last, staffMember.name_order, staffMember.name_middle),
        image: HakoImage.getStaff(staffMember.id),
      };
    }
  }

  const media: CharacterMediaAppearance[] = (appearances ?? [])
    .filter((a: any) => a.media)
    .map((a: any) => ({
      mediaId: a.media.id,
      title: {
        romaji: a.media.title_romaji,
        english: a.media.title_english,
        native: a.media.title_native,
      },
      format: a.media.format,
      mediaType: a.media.media_type,
      role: a.role,
      seasonYear: a.media.season_year,
      cover: HakoImage.getCover(a.media.id),
      voiceActor: vaByMedia[a.media.id] ?? undefined,
    }));

  let aliases: string[] = [];
  if (Array.isArray(char.aliases)) {
    aliases = char.aliases;
  }

  let aliasesSpoiler: string[] = [];
  if (Array.isArray(char.aliases_spoiler)) {
    aliasesSpoiler = char.aliases_spoiler;
  }

  return {
    id: char.id,
    name: formatName(char.name_first, char.name_last, char.name_order, char.name_middle),
    nameFirst: char.name_first ?? '',
    nameMiddle: char.name_middle ?? '',
    nameLast: char.name_last ?? '',
    nameNative: char.name_native,
    biography: char.biography,
    aliases,
    aliasesSpoiler,
    image: HakoImage.getCharacter(char.id, 'large'),
    media,
  };
}
