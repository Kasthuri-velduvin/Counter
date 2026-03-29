/**
 * AppNavigator — Task 16.1
 * Main navigation shell wiring all screens together.
 * Uses a simple stack-style state machine (no external nav library needed
 * since expo-router is the project's router, but we keep this self-contained
 * for the spec's component boundary).
 *
 * Screens:
 *   input      → InputScreen
 *   visualizer → GraphCanvas + AlgorithmControls + InsightPanel
 *   history    → HistoryScreen
 *   comparison → ComparisonView
 *
 * Requirements: 1.3, 2.1, 3.2, 5.1, 7.1, 6.3
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { InputScreen } from './InputScreen';
import { GraphCanvas } from './GraphCanvas';
import { AlgorithmControls } from './AlgorithmControls';
import { InsightPanel } from './InsightPanel';
import { HistoryScreen } from './HistoryScreen';
import { ComparisonView } from './ComparisonView';
import type {
  Graph,
  AlgorithmStep,
  AlgorithmResult,
  Insight,
  AlgorithmType,
  SessionRecord,
} from '../types';

const COLORS = {
  bg: '#0a0a0a',
  active: '#00ff88',
  inactive: '#ffffff',
  surface: '#111111',
  border: '#222222',
};

type Screen = 'input' | 'visualizer' | 'history' | 'comparison';

export function AppNavigator() {
  const [screen, setScreen] = useState<Screen>('input');
  const [graph, setGraph] = useState<Graph>({ nodes: new Map(), edges: new Map() });
  const [currentStep, setCurrentStep] = useState<AlgorithmStep | null>(null);
  const [totalSteps, setTotalSteps] = useState(0);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [algorithmResult, setAlgorithmResult] = useState<AlgorithmResult | null>(null);
  const [algorithm, setAlgorithm] = useState<AlgorithmType>('dijkstra');
  const [sourceNodeId, setSourceNodeId] = useState<string>('');
  const [compareA, setCompareA] = useState<SessionRecord | null>(null);
  const [compareB, setCompareB] = useState<SessionRecord | null>(null);

  // Screen transition animation (req 6.3: 200–400ms)
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const navigateTo = useCallback(
    (target: Screen) => {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      setScreen(target);
    },
    [fadeAnim],
  );

  // ── Input → Visualizer handoff (req 1.3, 2.1) ────────────────────────────
  const handleGraphReady = useCallback(
    (g: Graph) => {
      setGraph(g);
      setCurrentStep(null);
      setTotalSteps(0);
      setInsights([]);
      setAlgorithmResult(null);
      navigateTo('visualizer');
    },
    [navigateTo],
  );

  // ── Graph mutation from canvas ────────────────────────────────────────────
  const handleGraphChange = useCallback((g: Graph) => {
    setGraph(g);
    // Reset algorithm state when graph changes
    setCurrentStep(null);
    setTotalSteps(0);
    setInsights([]);
    setAlgorithmResult(null);
  }, []);

  // ── History restore ───────────────────────────────────────────────────────
  const handleRestore = useCallback(
    (g: Graph, record: SessionRecord) => {
      setGraph(g);
      setAlgorithm(record.algorithm);
      setSourceNodeId(record.sourceNodeId);
      setInsights(record.insights);
      setCurrentStep(null);
      setTotalSteps(0);
      setAlgorithmResult(null);
      navigateTo('visualizer');
    },
    [navigateTo],
  );

  // ── Comparison ────────────────────────────────────────────────────────────
  const handleCompare = useCallback(
    (a: SessionRecord, b: SessionRecord) => {
      setCompareA(a);
      setCompareB(b);
      navigateTo('comparison');
    },
    [navigateTo],
  );

  // ── Render current screen ─────────────────────────────────────────────────
  const renderScreen = () => {
    switch (screen) {
      case 'input':
        return <InputScreen onGraphReady={handleGraphReady} />;

      case 'visualizer':
        return (
          <View style={styles.visualizerContainer}>
            <GraphCanvas
              graph={graph}
              onGraphChange={handleGraphChange}
              currentStep={currentStep}
              totalSteps={totalSteps}
            />
            <AlgorithmControls
              graph={graph}
              onStepChange={setCurrentStep}
              onTotalStepsChange={setTotalSteps}
              onInsightsReady={setInsights}
              onAlgorithmResult={setAlgorithmResult}
            />
            {insights.length > 0 && <InsightPanel insights={insights} />}
          </View>
        );

      case 'history':
        return (
          <HistoryScreen
            currentGraph={graph}
            currentAlgorithm={algorithm}
            currentSourceNodeId={sourceNodeId}
            currentResult={algorithmResult ?? undefined}
            currentInsights={insights}
            onRestore={handleRestore}
            onCompare={handleCompare}
          />
        );

      case 'comparison':
        return compareA && compareB ? (
          <ComparisonView
            sessionA={compareA}
            sessionB={compareB}
            onClose={() => navigateTo('history')}
          />
        ) : null;

      default:
        return null;
    }
  };

  // ── Tab bar ───────────────────────────────────────────────────────────────
  const tabs: Array<{ key: Screen; label: string; icon: string }> = [
    { key: 'input', label: 'Input', icon: '✏️' },
    { key: 'visualizer', label: 'Graph', icon: '🔮' },
    { key: 'history', label: 'History', icon: '📚' },
  ];

  return (
    <SafeAreaView style={styles.root}>
      <Animated.View style={[styles.screenContainer, { opacity: fadeAnim }]}>
        {renderScreen()}
      </Animated.View>

      {/* Tab bar — hidden on comparison screen */}
      {screen !== 'comparison' && (
        <View style={styles.tabBar}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, screen === tab.key && styles.tabActive]}
              onPress={() => navigateTo(tab.key)}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, screen === tab.key && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  screenContainer: { flex: 1 },
  visualizerContainer: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    paddingBottom: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    minHeight: 56,
    justifyContent: 'center',
  },
  tabActive: { borderTopColor: COLORS.active, borderTopWidth: 2 },
  tabIcon: { fontSize: 18, marginBottom: 2 },
  tabLabel: { color: '#555', fontSize: 11 },
  tabLabelActive: { color: COLORS.active },
});
