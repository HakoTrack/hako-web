import { supabase } from '../../../core/supabase';

export async function uploadProfileImage(
  userId: string,
  file: File,
  bucket: 'avatars' | 'banners'
): Promise<string | null> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}.${fileExt}`;

  // 1. Clean up existing files with the same UUID (different extensions)
  // We list files in the bucket. Since it's a flat structure,
  // we look for files that start with the user's UUID.
  const { data: existingFiles, error: listError } = await supabase.storage
    .from(bucket)
    .list('', { search: userId });

  if (!listError && existingFiles) {
    const filesToDelete = existingFiles
      .filter((f) => f.name.startsWith(userId))
      .map((f) => f.name);

    if (filesToDelete.length > 0) {
      await supabase.storage.from(bucket).remove(filesToDelete);
    }
  }

  // 2. Upload the new file
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, { upsert: true });

  if (uploadError) {
    console.error(`Error uploading ${bucket} image:`, uploadError);
    return null;
  }

  // 3. Get the public URL
  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
  const publicUrl = data.publicUrl;

  // 4. Update the profile record
  const column = bucket === 'avatars' ? 'avatar_url' : 'banner_url';
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ [column]: publicUrl })
    .eq('id', userId);

  if (updateError) {
    console.error(`Error updating profile ${column}:`, updateError);
    return null;
  }

  return publicUrl;
}
