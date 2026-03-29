import { InsightEngine } from '../insightEngine';
import type { Graph, AlgorithmResult, Node, Edge } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeGraph(
  nodes: Array<{ id: string; label: string }>,
  edges: Array<{ id: string; sourceId: string; targetId: string; weight?: number }>,
): Graph {
  const nodeMap = new Map<string, Node>();
  for (const n of nodes) {
    nodeMap.set(n.id, { id: n.id, label: n.label, position: { x: 0, y: 0 } });
  }
  const edgeMap = new Map<string, Edge>();
  for (const e of edges) {
    const w = e.weight ?? 1;
    edgeMap.set(e.id, {
      id: e.id,
      sourceId: e.sourceId,
      targetId: e.targetId,
      weight: w,
      label: w.toString(),
    });
  }
  return { nodes: nodeMap, edges: edgeMap };
}

function makeDijkstraResult(
  visitOrder: string[],
  distanceMap: Record<string, number>,
  shortestPaths: Map<string, string[]>,
): AlgorithmResult {
  const steps = visitOrder.map((nodeId, i) => ({
    stepIndex: i,
    activeNodeId: nodeId,
    visitedNodeIds: visitOrder.slice(0, i + 1),
    traversedEdgeIds: [],
    distanceMap,
  }));
  return { algorithm: 'dijkstra', steps, shortestPaths };
}

function makeDFSResult(visitOrder: string[]): AlgorithmResult {
  const steps = visitOrder.map((nodeId, i) => ({
    stepIndex: i,
    activeNodeId: nodeId,
    visitedNodeIds: visitOrder.slice(0, i + 1),
    traversedEdgeIds: [],
  }));
  return { algorithm: 'dfs', steps, visitOrder };
}

// ─── Always ≥ 1 insight ───────────────────────────────────────────────────────

describe('InsightEngine — always ≥ 1 insight', () => {
  it('returns at least one insight for a minimal Dijkstra result', () => {
    const graph = makeGraph(
      [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      [{ id: 'e1', sourceId: 'a', targetId: 'b', weight: 1 }],
    );
    const result = makeDijkstraResult(
      ['a', 'b'],
      { a: 0, b: 1 },
      new Map([['a', ['a']], ['b', ['a', 'b']]]),
    );
    const insights = InsightEngine.analyse(graph, result);
    expect(insights.length).toBeGreaterThanOrEqual(1);
  });

  it('returns at least one insight for a minimal DFS result on acyclic graph', () => {
    const graph = makeGraph(
      [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      [{ id: 'e1', sourceId: 'a', targetId: 'b' }],
    );
    const result = makeDFSResult(['a', 'b']);
    const insights = InsightEngine.analyse(graph, result);
    expect(insights.length).toBeGreaterThanOrEqual(1);
  });

  it('returns a general fallback insight when DFS on acyclic graph with no isolated nodes', () => {
    const graph = makeGraph(
      [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      [{ id: 'e1', sourceId: 'a', targetId: 'b' }],
    );
    const result = makeDFSResult(['a', 'b']);
    const insights = InsightEngine.analyse(graph, result);
    expect(insights.some(i => i.type === 'general')).toBe(true);
  });
});

// ─── Dijkstra → critical_path ─────────────────────────────────────────────────

describe('InsightEngine — critical_path for Dijkstra', () => {
  it('emits a critical_path insight for a Dijkstra result', () => {
    const graph = makeGraph(
      [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
      [
        { id: 'e1', sourceId: 'a', targetId: 'b', weight: 1 },
        { id: 'e2', sourceId: 'b', targetId: 'c', weight: 2 },
      ],
    );
    const result = makeDijkstraResult(
      ['a', 'b', 'c'],
      { a: 0, b: 1, c: 3 },
      new Map([['a', ['a']], ['b', ['a', 'b']], ['c', ['a', 'b', 'c']]]),
    );
    const insights = InsightEngine.analyse(graph, result);
    const criticalPath = insights.find(i => i.type === 'critical_path');
    expect(criticalPath).toBeDefined();
    expect(criticalPath!.affectedNodeIds).toEqual(['a', 'b', 'c']);
  });

  it('critical_path affectedNodeIds reflects the highest-cost path', () => {
    // A→B (cost 10), A→C (cost 1) — critical path should be to B
    const graph = makeGraph(
      [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
      [
        { id: 'e1', sourceId: 'a', targetId: 'b', weight: 10 },
        { id: 'e2', sourceId: 'a', targetId: 'c', weight: 1 },
      ],
    );
    const result = makeDijkstraResult(
      ['a', 'c', 'b'],
      { a: 0, b: 10, c: 1 },
      new Map([['a', ['a']], ['b', ['a', 'b']], ['c', ['a', 'c']]]),
    );
    const insights = InsightEngine.analyse(graph, result);
    const criticalPath = insights.find(i => i.type === 'critical_path');
    expect(criticalPath).toBeDefined();
    expect(criticalPath!.affectedNodeIds).toEqual(['a', 'b']);
  });

  it('does NOT emit cycle_detected for a Dijkstra result', () => {
    const graph = makeGraph(
      [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      [{ id: 'e1', sourceId: 'a', targetId: 'b', weight: 1 }],
    );
    const result = makeDijkstraResult(
      ['a', 'b'],
      { a: 0, b: 1 },
      new Map([['a', ['a']], ['b', ['a', 'b']]]),
    );
    const insights = InsightEngine.analyse(graph, result);
    expect(insights.some(i => i.type === 'cycle_detected')).toBe(false);
  });
});

// ─── DFS → cycle_detected ─────────────────────────────────────────────────────

describe('InsightEngine — cycle_detected for DFS', () => {
  it('emits cycle_detected when the graph has a cycle', () => {
    // A→B→C→A
    const graph = makeGraph(
      [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
      [
        { id: 'e1', sourceId: 'a', targetId: 'b' },
        { id: 'e2', sourceId: 'b', targetId: 'c' },
        { id: 'e3', sourceId: 'c', targetId: 'a' },
      ],
    );
    const result = makeDFSResult(['a', 'b', 'c']);
    const insights = InsightEngine.analyse(graph, result);
    expect(insights.some(i => i.type === 'cycle_detected')).toBe(true);
  });

  it('does NOT emit cycle_detected for an acyclic graph', () => {
    // A→B→C (no cycle)
    const graph = makeGraph(
      [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
      [
        { id: 'e1', sourceId: 'a', targetId: 'b' },
        { id: 'e2', sourceId: 'b', targetId: 'c' },
      ],
    );
    const result = makeDFSResult(['a', 'b', 'c']);
    const insights = InsightEngine.analyse(graph, result);
    expect(insights.some(i => i.type === 'cycle_detected')).toBe(false);
  });

  it('detects a self-loop as a cycle', () => {
    const graph = makeGraph(
      [{ id: 'a', label: 'A' }],
      [{ id: 'e1', sourceId: 'a', targetId: 'a' }],
    );
    const result = makeDFSResult(['a']);
    const insights = InsightEngine.analyse(graph, result);
    expect(insights.some(i => i.type === 'cycle_detected')).toBe(true);
  });
});

// ─── Isolated nodes ───────────────────────────────────────────────────────────

describe('InsightEngine — isolated_node', () => {
  it('emits isolated_node insight for a degree-0 node', () => {
    // A→B, C is isolated
    const graph = makeGraph(
      [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
      [{ id: 'e1', sourceId: 'a', targetId: 'b' }],
    );
    const result = makeDFSResult(['a', 'b']);
    const insights = InsightEngine.analyse(graph, result);
    const isolatedInsights = insights.filter(i => i.type === 'isolated_node');
    expect(isolatedInsights).toHaveLength(1);
    expect(isolatedInsights[0].affectedNodeIds).toContain('c');
  });

  it('emits one isolated_node insight per isolated node', () => {
    // A is connected; B and C are isolated
    const graph = makeGraph(
      [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
      [],
    );
    const result = makeDFSResult(['a']);
    const insights = InsightEngine.analyse(graph, result);
    const isolatedInsights = insights.filter(i => i.type === 'isolated_node');
    expect(isolatedInsights).toHaveLength(3);
    const affectedIds = isolatedInsights.flatMap(i => i.affectedNodeIds ?? []);
    expect(affectedIds).toContain('a');
    expect(affectedIds).toContain('b');
    expect(affectedIds).toContain('c');
  });

  it('does NOT emit isolated_node when all nodes have edges', () => {
    const graph = makeGraph(
      [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      [{ id: 'e1', sourceId: 'a', targetId: 'b' }],
    );
    const result = makeDFSResult(['a', 'b']);
    const insights = InsightEngine.analyse(graph, result);
    expect(insights.some(i => i.type === 'isolated_node')).toBe(false);
  });

  it('emits isolated_node alongside critical_path for Dijkstra with isolated nodes', () => {
    const graph = makeGraph(
      [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'iso', label: 'Isolated' }],
      [{ id: 'e1', sourceId: 'a', targetId: 'b', weight: 5 }],
    );
    const result = makeDijkstraResult(
      ['a', 'b'],
      { a: 0, b: 5, iso: Infinity },
      new Map([['a', ['a']], ['b', ['a', 'b']], ['iso', []]]),
    );
    const insights = InsightEngine.analyse(graph, result);
    expect(insights.some(i => i.type === 'critical_path')).toBe(true);
    expect(insights.some(i => i.type === 'isolated_node')).toBe(true);
  });
});
