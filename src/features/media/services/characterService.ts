import { supabase } from '../../../core/supabase';
import { HakoImage } from '../../../shared/utils/images';

interface Character {
  id: number;
  name_full: string;
}

interface Staff {
  id: number;
  name_full: string;
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
        name_full
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
        name_full
      )
    `)
    .eq('media_id', mediaId)
    .not('character_id', 'is', null);

  if (staffError) {
    console.error('Error fetching staff roles:', staffError);
  }

  // 3. Merge data
  return (relations || []).map(relation => {
    const va = staffRoles?.find(sr => sr.character_id === relation.characters.id)?.staff;
    return {
      name: relation.characters.name_full,
      role: relation.role,
      image: HakoImage.getCharacter(relation.characters.id),
      id: relation.characters.id,
      va: va ? {
        name: va.name_full,
        image: HakoImage.getStaff(va.id)
      } : null
    };
  });
}
