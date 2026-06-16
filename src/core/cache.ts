import { openDB, type DBSchema } from 'idb';

interface SyncCache<T> {
  data: T;
  lastSync: string; // ISO timestamp
}

interface HakoDB extends DBSchema {
  media_metadata: {
    key: string;
    value: SyncCache<any>;
  };
  media_relations: {
    key: string;
    value: any;
  };
  user_lists: {
    key: string;
    value: SyncCache<any[]>;
  };
  user_favorites: {
    key: string;
    value: SyncCache<number[]>;
  };
  profiles: {
    key: string;
    value: SyncCache<any>;
  };
  list_entries: {
    key: string;
    value: SyncCache<any>;
  };
}

const DB_NAME = 'HakoDB_v2';
const DB_VERSION = 12.0;


const dbPromise = openDB<HakoDB>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    // Delete existing stores to ensure full invalidation on version bump
    if (db.objectStoreNames.contains('media_metadata')) {
      db.deleteObjectStore('media_metadata');
    }
    if (db.objectStoreNames.contains('media_relations')) {
      db.deleteObjectStore('media_relations');
    }
    if (db.objectStoreNames.contains('user_lists')) {
      db.deleteObjectStore('user_lists');
    }
    if (db.objectStoreNames.contains('list_entries')) {
      db.deleteObjectStore('list_entries');
    }
    if (db.objectStoreNames.contains('user_favorites')) {
      db.deleteObjectStore('user_favorites');
    }
    if (db.objectStoreNames.contains('profiles')) {
      db.deleteObjectStore('profiles');
    }
    db.createObjectStore('media_metadata');
    db.createObjectStore('media_relations');
    db.createObjectStore('user_lists');
    db.createObjectStore('list_entries');
    db.createObjectStore('user_favorites');
    db.createObjectStore('profiles');
  },
});

export const CacheService = {
  async getMedia(id: string) {
    const db = await dbPromise;
    return db.get('media_metadata', id);
  },
  async setMedia(id: string, value: any) {
    const db = await dbPromise;
    return db.put('media_metadata', value, id);
  },
  async deleteMedia(id: string) {
    const db = await dbPromise;
    return db.delete('media_metadata', id);
  },

  async getAllMedia() {
    const db = await dbPromise;
    return db.getAll('media_metadata');
  },

  async getMediaRelations(id: string) {
    const db = await dbPromise;
    return db.get('media_relations', id);
  },
  async setMediaRelations(id: string, value: any) {
    const db = await dbPromise;
    return db.put('media_relations', value, id);
  },
  async deleteMediaRelations(id: string) {
    const db = await dbPromise;
    return db.delete('media_relations', id);
  },

  // --- Sync-Aware Methods ---

  async getList(cacheKey: string): Promise<SyncCache<any[]> | undefined> {
    const db = await dbPromise;
    return db.get('user_lists', cacheKey);
  },
  async setList(cacheKey: string, data: any[], lastSync: string) {
    const db = await dbPromise;
    return db.put('user_lists', { data, lastSync }, cacheKey);
  },
  async deleteList(cacheKey: string) {
    const db = await dbPromise;
    return db.delete('user_lists', cacheKey);
  },

  async getFavorites(cacheKey: string): Promise<SyncCache<number[]> | undefined> {
    const db = await dbPromise;
    return db.get('user_favorites', cacheKey);
  },
  async setFavorites(cacheKey: string, ids: number[], lastSync: string) {
    const db = await dbPromise;
    return db.put('user_favorites', { data: ids, lastSync }, cacheKey);
  },
  async deleteFavorites(cacheKey: string) {
    const db = await dbPromise;
    return db.delete('user_favorites', cacheKey);
  },

  async getProfile(idOrUsername: string): Promise<SyncCache<any> | undefined> {
    const db = await dbPromise;
    return db.get('profiles', idOrUsername);
  },
  async setProfile(idOrUsername: string, profile: any, lastSync: string) {
    const db = await dbPromise;
    return db.put('profiles', { data: profile, lastSync }, idOrUsername);
  },
  async deleteProfile(idOrUsername: string) {
    const db = await dbPromise;
    return db.delete('profiles', idOrUsername);
  },

  async getListEntry(cacheKey: string): Promise<SyncCache<any> | undefined> {
    const db = await dbPromise;
    return db.get('list_entries', cacheKey);
  },
  async setListEntry(cacheKey: string, data: any, lastSync: string) {
    const db = await dbPromise;
    return db.put('list_entries', { data, lastSync }, cacheKey);
  },
  async deleteListEntry(cacheKey: string) {
    const db = await dbPromise;
    return db.delete('list_entries', cacheKey);
  }
};
