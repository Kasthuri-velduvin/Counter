import { AlgorithmEngine } from '../algorithmEngine';
import { AlgorithmError } from '../../types/errors';
import type { Graph, Node, Edge } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeGraph(
  nodes: Array<{ id: string; label: string }>,
  edges: Array<{ id: string; sourceId: string; targetId: string; weight: number }>,
): Graph {
  const nodeMap = new Map<string, Node>();
  for (const n of nodes) {
    nodeMap.set(n.id, { id: n.id, label: n.label, position: { x: 0, y: 0 } });
  }
  const edgeMap = new Map<string, Edge>();
  for (const e of edges) {
    edgeMap.set(e.id, {
      id: e.id,
      sourceId: e.sourceId,
      targetId: e.targetId,
      weight: e.weight,
      label: e.weight.toString(),
    });
  }
  return { nodes: nodeMap, edges: edgeMap };
}

// ─── Dijkstra unit tests ──────────────────────────────────────────────────────

describe('AlgorithmEngine — Dijkstra', () => {
  it('throws AlgorithmError when sourceNodeId is not in the graph', () => {
    const graph = makeGraph(
      [{ id: 'a', label: 'A' }],
      [],
    );
    expect(() => AlgorithmEngine.run(graph, 'dijkstra', 'missing')).toThrow(AlgorithmError);
  });

  it('produces a single step for a single-node graph', () => {
    const graph = makeGraph([{ id: 'a', label: 'A' }], []);
    const result = AlgorithmEngine.run(graph, 'dijkstra', 'a');
    expect(result.algorithm).toBe('dijkstra');
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].stepIndex).toBe(0);
    expect(result.steps[0].activeNodeId).toBe('a');
  });

  it('computes correct distances on a simple linear graph A→B→C', () => {
    // A -1-> B -2-> C
    const graph = makeGraph(
      [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
      [
        { id: 'e1', sourceId: 'a', targetId: 'b', weight: 1 },
        { id: 'e2', sourceId: 'b', targetId: 'c', weight: 2 },
      ],
    );
    const result = AlgorithmEngine.run(graph, 'dijkstra', 'a');
    expect(result.steps.length).toBeGreaterThan(0);
    // stepIndex values must be contiguous starting at 0
    result.steps.forEach((s, i) => expect(s.stepIndex).toBe(i));

    // Final distanceMap in last step
    const lastStep = result.steps[result.steps.length - 1];
    expect(lastStep.distanceMap!['a']).toBe(0);
    expect(lastStep.distanceMap!['b']).toBe(1);
    expect(lastStep.distanceMap!['c']).toBe(3);
  });

  it('picks the shorter path when two routes exist', () => {
    // A -10-> B, A -1-> C -1-> B
    const graph = makeGraph(
      [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
      [
        { id: 'e1', sourceId: 'a', targetId: 'b', weight: 10 },
        { id: 'e2', sourceId: 'a', targetId: 'c', weight: 1 },
        { id: 'e3', sourceId: 'c', targetId: 'b', weight: 1 },
      ],
    );
    const result = AlgorithmEngine.run(graph, 'dijkstra', 'a');
    const lastStep = result.steps[result.steps.length - 1];
    expect(lastStep.distanceMap!['b']).toBe(2); // via C
    expect(result.shortestPaths!.get('b')).toEqual(['a', 'c', 'b']);
  });

  it('marks unreachable nodes with Infinity in distanceMap', () => {
    // A→B, C is isolated
    const graph = makeGraph(
      [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
      [{ id: 'e1', sourceId: 'a', targetId: 'b', weight: 1 }],
    );
    const result = AlgorithmEngine.run(graph, 'dijkstra', 'a');
    const lastStep = result.steps[result.steps.length - 1];
    expect(lastStep.distanceMap!['c']).toBe(Infinity);
    expect(result.shortestPaths!.get('c')).toEqual([]);
  });

  it('shortestPaths contains source→source as [sourceId]', () => {
    const graph = makeGraph(
      [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      [{ id: 'e1', sourceId: 'a', targetId: 'b', weight: 5 }],
    );
    const result = AlgorithmEngine.run(graph, 'dijkstra', 'a');
    expect(result.shortestPaths!.get('a')).toEqual(['a']);
  });
});

// ─── DFS unit tests ───────────────────────────────────────────────────────────

describe('AlgorithmEngine — DFS', () => {
  it('throws AlgorithmError when sourceNodeId is not in the graph', () => {
    const graph = makeGraph([{ id: 'a', label: 'A' }], []);
    expect(() => AlgorithmEngine.run(graph, 'dfs', 'missing')).toThrow(AlgorithmError);
  });

  it('produces a single step for a single-node graph', () => {
    const graph = makeGraph([{ id: 'a', label: 'A' }], []);
    const result = AlgorithmEngine.run(graph, 'dfs', 'a');
    expect(result.algorithm).toBe('dfs');
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].stepIndex).toBe(0);
    expect(result.visitOrder).toEqual(['a']);
  });

  it('visits all reachable nodes in a linear graph A→B→C', () => {
    const graph = makeGraph(
      [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
      [
        { id: 'e1', sourceId: 'a', targetId: 'b', weight: 1 },
        { id: 'e2', sourceId: 'b', targetId: 'c', weight: 1 },
      ],
    );
    const result = AlgorithmEngine.run(graph, 'dfs', 'a');
    expect(result.visitOrder).toEqual(['a', 'b', 'c']);
    result.steps.forEach((s, i) => expect(s.stepIndex).toBe(i));
  });

  it('does not visit unreachable nodes', () => {
    // A→B, C is isolated
    const graph = makeGraph(
      [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
      [{ id: 'e1', sourceId: 'a', targetId: 'b', weight: 1 }],
    );
    const result = AlgorithmEngine.run(graph, 'dfs', 'a');
    expect(result.visitOrder).toEqual(['a', 'b']);
    expect(result.visitOrder).not.toContain('c');
  });

  it('handles cycles without infinite loops', () => {
    // A→B→C→A (cycle)
    const graph = makeGraph(
      [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
      [
        { id: 'e1', sourceId: 'a', targetId: 'b', weight: 1 },
        { id: 'e2', sourceId: 'b', targetId: 'c', weight: 1 },
        { id: 'e3', sourceId: 'c', targetId: 'a', weight: 1 },
      ],
    );
    const result = AlgorithmEngine.run(graph, 'dfs', 'a');
    // Each node visited exactly once
    expect(result.visitOrder).toHaveLength(3);
    expect(new Set(result.visitOrder).size).toBe(3);
  });

  it('stepIndex values are contiguous starting at 0', () => {
    const graph = makeGraph(
      [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
      [
        { id: 'e1', sourceId: 'a', targetId: 'b', weight: 1 },
        { id: 'e2', sourceId: 'a', targetId: 'c', weight: 1 },
      ],
    );
    const result = AlgorithmEngine.run(graph, 'dfs', 'a');
    result.steps.forEach((s, i) => expect(s.stepIndex).toBe(i));
  });
});

// ─── General ──────────────────────────────────────────────────────────────────

describe('AlgorithmEngine — general', () => {
  it('throws AlgorithmError for unknown algorithm type', () => {
    const graph = makeGraph([{ id: 'a', label: 'A' }], []);
    expect(() =>
      AlgorithmEngine.run(graph, 'unknown' as any, 'a'),
    ).toThrow(AlgorithmError);
  });
});
