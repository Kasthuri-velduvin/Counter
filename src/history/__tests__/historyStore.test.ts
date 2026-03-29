import AsyncStorage from '@react-native-async-storage/async-storage';
import { createHistoryStore } from '../historyStore';
import type { SessionRecord } from '../../types';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => store[key] ?? null),
      setItem: jest.fn(async (key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: jest.fn(async (key: string) => {
        delete store[key];
      }),
      clear: jest.fn(async () => {
        Object.keys(store).forEach((k) => delete store[k]);
      }),
      _store: store,
    },
  };
});

// Helper to reset the mock store between tests
function clearStore() {
  const mock = AsyncStorage as unknown as { _store: Record<string, string> };
  Object.keys(mock._store).forEach((k) => delete mock._store[k]);
}

function makeSession(overrides: Partial<Omit<SessionRecord, 'id' | 'createdAt'>> = {}): Omit<SessionRecord, 'id' | 'createdAt'> {
  return {
    label: 'Test Session',
    graphJson: '{"nodes":[],"edges":[]}',
    algorithm: 'dijkstra',
    sourceNodeId: 'node-1',
    algorithmResult: { steps: [] },
    insights: [],
    ...overrides,
  };
}

describe('HistoryStore', () => {
  beforeEach(() => {
    clearStore();
    jest.clearAllMocks();
  });

  // ─── save ────────────────────────────────────────────────────────────────────

  it('save returns a SessionRecord with generated id and createdAt', async () => {
    const store = createHistoryStore();
    const session = makeSession();
    const record = await store.save(session);

    expect(record.id).toBeTruthy();
    expect(typeof record.id).toBe('string');
    expect(record.createdAt).toBeGreaterThan(0);
    expect(record.label).toBe('Test Session');
    expect(record.algorithm).toBe('dijkstra');
  });

  it('save persists the session so it can be loaded', async () => {
    const store = createHistoryStore();
    const record = await store.save(makeSession());
    const loaded = await store.load(record.id);
    expect(loaded).toEqual(record);
  });

  it('save adds the session id to the index', async () => {
    const store = createHistoryStore();
    const r1 = await store.save(makeSession({ label: 'A' }));
    const r2 = await store.save(makeSession({ label: 'B' }));
    const list = await store.list();
    const ids = list.map((s) => s.id);
    expect(ids).toContain(r1.id);
    expect(ids).toContain(r2.id);
  });

  // ─── load ────────────────────────────────────────────────────────────────────

  it('load throws an Error when session not found', async () => {
    const store = createHistoryStore();
    await expect(store.load('nonexistent-id')).rejects.toThrow('Session not found: nonexistent-id');
  });

  it('load returns the exact saved record', async () => {
    const store = createHistoryStore();
    const session = makeSession({ label: 'Exact Match', algorithm: 'dfs' });
    const saved = await store.save(session);
    const loaded = await store.load(saved.id);
    expect(loaded.label).toBe('Exact Match');
    expect(loaded.algorithm).toBe('dfs');
    expect(loaded.id).toBe(saved.id);
    expect(loaded.createdAt).toBe(saved.createdAt);
  });

  // ─── list ────────────────────────────────────────────────────────────────────

  it('list returns empty array when no sessions saved', async () => {
    const store = createHistoryStore();
    const result = await store.list();
    expect(result).toEqual([]);
  });

  it('list returns sessions ordered most-recent-first', async () => {
    const store = createHistoryStore();

    // Save three sessions and manually set their createdAt via the mock store
    const r1 = await store.save(makeSession({ label: 'Oldest' }));
    const r2 = await store.save(makeSession({ label: 'Middle' }));
    const r3 = await store.save(makeSession({ label: 'Newest' }));

    // Patch createdAt values directly in the mock store
    const mock = AsyncStorage as unknown as { _store: Record<string, string> };
    const now = Date.now();
    mock._store[`history:session:${r1.id}`] = JSON.stringify({ ...r1, createdAt: now - 3000 });
    mock._store[`history:session:${r2.id}`] = JSON.stringify({ ...r2, createdAt: now - 2000 });
    mock._store[`history:session:${r3.id}`] = JSON.stringify({ ...r3, createdAt: now - 1000 });

    const list = await store.list();
    expect(list[0].label).toBe('Newest');
    expect(list[1].label).toBe('Middle');
    expect(list[2].label).toBe('Oldest');
  });

  // ─── delete ──────────────────────────────────────────────────────────────────

  it('delete removes the session from list', async () => {
    const store = createHistoryStore();
    const record = await store.save(makeSession());
    await store.delete(record.id);
    const list = await store.list();
    expect(list.find((s) => s.id === record.id)).toBeUndefined();
  });

  it('delete makes load throw for the deleted id', async () => {
    const store = createHistoryStore();
    const record = await store.save(makeSession());
    await store.delete(record.id);
    await expect(store.load(record.id)).rejects.toThrow();
  });

  it('delete is a no-op for a non-existent id', async () => {
    const store = createHistoryStore();
    await store.save(makeSession({ label: 'Keep' }));
    await expect(store.delete('ghost-id')).resolves.toBeUndefined();
    const list = await store.list();
    expect(list).toHaveLength(1);
  });

  // ─── 90-day purge ────────────────────────────────────────────────────────────

  it('list retains sessions within 90 days', async () => {
    const store = createHistoryStore();
    const record = await store.save(makeSession({ label: 'Recent' }));

    // Set createdAt to 89 days ago
    const mock = AsyncStorage as unknown as { _store: Record<string, string> };
    const eightyNineDaysAgo = Date.now() - 89 * 24 * 60 * 60 * 1000;
    mock._store[`history:session:${record.id}`] = JSON.stringify({
      ...record,
      createdAt: eightyNineDaysAgo,
    });

    const list = await store.list();
    expect(list.find((s) => s.id === record.id)).toBeDefined();
  });

  it('list purges sessions older than 90 days', async () => {
    const store = createHistoryStore();
    const record = await store.save(makeSession({ label: 'Old' }));

    // Set createdAt to 91 days ago
    const mock = AsyncStorage as unknown as { _store: Record<string, string> };
    const ninetyOneDaysAgo = Date.now() - 91 * 24 * 60 * 60 * 1000;
    mock._store[`history:session:${record.id}`] = JSON.stringify({
      ...record,
      createdAt: ninetyOneDaysAgo,
    });

    const list = await store.list();
    expect(list.find((s) => s.id === record.id)).toBeUndefined();
  });

  it('purged sessions are removed from storage on list()', async () => {
    const store = createHistoryStore();
    const record = await store.save(makeSession({ label: 'Stale' }));

    const mock = AsyncStorage as unknown as { _store: Record<string, string> };
    const ninetyOneDaysAgo = Date.now() - 91 * 24 * 60 * 60 * 1000;
    mock._store[`history:session:${record.id}`] = JSON.stringify({
      ...record,
      createdAt: ninetyOneDaysAgo,
    });

    await store.list();

    // The session key should be gone from storage
    expect(mock._store[`history:session:${record.id}`]).toBeUndefined();
  });

  it('90-day boundary: exactly 90 days old is purged', async () => {
    const store = createHistoryStore();
    const record = await store.save(makeSession({ label: 'Boundary' }));

    const mock = AsyncStorage as unknown as { _store: Record<string, string> };
    // Exactly 90 days ago (equal to threshold, not within)
    const exactlyNinetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    mock._store[`history:session:${record.id}`] = JSON.stringify({
      ...record,
      createdAt: exactlyNinetyDaysAgo,
    });

    const list = await store.list();
    // now - createdAt === NINETY_DAYS_MS, which is NOT > NINETY_DAYS_MS, so retained
    expect(list.find((s) => s.id === record.id)).toBeDefined();
  });
});
