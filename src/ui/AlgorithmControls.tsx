/**
 * AlgorithmControls — Task 14.1
 * Algorithm picker (Dijkstra/DFS), source-node selector,
 * and playback controls wired to PlaybackController.
 * Requirements: 3.1, 3.6, 6.3
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { createPlaybackController } from '../playback/playbackController';
import { AlgorithmEngine } from '../algorithm/algorithmEngine';
import { InsightEngine } from '../insight/insightEngine';
import type { Graph, AlgorithmType, AlgorithmResult, AlgorithmStep, Insight } from '../types';

const COLORS = {
  bg: '#0a0a0a',
  active: '#00ff88',
  traversed: '#ff6b35',
  inactive: '#ffffff',
  surface: '#1a1a1a',
  border: '#333333',
  error: '#ff4444',
};

interface AlgorithmControlsProps {
  graph: Graph;
  onStepChange: (step: AlgorithmStep | null) => void;
  onTotalStepsChange: (total: number) => void;
  onInsightsReady: (insights: Insight[]) => void;
  onAlgorithmResult?: (result: AlgorithmResult) => void;
}

export function AlgorithmControls({
  graph,
  onStepChange,
  onTotalStepsChange,
  onInsightsReady,
  onAlgorithmResult,
}: AlgorithmControlsProps) {
  const [algorithm, setAlgorithm] = useState<AlgorithmType>('dijkstra');
  const [sourceNodeId, setSourceNodeId] = useState<string | null>(null);
  const [result, setResult] = useState<AlgorithmResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playState, setPlayState] = useState<'idle' | 'playing' | 'paused' | 'completed'>('idle');
  const [currentStep, setCurrentStep] = useState(0);
  const controllerRef = useRef<ReturnType<typeof createPlaybackController> | null>(null);

  // Fade animation for screen transitions (req 6.3)
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateTransition = useCallback((cb: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    cb();
  }, [fadeAnim]);

  // Auto-select first node as source when graph changes
  useEffect(() => {
    const firstId = graph.nodes.keys().next().value;
    if (firstId && !sourceNodeId) setSourceNodeId(firstId);
    // Reset if source node was removed
    if (sourceNodeId && !graph.nodes.has(sourceNodeId)) {
      setSourceNodeId(firstId ?? null);
    }
  }, [graph]);

  const handleRun = useCallback(() => {
    if (!sourceNodeId) {
      setError('Please select a source node.');
      return;
    }
    setError(null);
    try {
      const res = AlgorithmEngine.run(graph, algorithm, sourceNodeId);
      setResult(res);
      onAlgorithmResult?.(res);

      const steps = res.steps;
      if (steps.length === 0) {
        setError('Algorithm produced no steps.');
        return;
      }

      // Build playback controller
      const ctrl = createPlaybackController(steps.length, (stepIdx) => {
        setCurrentStep(stepIdx);
        onStepChange(steps[stepIdx] ?? null);
        setPlayState(ctrl.state);
      });
      controllerRef.current = ctrl;
      onTotalStepsChange(steps.length);
      onStepChange(steps[0]);
      setCurrentStep(0);
      setPlayState('idle');

      // Generate insights on completion
      const insights = InsightEngine.analyse(graph, res);
      onInsightsReady(insights);
    } catch (err: any) {
      setError(err?.message ?? 'Algorithm failed.');
    }
  }, [graph, algorithm, sourceNodeId, onStepChange, onTotalStepsChange, onInsightsReady, onAlgorithmResult]);

  const ctrl = controllerRef.current;

  const handlePlay = useCallback(() => {
    ctrl?.play();
    setPlayState(ctrl?.state ?? 'playing');
  }, [ctrl]);

  const handlePause = useCallback(() => {
    ctrl?.pause();
    setPlayState(ctrl?.state ?? 'paused');
  }, [ctrl]);

  const handleStepForward = useCallback(() => {
    if (!ctrl || !result) return;
    ctrl.stepForward();
    const idx = ctrl.currentStep;
    setCurrentStep(idx);
    onStepChange(result.steps[idx] ?? null);
    setPlayState(ctrl.state);
  }, [ctrl, result, onStepChange]);

  const handleStepBackward = useCallback(() => {
    if (!ctrl || !result) return;
    ctrl.stepBackward();
    const idx = ctrl.currentStep;
    setCurrentStep(idx);
    onStepChange(result.steps[idx] ?? null);
    setPlayState(ctrl.state);
  }, [ctrl, result, onStepChange]);

  const handleRestart = useCallback(() => {
    if (!ctrl || !result) return;
    ctrl.restart();
    setCurrentStep(0);
    onStepChange(result.steps[0] ?? null);
    setPlayState('idle');
  }, [ctrl, result, onStepChange]);

  const nodes = Array.from(graph.nodes.values());

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Algorithm picker (req 3.1) */}
      <View style={styles.row}>
        <Text style={styles.label}>Algorithm</Text>
        <View style={styles.pickerRow}>
          {(['dijkstra', 'dfs'] as AlgorithmType[]).map((alg) => (
            <TouchableOpacity
              key={alg}
              style={[styles.chip, algorithm === alg && styles.chipActive]}
              onPress={() => animateTransition(() => setAlgorithm(alg))}
              accessibilityRole="button"
              accessibilityLabel={`Select ${alg}`}
            >
              <Text style={[styles.chipText, algorithm === alg && styles.chipTextActive]}>
                {alg === 'dijkstra' ? 'Dijkstra' : 'DFS'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Source node selector */}
      <View style={styles.row}>
        <Text style={styles.label}>Source Node</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.pickerRow}>
            {nodes.map((node) => (
              <TouchableOpacity
                key={node.id}
                style={[styles.chip, sourceNodeId === node.id && styles.chipActive]}
                onPress={() => setSourceNodeId(node.id)}
                accessibilityRole="button"
                accessibilityLabel={`Select source node ${node.label}`}
              >
                <Text style={[styles.chipText, sourceNodeId === node.id && styles.chipTextActive]}>
                  {node.label.length > 10 ? node.label.slice(0, 9) + '…' : node.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Run button */}
      <TouchableOpacity style={styles.runBtn} onPress={handleRun} accessibilityRole="button" accessibilityLabel="Run algorithm">
        <Text style={styles.runBtnText}>▶ Run</Text>
      </TouchableOpacity>

      {/* Playback controls (req 3.6) */}
      {result && (
        <View style={styles.playbackRow}>
          <TouchableOpacity style={styles.pbBtn} onPress={handleRestart} accessibilityLabel="Restart">
            <Text style={styles.pbBtnText}>⏮</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pbBtn} onPress={handleStepBackward} accessibilityLabel="Step backward">
            <Text style={styles.pbBtnText}>⏪</Text>
          </TouchableOpacity>
          {playState === 'playing' ? (
            <TouchableOpacity style={styles.pbBtn} onPress={handlePause} accessibilityLabel="Pause">
              <Text style={styles.pbBtnText}>⏸</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.pbBtn} onPress={handlePlay} accessibilityLabel="Play">
              <Text style={styles.pbBtnText}>▶</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.pbBtn} onPress={handleStepForward} accessibilityLabel="Step forward">
            <Text style={styles.pbBtnText}>⏩</Text>
          </TouchableOpacity>
          <Text style={styles.stepLabel}>
            {result.steps.length > 0 ? `${currentStep + 1}/${result.steps.length}` : ''}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.surface, padding: 12, borderTopColor: COLORS.border, borderTopWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  label: { color: '#888', fontSize: 13, width: 90 },
  pickerRow: { flexDirection: 'row', gap: 8 },
  chip: {
    backgroundColor: '#222',
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: { borderColor: COLORS.active, backgroundColor: '#001a0d' },
  chipText: { color: '#888', fontSize: 13 },
  chipTextActive: { color: COLORS.active },
  errorText: { color: COLORS.error, fontSize: 13, marginBottom: 8 },
  runBtn: {
    backgroundColor: COLORS.active,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
    minHeight: 44,
  },
  runBtnText: { color: COLORS.bg, fontWeight: '700', fontSize: 15 },
  playbackRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pbBtn: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 10,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pbBtnText: { color: COLORS.inactive, fontSize: 18 },
  stepLabel: { color: COLORS.active, fontSize: 13, marginLeft: 8 },
});
