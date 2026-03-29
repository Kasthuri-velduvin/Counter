import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import type { SessionRecord } from '../types';

export interface HistoryStore {
  save(session: Omit<SessionRecord, 'id' | 'createdAt'>): Promise<SessionRecord>;
  list(): Promise<SessionRecord[]>;
  load(id: string): Promise<SessionRecord>;
  delete(id: string): Promise<void>;
}

const INDEX_KEY = 'history:index';
const SESSION_KEY = (id: string) => `history:session:${id}`;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

async function getIndex(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function setIndex(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(ids));
}

export function createHistoryStore(): HistoryStore {
  return {
    async save(session) {
      const id = uuidv4();
      const createdAt = Date.now();
      const record: SessionRecord = { ...session, id, createdAt };

      await AsyncStorage.setItem(SESSION_KEY(id), JSON.stringify(record));

      const index = await getIndex();
      index.push(id);
      await setIndex(index);

      return record;
    },

    async list() {
      const index = await getIndex();
      const now = Date.now();
      const sessions: SessionRecord[] = [];
      const purgedIds: string[] = [];

      await Promise.all(
        index.map(async (id) => {
          const raw = await AsyncStorage.getItem(SESSION_KEY(id));
          if (!raw) {
            purgedIds.push(id);
            return;
          }
          const record: SessionRecord = JSON.parse(raw);
          if (now - record.createdAt > NINETY_DAYS_MS) {
            purgedIds.push(id);
            await AsyncStorage.removeItem(SESSION_KEY(id));
          } else {
            sessions.push(record);
          }
        }),
      );

      if (purgedIds.length > 0) {
        const remaining = index.filter((id) => !purgedIds.includes(id));
        await setIndex(remaining);
      }

      sessions.sort((a, b) => b.createdAt - a.createdAt);
      return sessions;
    },

    async load(id) {
      const raw = await AsyncStorage.getItem(SESSION_KEY(id));
      if (!raw) {
        throw new Error(`Session not found: ${id}`);
      }
      return JSON.parse(raw) as SessionRecord;
    },

    async delete(id) {
      await AsyncStorage.removeItem(SESSION_KEY(id));
      const index = await getIndex();
      await setIndex(index.filter((i) => i !== id));
    },
  };
}
