/**
 * HistoryScreen — Task 15
 * History list (most-recent-first), delete, restore, save, comparison.
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.6
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { createHistoryStore } from '../history/historyStore';
import { GraphSerializer } from '../graph/graphSerializer';
import type { SessionRecord, Graph, AlgorithmResult, Insight, AlgorithmType } from '../types';

const COLORS = {
  bg: '#0a0a0a',
  active: '#00ff88',
  traversed: '#ff6b35',
  inactive: '#ffffff',
  surface: '#1a1a1a',
  border: '#333333',
  error: '#ff4444',
};

const historyStore = createHistoryStore();

interface HistoryScreenProps {
  /** Current session data for saving */
  currentGraph?: Graph;
  currentAlgorithm?: AlgorithmType;
  currentSourceNodeId?: string;
  currentResult?: AlgorithmResult;
  currentInsights?: Insight[];
  /** Called when user restores a session */
  onRestore?: (graph: Graph, record: SessionRecord) => void;
  /** Called when user wants to compare two sessions */
  onCompare?: (a: SessionRecord, b: SessionRecord) => void;
}

export function HistoryScreen({
  currentGraph,
  currentAlgorithm,
  currentSourceNodeId,
  currentResult,
  currentInsights,
  onRestore,
  onCompare,
}: HistoryScreenProps) {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const list = await historyStore.list();
      setSessions(list);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // ── Save current session (req 7.1, 15.3) ─────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!currentGraph || !currentAlgorithm || !currentResult || !currentInsights) {
      setError('Run an algorithm first before saving.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const graphJson = GraphSerializer.serialize(currentGraph);
      const label = `Session ${new Date().toLocaleString()}`;
      await historyStore.save({
        label,
        graphJson,
        algorithm: currentAlgorithm,
        sourceNodeId: currentSourceNodeId ?? '',
        algorithmResult: {
          steps: currentResult.steps,
          shortestPaths: currentResult.shortestPaths
            ? Object.fromEntries(currentResult.shortestPaths)
            : undefined,
          visitOrder: currentResult.visitOrder,
        },
        insights: currentInsights,
      });
      await loadSessions();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save session.');
    } finally {
      setSaving(false);
    }
  }, [currentGraph, currentAlgorithm, currentSourceNodeId, currentResult, currentInsights, loadSessions]);

  // ── Delete session (req 7.4) ──────────────────────────────────────────────
  const handleDelete = useCallback(
    (id: string) => {
      Alert.alert('Delete Session', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await historyStore.delete(id);
            await loadSessions();
          },
        },
      ]);
    },
    [loadSessions],
  );

  // ── Restore session (req 7.3) ─────────────────────────────────────────────
  const handleRestore = useCallback(
    (record: SessionRecord) => {
      try {
        const graph = GraphSerializer.deserialize(record.graphJson);
        onRestore?.(graph, record);
      } catch (err: any) {
        setError('Failed to restore session: ' + (err?.message ?? ''));
      }
    },
    [onRestore],
  );

  // ── Compare two sessions (req 7.6) ────────────────────────────────────────
  const toggleCompareSelect = useCallback((id: string) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }, []);

  const handleCompare = useCallback(() => {
    if (selectedForCompare.length < 2) return;
    const a = sessions.find((s) => s.id === selectedForCompare[0]);
    const b = sessions.find((s) => s.id === selectedForCompare[1]);
    if (a && b) onCompare?.(a, b);
  }, [selectedForCompare, sessions, onCompare]);

  const renderItem = ({ item }: { item: SessionRecord }) => {
    const isSelected = selectedForCompare.includes(item.id);
    return (
      <View style={[styles.card, isSelected && styles.cardSelected]}>
        <TouchableOpacity style={styles.cardMain} onPress={() => handleRestore(item)}>
          <Text style={styles.cardLabel}>{item.label}</Text>
          <Text style={styles.cardMeta}>
            {item.algorithm.toUpperCase()} · {new Date(item.createdAt).toLocaleDateString()}
          </Text>
          <Text style={styles.cardMeta}>
            {item.insights.length} insight{item.insights.length !== 1 ? 's' : ''}
          </Text>
        </TouchableOpacity>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.iconBtn, isSelected && styles.iconBtnActive]}
            onPress={() => toggleCompareSelect(item.id)}
            accessibilityLabel="Select for comparison"
          >
            <Text style={styles.iconBtnText}>{isSelected ? '✓' : '⊕'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, styles.deleteIconBtn]}
            onPress={() => handleDelete(item.id)}
            accessibilityLabel="Delete session"
          >
            <Text style={styles.iconBtnText}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          accessibilityLabel="Save current session"
        >
          {saving ? (
            <ActivityIndicator color={COLORS.bg} size="small" />
          ) : (
            <Text style={styles.saveBtnText}>💾 Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {selectedForCompare.length === 2 && (
        <TouchableOpacity style={styles.compareBtn} onPress={handleCompare}>
          <Text style={styles.compareBtnText}>Compare Selected →</Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <ActivityIndicator color={COLORS.active} style={{ marginTop: 40 }} />
      ) : sessions.length === 0 ? (
        <Text style={styles.emptyText}>No saved sessions yet.</Text>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
  },
  title: { color: COLORS.active, fontSize: 22, fontWeight: '700' },
  saveBtn: {
    backgroundColor: COLORS.active,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: COLORS.bg, fontWeight: '700', fontSize: 14 },
  errorText: { color: COLORS.error, fontSize: 13, margin: 16 },
  compareBtn: {
    backgroundColor: '#001a0d',
    borderColor: COLORS.active,
    borderWidth: 1,
    borderRadius: 10,
    margin: 12,
    padding: 12,
    alignItems: 'center',
    minHeight: 44,
  },
  compareBtnText: { color: COLORS.active, fontWeight: '700', fontSize: 14 },
  list: { padding: 12 },
  emptyText: { color: '#555', textAlign: 'center', marginTop: 60, fontSize: 15 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderColor: COLORS.border,
    borderWidth: 1,
    marginBottom: 10,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardSelected: { borderColor: COLORS.active },
  cardMain: { flex: 1, padding: 14 },
  cardLabel: { color: COLORS.inactive, fontSize: 15, fontWeight: '600', marginBottom: 4 },
  cardMeta: { color: '#666', fontSize: 12, marginBottom: 2 },
  cardActions: { justifyContent: 'center', padding: 8, gap: 8 },
  iconBtn: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 10,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnActive: { backgroundColor: '#001a0d', borderColor: COLORS.active, borderWidth: 1 },
  deleteIconBtn: {},
  iconBtnText: { fontSize: 16 },
});
