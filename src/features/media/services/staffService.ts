import { supabase } from '../../../core/supabase';
import { HakoImage } from '../../../shared/utils/images';
import type { StaffDetail, StaffMediaAppearance } from '../../../shared/types/index';

export async function getStaffById(id: number): Promise<StaffDetail | null> {
  const { data: staff, error } = await supabase
    .from('staff')
    .select('id, name_full, name_native, biography')
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
        name_full
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
        name: r.character.name_full,
        image: HakoImage.getCharacter(r.character.id),
      },
    }));

  return {
    id: staff.id,
    name: staff.name_full,
    nameNative: staff.name_native,
    biography: staff.biography ?? null,
    image: HakoImage.getStaff(staff.id),
    media,
  };
}
