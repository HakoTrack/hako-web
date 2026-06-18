import { supabase } from '../../../core/supabase';
import { HakoImage } from '../../../shared/utils/images';
import { formatName } from '../../../shared/utils/nameUtils';
import type { StaffDetail, StaffMediaAppearance } from '../../../shared/types/index';

export async function getMediaStaff(mediaId: number) {
  const { data: roles, error } = await supabase
    .from('staff_roles')
    .select(`
      role,
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
    .is('character_id', null);

  if (error) {
    console.error('Error fetching media staff:', error);
    return [];
  }

  return (roles || [])
    .map((r: any) => {
      const s = r.staff;
      if (!s) return null;
      return {
        id: s.id,
        name: formatName(s.name_first, s.name_last, s.name_order, s.name_middle),
        role: r.role,
        image: HakoImage.getStaff(s.id),
      };
    })
    .filter(Boolean);
}

export async function getStaffById(id: number): Promise<StaffDetail | null> {
  const { data: staff, error } = await supabase
    .from('staff')
    .select('id, name_full, name_first, name_middle, name_last, name_order, name_native, biography')
    .eq('id', id)
    .single();

  if (error || !staff) {
    if (error) console.error('Error fetching staff:', error);
    return null;
  }

  const { data: roles } = await supabase
    .from('staff_roles')
    .select(`
      role,
      character:character_id (
        id,
        name_full,
        name_first,
        name_middle,
        name_last,
        name_order
      ),
      media:media_id (
        id, title_romaji, title_english, title_native,
        format, media_type, season_year
      )
    `)
    .eq('staff_id', id)
    .not('character_id', 'is', null);

  const media: StaffMediaAppearance[] = (roles ?? [])
    .filter((r: any) => r.media && r.character)
    .map((r: any) => ({
      mediaId: r.media.id,
      title: {
        romaji: r.media.title_romaji,
        english: r.media.title_english,
        native: r.media.title_native,
      },
      format: r.media.format,
      mediaType: r.media.media_type,
      role: r.role,
      seasonYear: r.media.season_year,
      cover: HakoImage.getCover(r.media.id),
      character: {
        id: r.character.id,
        name: formatName(r.character.name_first, r.character.name_last, r.character.name_order, r.character.name_middle),
        image: HakoImage.getCharacter(r.character.id),
      },
    }));

  return {
    id: staff.id,
    name: formatName(staff.name_first, staff.name_last, staff.name_order, staff.name_middle),
    nameFirst: staff.name_first ?? '',
    nameMiddle: staff.name_middle ?? '',
    nameLast: staff.name_last ?? '',
    nameNative: staff.name_native,
    biography: staff.biography ?? null,
    image: HakoImage.getStaff(staff.id),
    media,
  };
}
