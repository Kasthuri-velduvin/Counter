/**
 * GraphCanvas — Task 13
 * SVG-based graph visualizer with:
 *  - Dark theme + neon glow (req 6.1, 6.2)
 *  - Directed arrows with weight labels (req 2.3)
 *  - 44pt minimum tap targets (req 6.5)
 *  - Portrait/landscape support (req 6.4)
 *  - Step animation driven by AlgorithmStep (req 3.3, 3.4, 3.7)
 *  - Graph mutation interactions (req 4.1–4.6)
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle, Line, Defs, Marker, Path, Text as SvgText, G } from 'react-native-svg';
import { v4 as uuidv4 } from 'uuid';
import type { Graph, Node, Edge, AlgorithmStep } from '../types';

const COLORS = {
  bg: '#0a0a0a',
  active: '#00ff88',
  traversed: '#ff6b35',
  inactive: '#ffffff',
  nodeFill: '#1a1a1a',
  edgeDefault: '#444444',
  surface: '#1a1a1a',
  border: '#333333',
};

const NODE_RADIUS = 28; // gives 56pt diameter > 44pt minimum (req 6.5)
const MIN_TAP = 44;

interface EditState {
  type: 'node' | 'edge';
  id: string;
  label: string;
  weight: string;
}

interface GraphCanvasProps {
  graph: Graph;
  onGraphChange: (graph: Graph) => void;
  currentStep?: AlgorithmStep | null;
  totalSteps?: number;
}

export function GraphCanvas({ graph, onGraphChange, currentStep, totalSteps }: GraphCanvasProps) {
  const { width, height } = useWindowDimensions();
  const canvasHeight = height * 0.55;

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [addEdgeSource, setAddEdgeSource] = useState<string | null>(null);

  // ── Derived highlight sets from current step ──────────────────────────────
  const activeNodeId = currentStep?.activeNodeId ?? null;
  const visitedNodeIds = new Set(currentStep?.visitedNodeIds ?? []);
  const traversedEdgeIds = new Set(currentStep?.traversedEdgeIds ?? []);

  // ── Node color helper ─────────────────────────────────────────────────────
  const nodeColor = useCallback(
    (nodeId: string) => {
      if (nodeId === activeNodeId) return COLORS.active;
      if (visitedNodeIds.has(nodeId)) return COLORS.traversed;
      return COLORS.inactive;
    },
    [activeNodeId, visitedNodeIds],
  );

  const edgeColor = useCallback(
    (edgeId: string) => {
      if (traversedEdgeIds.has(edgeId)) return COLORS.traversed;
      return COLORS.edgeDefault;
    },
    [traversedEdgeIds],
  );

  // ── Tap on canvas background → add node (req 4.1) ────────────────────────
  const handleCanvasTap = useCallback(
    (evt: any) => {
      const { locationX, locationY } = evt.nativeEvent;
      // Check if tap is near any existing node
      for (const node of graph.nodes.values()) {
        const dx = node.position.x - locationX;
        const dy = node.position.y - locationY;
        if (Math.sqrt(dx * dx + dy * dy) < NODE_RADIUS + 10) return;
      }
      // Add new node at tap position
      const id = uuidv4();
      const newNode: Node = {
        id,
        label: `Node ${graph.nodes.size + 1}`,
        position: { x: locationX, y: locationY },
      };
      const newNodes = new Map(graph.nodes);
      newNodes.set(id, newNode);
      onGraphChange({ ...graph, nodes: newNodes });
    },
    [graph, onGraphChange],
  );

  // ── Tap on node ───────────────────────────────────────────────────────────
  const handleNodeTap = useCallback(
    (nodeId: string) => {
      if (addEdgeSource !== null) {
        // Second tap: add edge (req 4.2)
        if (addEdgeSource !== nodeId) {
          const id = uuidv4();
          const newEdge: Edge = {
            id,
            sourceId: addEdgeSource,
            targetId: nodeId,
            weight: 1,
            label: '1',
          };
          const newEdges = new Map(graph.edges);
          newEdges.set(id, newEdge);
          onGraphChange({ ...graph, edges: newEdges });
        }
        setAddEdgeSource(null);
        setSelectedNodeId(null);
      } else {
        setSelectedNodeId(nodeId === selectedNodeId ? null : nodeId);
      }
    },
    [addEdgeSource, selectedNodeId, graph, onGraphChange],
  );

  // ── Edit node ─────────────────────────────────────────────────────────────
  const handleEditNode = useCallback(() => {
    if (!selectedNodeId) return;
    const node = graph.nodes.get(selectedNodeId);
    if (!node) return;
    setEditState({ type: 'node', id: selectedNodeId, label: node.label, weight: '' });
    setSelectedNodeId(null);
  }, [selectedNodeId, graph]);

  // ── Delete node (req 4.3) ─────────────────────────────────────────────────
  const handleDeleteNode = useCallback(() => {
    if (!selectedNodeId) return;
    const newNodes = new Map(graph.nodes);
    newNodes.delete(selectedNodeId);
    const newEdges = new Map(graph.edges);
    for (const [eid, edge] of newEdges) {
      if (edge.sourceId === selectedNodeId || edge.targetId === selectedNodeId) {
        newEdges.delete(eid);
      }
    }
    onGraphChange({ nodes: newNodes, edges: newEdges });
    setSelectedNodeId(null);
  }, [selectedNodeId, graph, onGraphChange]);

  // ── Tap on edge → delete (req 4.4) ───────────────────────────────────────
  const handleEdgeTap = useCallback(
    (edgeId: string) => {
      const edge = graph.edges.get(edgeId);
      if (!edge) return;
      setEditState({ type: 'edge', id: edgeId, label: edge.label, weight: String(edge.weight) });
    },
    [graph],
  );

  // ── Save edit (req 4.5) ───────────────────────────────────────────────────
  const handleSaveEdit = useCallback(() => {
    if (!editState) return;
    if (editState.type === 'node') {
      const newNodes = new Map(graph.nodes);
      const existing = newNodes.get(editState.id);
      if (existing) newNodes.set(editState.id, { ...existing, label: editState.label });
      onGraphChange({ ...graph, nodes: newNodes });
    } else {
      const newEdges = new Map(graph.edges);
      const existing = newEdges.get(editState.id);
      if (existing) {
        const w = parseFloat(editState.weight) || existing.weight;
        newEdges.set(editState.id, { ...existing, label: editState.label, weight: w });
      }
      onGraphChange({ ...graph, edges: newEdges });
    }
    setEditState(null);
  }, [editState, graph, onGraphChange]);

  const handleDeleteEdge = useCallback(() => {
    if (!editState || editState.type !== 'edge') return;
    const newEdges = new Map(graph.edges);
    newEdges.delete(editState.id);
    onGraphChange({ ...graph, edges: newEdges });
    setEditState(null);
  }, [editState, graph, onGraphChange]);

  // ── Render arrow marker ───────────────────────────────────────────────────
  const renderDefs = () => (
    <Defs>
      <Marker
        id="arrow"
        markerWidth="8"
        markerHeight="8"
        refX="6"
        refY="3"
        orient="auto"
      >
        <Path d="M0,0 L0,6 L8,3 z" fill={COLORS.edgeDefault} />
      </Marker>
      <Marker
        id="arrow-traversed"
        markerWidth="8"
        markerHeight="8"
        refX="6"
        refY="3"
        orient="auto"
      >
        <Path d="M0,0 L0,6 L8,3 z" fill={COLORS.traversed} />
      </Marker>
      <Marker
        id="arrow-active"
        markerWidth="8"
        markerHeight="8"
        refX="6"
        refY="3"
        orient="auto"
      >
        <Path d="M0,0 L0,6 L8,3 z" fill={COLORS.active} />
      </Marker>
    </Defs>
  );

  // ── Render edges ──────────────────────────────────────────────────────────
  const renderEdges = () =>
    Array.from(graph.edges.values()).map((edge) => {
      const src = graph.nodes.get(edge.sourceId);
      const tgt = graph.nodes.get(edge.targetId);
      if (!src || !tgt) return null;

      const dx = tgt.position.x - src.position.x;
      const dy = tgt.position.y - src.position.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const ux = dx / len;
      const uy = dy / len;

      const x1 = src.position.x + ux * NODE_RADIUS;
      const y1 = src.position.y + uy * NODE_RADIUS;
      const x2 = tgt.position.x - ux * (NODE_RADIUS + 8);
      const y2 = tgt.position.y - uy * (NODE_RADIUS + 8);

      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;

      const isTraversed = traversedEdgeIds.has(edge.id);
      const color = isTraversed ? COLORS.traversed : COLORS.edgeDefault;
      const markerId = isTraversed ? 'arrow-traversed' : 'arrow';

      return (
        <G key={edge.id} onPress={() => handleEdgeTap(edge.id)}>
          <Line
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={color}
            strokeWidth={isTraversed ? 2.5 : 1.5}
            markerEnd={`url(#${markerId})`}
          />
          {/* Invisible wider tap target for edge */}
          <Line
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="transparent"
            strokeWidth={20}
          />
          <SvgText
            x={midX} y={midY - 6}
            fill={color}
            fontSize="11"
            textAnchor="middle"
          >
            {edge.label}
          </SvgText>
        </G>
      );
    });

  // ── Render nodes ──────────────────────────────────────────────────────────
  const renderNodes = () =>
    Array.from(graph.nodes.values()).map((node) => {
      const color = nodeColor(node.id);
      const isSelected = node.id === selectedNodeId;
      const isAddEdgeSrc = node.id === addEdgeSource;
      const glowColor = color === COLORS.active ? COLORS.active : color === COLORS.traversed ? COLORS.traversed : 'transparent';

      return (
        <G key={node.id} onPress={() => handleNodeTap(node.id)}>
          {/* Glow ring (req 6.2) */}
          {(color !== COLORS.inactive || isSelected) && (
            <Circle
              cx={node.position.x}
              cy={node.position.y}
              r={NODE_RADIUS + 6}
              fill="none"
              stroke={isSelected ? '#ffff00' : isAddEdgeSrc ? COLORS.active : glowColor}
              strokeWidth={3}
              opacity={0.4}
            />
          )}
          {/* Node circle — minimum 44pt tap target via hitSlop handled by G */}
          <Circle
            cx={node.position.x}
            cy={node.position.y}
            r={NODE_RADIUS}
            fill={COLORS.nodeFill}
            stroke={color}
            strokeWidth={isSelected ? 2.5 : 1.5}
          />
          <SvgText
            x={node.position.x}
            y={node.position.y + 5}
            fill={color}
            fontSize="12"
            fontWeight="600"
            textAnchor="middle"
          >
            {node.label.length > 8 ? node.label.slice(0, 7) + '…' : node.label}
          </SvgText>
        </G>
      );
    });

  return (
    <View style={styles.container}>
      {/* Step counter (req 3.4) */}
      {currentStep != null && totalSteps != null && (
        <Text style={styles.stepCounter}>
          Step {currentStep.stepIndex + 1} / {totalSteps}
        </Text>
      )}

      {/* SVG Canvas */}
      <View style={[styles.canvas, { height: canvasHeight }]}>
        <Svg
          width={width}
          height={canvasHeight}
          onPress={handleCanvasTap}
          style={{ backgroundColor: COLORS.bg }}
        >
          {renderDefs()}
          {renderEdges()}
          {renderNodes()}
        </Svg>
      </View>

      {/* Node action bar */}
      {selectedNodeId && (
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => { setAddEdgeSource(selectedNodeId); setSelectedNodeId(null); }}>
            <Text style={styles.actionBtnText}>+ Edge</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleEditNode}>
            <Text style={styles.actionBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={handleDeleteNode}>
            <Text style={styles.actionBtnText}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setSelectedNodeId(null)}>
            <Text style={styles.actionBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {addEdgeSource && (
        <View style={styles.actionBar}>
          <Text style={styles.hintText}>Tap a target node to add edge</Text>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setAddEdgeSource(null)}>
            <Text style={styles.actionBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Edit modal (req 4.5) */}
      <Modal visible={editState !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {editState?.type === 'node' ? 'Edit Node' : 'Edit Edge'}
            </Text>
            <Text style={styles.modalLabel}>Label</Text>
            <TextInput
              style={styles.modalInput}
              value={editState?.label ?? ''}
              onChangeText={(v) => setEditState((s) => s ? { ...s, label: v } : s)}
              placeholderTextColor="#555"
              placeholder="Label"
            />
            {editState?.type === 'edge' && (
              <>
                <Text style={styles.modalLabel}>Weight</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editState?.weight ?? ''}
                  onChangeText={(v) => setEditState((s) => s ? { ...s, weight: v } : s)}
                  keyboardType="numeric"
                  placeholderTextColor="#555"
                  placeholder="Weight"
                />
              </>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtn} onPress={handleSaveEdit}>
                <Text style={styles.modalBtnText}>Save</Text>
              </TouchableOpacity>
              {editState?.type === 'edge' && (
                <TouchableOpacity style={[styles.modalBtn, styles.deleteBtn]} onPress={handleDeleteEdge}>
                  <Text style={styles.modalBtnText}>Delete</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.modalBtn} onPress={() => setEditState(null)}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  canvas: { width: '100%' },
  stepCounter: {
    color: COLORS.active,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 6,
    backgroundColor: '#0d0d0d',
  },
  actionBar: {
    flexDirection: 'row',
    backgroundColor: '#111',
    padding: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBtn: {
    backgroundColor: '#222',
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: { borderColor: '#ff4444' },
  actionBtnText: { color: COLORS.inactive, fontSize: 13 },
  hintText: { color: COLORS.active, fontSize: 13, flex: 1 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  modalTitle: { color: COLORS.inactive, fontSize: 18, fontWeight: '700', marginBottom: 16 },
  modalLabel: { color: '#888', fontSize: 13, marginBottom: 4 },
  modalInput: {
    backgroundColor: '#0a0a0a',
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 8,
    color: COLORS.inactive,
    padding: 12,
    marginBottom: 12,
    fontSize: 15,
  },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  modalBtn: {
    flex: 1,
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  modalBtnText: { color: COLORS.inactive, fontSize: 14 },
});
