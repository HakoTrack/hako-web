import { supabase } from '../../../core/supabase';
import { type Result, success, failure } from '../../../shared/utils/result';
import type {
  CollectionSummary,
  CollectionDetail,
  CollectionType,
  CollectionSort,
  UserCollection,
  CollectionsResult,
} from '../../../shared/types';

export interface CreateCollectionInput {
  title: string;
  description?: string;
  entries: { media_id: number; position: number; notes?: string }[];
}

export const CollectionService = {
  async create(input: CreateCollectionInput): Promise<Result<{ collection_id: string; collection_type: string }>> {
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
    if (!userId) return failure('Not authenticated');

    const { data, error } = await supabase.rpc('create_collection', {
      p_user_id: userId,
      p_title: input.title,
      p_description: input.description ?? null,
      p_entries: input.entries,
    });

    if (error) return failure(error.message);
    if (!data?.success) return failure(data?.error ?? 'Failed to create collection');

    return success({
      collection_id: data.collection_id,
      collection_type: data.collection_type,
    });
  },

  async update(
    collectionId: string,
    input: { title?: string; description?: string; entries?: CreateCollectionInput['entries'] },
  ): Promise<Result<void>> {
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
    if (!userId) return failure('Not authenticated');

    const { data, error } = await supabase.rpc('update_collection', {
      p_user_id: userId,
      p_collection_id: collectionId,
      p_title: input.title ?? null,
      p_description: input.description ?? null,
      p_entries: input.entries ?? null,
    });

    if (error) return failure(error.message);
    if (!data?.success) return failure(data?.error ?? 'Failed to update collection');

    return success(undefined);
  },

  async delete(collectionId: string): Promise<Result<void>> {
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
    if (!userId) return failure('Not authenticated');

    const { data, error } = await supabase.rpc('delete_collection', {
      p_user_id: userId,
      p_collection_id: collectionId,
    });

    if (error) return failure(error.message);
    if (!data?.success) return failure(data?.error ?? 'Failed to delete collection');

    return success(undefined);
  },

  async add(collectionId: string): Promise<Result<void>> {
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
    if (!userId) return failure('Not authenticated');

    const { data, error } = await supabase.rpc('add_collection', {
      p_user_id: userId,
      p_collection_id: collectionId,
    });

    if (error) return failure(error.message);
    if (!data?.success) return failure(data?.error ?? 'Failed to add collection');

    return success(undefined);
  },

  async remove(collectionId: string): Promise<Result<void>> {
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
    if (!userId) return failure('Not authenticated');

    const { data, error } = await supabase.rpc('remove_collection', {
      p_user_id: userId,
      p_collection_id: collectionId,
    });

    if (error) return failure(error.message);
    if (!data?.success) return failure(data?.error ?? 'Failed to remove collection');

    return success(undefined);
  },

  async get(collectionId: string): Promise<Result<CollectionDetail | null>> {
    const { data: session } = await supabase.auth.getSession();
    const viewerId = session?.session?.user?.id ?? null;

    const { data, error } = await supabase.rpc('get_collection', {
      p_collection_id: collectionId,
      p_viewer_id: viewerId,
    });

    if (error) return failure(error.message);
    if (!data?.success) return failure(data?.error ?? 'Collection not found');

    return success((data.data ?? null) as CollectionDetail | null);
  },

  async list(
    page: number = 1,
    perPage: number = 20,
    sort: CollectionSort = 'newest',
    type?: CollectionType,
  ): Promise<Result<CollectionsResult>> {
    const { data: session } = await supabase.auth.getSession();
    const viewerId = session?.session?.user?.id ?? null;

    const { data, error } = await supabase.rpc('get_collections', {
      p_page: page,
      p_per_page: perPage,
      p_sort: sort,
      p_type: type ?? null,
      p_viewer_id: viewerId,
    });

    if (error) return failure(error.message);

    return success({
      data: (data?.data ?? []) as CollectionSummary[],
      total: data?.total ?? 0,
      page: data?.page ?? page,
      per_page: data?.per_page ?? perPage,
    });
  },

  async getUserCollections(): Promise<Result<UserCollection[]>> {
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
    if (!userId) return failure('Not authenticated');

    const { data, error } = await supabase.rpc('get_user_collections', {
      p_user_id: userId,
    });

    if (error) return failure(error.message);

    return success((data?.data ?? []) as UserCollection[]);
  },
};
