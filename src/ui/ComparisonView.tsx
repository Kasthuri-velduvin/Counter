/**
 * ComparisonView — Task 15.2
 * Side-by-side display of two saved sessions.
 * Requirements: 7.6
 */
import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  TouchableOpacity,
} from 'react-native';
import Svg, { Circle, Line, Defs, Marker, Path, Text as SvgText, G } from 'react-native-svg';
import { GraphSerializer } from '../graph/graphSerializer';
import type { SessionRecord, Graph } from '../types';

const COLORS = {
  bg: '#0a0a0a',
  active: '#00ff88',
  traversed: '#ff6b35',
  inactive: '#ffffff',
  surface: '#111111',
  border: '#222222',
};

const NODE_RADIUS = 20;

interface MiniGraphProps {
  graph: Graph;
  width: number;
  height: number;
}

function MiniGraph({ graph, width, height }: MiniGraphProps) {
  const nodes = Array.from(graph.nodes.values());
  const edges = Array.from(graph.edges.values());

  // Auto-layout nodes in a circle if positions are all (0,0)
  const allZero = nodes.every((n) => n.position.x === 0 && n.position.y === 0);
  const layoutNodes = useMemo(() => {
    if (!allZero) return nodes;
    const cx = width / 2;
    const cy = height / 2;
    const r = Math.min(width, height) * 0.35;
    return nodes.map((n, i) => ({
      ...n,
      position: {
        x: cx + r * Math.cos((2 * Math.PI * i) / nodes.length - Math.PI / 2),
        y: cy + r * Math.sin((2 * Math.PI * i) / nodes.length - Math.PI / 2),
      },
    }));
  }, [nodes, allZero, width, height]);

  const nodeMap = new Map(layoutNodes.map((n) => [n.id, n]));

  return (
    <Svg width={width} height={height} style={{ backgroundColor: COLORS.bg }}>
      <Defs>
        <Marker id="mini-arrow" markerWidth="6" markerHeight="6" refX="5" refY="2" orient="auto">
          <Path d="M0,0 L0,4 L6,2 z" fill="#444" />
        </Marker>
      </Defs>
      {edges.map((edge) => {
        const src = nodeMap.get(edge.sourceId);
        const tgt = nodeMap.get(edge.targetId);
        if (!src || !tgt) return null;
        const dx = tgt.position.x - src.position.x;
        const dy = tgt.position.y - src.position.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        return (
          <Line
            key={edge.id}
            x1={src.position.x + ux * NODE_RADIUS}
            y1={src.position.y + uy * NODE_RADIUS}
            x2={tgt.position.x - ux * (NODE_RADIUS + 6)}
            y2={tgt.position.y - uy * (NODE_RADIUS + 6)}
            stroke="#444"
            strokeWidth={1}
            markerEnd="url(#mini-arrow)"
          />
        );
      })}
      {layoutNodes.map((node) => (
        <G key={node.id}>
          <Circle cx={node.position.x} cy={node.position.y} r={NODE_RADIUS} fill="#1a1a1a" stroke={COLORS.active} strokeWidth={1} />
          <SvgText x={node.position.x} y={node.position.y + 4} fill={COLORS.inactive} fontSize="9" textAnchor="middle">
            {node.label.length > 6 ? node.label.slice(0, 5) + '…' : node.label}
          </SvgText>
        </G>
      ))}
    </Svg>
  );
}

interface ComparisonViewProps {
  sessionA: SessionRecord;
  sessionB: SessionRecord;
  onClose: () => void;
}

export function ComparisonView({ sessionA, sessionB, onClose }: ComparisonViewProps) {
  const { width } = useWindowDimensions();
  const panelWidth = (width - 32) / 2;
  const graphHeight = 200;

  const graphA = useMemo(() => {
    try { return GraphSerializer.deserialize(sessionA.graphJson); } catch { return null; }
  }, [sessionA]);

  const graphB = useMemo(() => {
    try { return GraphSerializer.deserialize(sessionB.graphJson); } catch { return null; }
  }, [sessionB]);

  const renderPanel = (record: SessionRecord, graph: Graph | null, label: string) => (
    <View style={[styles.panel, { width: panelWidth }]}>
      <Text style={styles.panelTitle} numberOfLines={1}>{label}</Text>
      <Text style={styles.panelMeta}>{record.algorithm.toUpperCase()}</Text>
      <Text style={styles.panelMeta}>{new Date(record.createdAt).toLocaleDateString()}</Text>
      <View style={styles.graphBox}>
        {graph ? (
          <MiniGraph graph={graph} width={panelWidth} height={graphHeight} />
        ) : (
          <Text style={styles.errorText}>Failed to load graph</Text>
        )}
      </View>
      <ScrollView style={styles.insightScroll} showsVerticalScrollIndicator={false}>
        {record.insights.map((ins, i) => (
          <Text key={i} style={styles.insightText}>• {ins.message}</Text>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Comparison</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityLabel="Close comparison">
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.row}>
          {renderPanel(sessionA, graphA, sessionA.label)}
          <View style={styles.divider} />
          {renderPanel(sessionB, graphB, sessionB.label)}
        </View>
      </ScrollView>
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
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
  },
  title: { color: COLORS.active, fontSize: 20, fontWeight: '700' },
  closeBtn: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 10,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: { color: COLORS.inactive, fontSize: 18 },
  content: { padding: 12 },
  row: { flexDirection: 'row', gap: 8 },
  panel: { flex: 1 },
  panelTitle: { color: COLORS.inactive, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  panelMeta: { color: '#666', fontSize: 11, marginBottom: 2 },
  graphBox: {
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 8,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  insightScroll: { maxHeight: 120 },
  insightText: { color: '#888', fontSize: 11, marginBottom: 4, lineHeight: 16 },
  divider: { width: 1, backgroundColor: COLORS.border, marginHorizontal: 4 },
  errorText: { color: '#ff4444', fontSize: 12, padding: 8 },
});
