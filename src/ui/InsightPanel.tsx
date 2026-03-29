/**
 * InsightPanel — Task 14.2
 * Displays Insight[] after algorithm completion.
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import type { Insight } from '../types';

const COLORS = {
  bg: '#0a0a0a',
  active: '#00ff88',
  traversed: '#ff6b35',
  inactive: '#ffffff',
  surface: '#111111',
  border: '#222222',
};

const INSIGHT_COLORS: Record<Insight['type'], string> = {
  critical_path: '#00ff88',
  cycle_detected: '#ff6b35',
  isolated_node: '#ffcc00',
  general: '#aaaaaa',
};

const INSIGHT_ICONS: Record<Insight['type'], string> = {
  critical_path: '🏆',
  cycle_detected: '🔄',
  isolated_node: '⚠️',
  general: 'ℹ️',
};

interface InsightPanelProps {
  insights: Insight[];
}

export function InsightPanel({ insights }: InsightPanelProps) {
  if (insights.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Insights</Text>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {insights.map((insight, idx) => (
          <View key={idx} style={[styles.card, { borderLeftColor: INSIGHT_COLORS[insight.type] }]}>
            <Text style={styles.icon}>{INSIGHT_ICONS[insight.type]}</Text>
            <View style={styles.cardBody}>
              <Text style={[styles.type, { color: INSIGHT_COLORS[insight.type] }]}>
                {insight.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </Text>
              <Text style={styles.message}>{insight.message}</Text>
              {insight.affectedNodeIds && insight.affectedNodeIds.length > 0 && (
                <Text style={styles.affected}>
                  Nodes: {insight.affectedNodeIds.join(', ')}
                </Text>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    maxHeight: 220,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  heading: {
    color: COLORS.active,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scroll: { flex: 1 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderLeftWidth: 3,
    padding: 10,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  icon: { fontSize: 18, marginRight: 10, marginTop: 1 },
  cardBody: { flex: 1 },
  type: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  message: { color: COLORS.inactive, fontSize: 13, lineHeight: 18, opacity: 0.9 },
  affected: { color: '#666', fontSize: 11, marginTop: 4 },
});
